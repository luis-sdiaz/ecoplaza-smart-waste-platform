import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Camera,
  Check,
  Copy,
  IdCard,
  ImagePlus,
  Info,
  Leaf,
  Palette,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import {
  isValidProfileName,
  normalizeProfileName,
} from "../auth/profileStorage";
import {
  prepareCoverImage,
  prepareProfileImage,
  ProfileImageError,
} from "../auth/profileImage";
import defaultCoverUrl from "../assets/profile/default-cover-ecoplaza.png";
import SuccessToast from "../components/SuccessToast";
import "./ProfilePage.css";

type CoverPaletteId =
  "pasto-sunset" | "eco-emerald" | "cyber-ocean" | "obsidian-tech";

type CoverMode = "default" | "palette" | "custom";

interface CoverPalette {
  id: CoverPaletteId;
  nameKey: string;
  defaultName: string;
  previewColor: string;
  gradientClass: string;
}

const COVER_PALETTES: readonly CoverPalette[] = [
  {
    id: "pasto-sunset",
    nameKey: "profile.palettePastoSunset",
    defaultName: "Pasto Sunset",
    previewColor: "linear-gradient(135deg, #3730a3, #1e40af, #065f46)",
    gradientClass: "profile-cover--pasto-sunset",
  },
  {
    id: "eco-emerald",
    nameKey: "profile.paletteEcoEmerald",
    defaultName: "Eco Emerald",
    previewColor: "linear-gradient(135deg, #064e3b, #047857, #0f766e)",
    gradientClass: "profile-cover--eco-emerald",
  },
  {
    id: "cyber-ocean",
    nameKey: "profile.paletteCyberOcean",
    defaultName: "Cyber Ocean",
    previewColor: "linear-gradient(135deg, #083344, #0369a1, #1e3a8a)",
    gradientClass: "profile-cover--cyber-ocean",
  },
  {
    id: "obsidian-tech",
    nameKey: "profile.paletteObsidianTech",
    defaultName: "Obsidian Tech",
    previewColor: "linear-gradient(135deg, #090d16, #1e293b, #064e3b)",
    gradientClass: "profile-cover--obsidian-tech",
  },
];

const DEFAULT_COVER_PALETTE: CoverPaletteId = "pasto-sunset";
const COVER_MODE_STORAGE_KEY = "ecoplaza_cover_mode";
const COVER_PALETTE_STORAGE_KEY = "ecoplaza_cover_palette";
const CUSTOM_COVER_STORAGE_KEY = "ecoplaza_custom_cover";

type AvatarFeedback = {
  tone: "error" | "success";
  key:
    | "profile.avatarUnsupportedFormat"
    | "profile.avatarTooLarge"
    | "profile.avatarProcessingError"
    | "profile.avatarUpdated"
    | "profile.avatarRemoved";
};

type ProfileNotificationOperation =
  | "nameUpdated"
  | "avatarUpdated"
  | "avatarRemoved"
  | "customCoverUpdated"
  | "customCoverRemoved"
  | "nameSaveError"
  | "avatarSaveError"
  | "avatarRemoveError"
  | "coverSaveError"
  | "coverTooLargeError"
  | "coverUnsupportedError";

type ProfileNotification = {
  id: number;
  operation: ProfileNotificationOperation;
};

const profileNotificationCopy = {
  nameUpdated: {
    title: "profile.nameUpdatedToastTitle",
    description: "profile.nameUpdatedToastDescription",
    variant: "success",
  },
  avatarUpdated: {
    title: "profile.avatarUpdatedToastTitle",
    description: "profile.avatarUpdatedToastDescription",
    variant: "success",
  },
  avatarRemoved: {
    title: "profile.avatarRemovedToastTitle",
    description: "profile.avatarRemovedToastDescription",
    variant: "success",
  },
  customCoverUpdated: {
    title: "profile.customCoverUpdatedToastTitle",
    description: "profile.customCoverUpdatedToastDescription",
    variant: "success",
  },
  customCoverRemoved: {
    title: "profile.customCoverRemovedToastTitle",
    description: "profile.customCoverRemovedToastDescription",
    variant: "success",
  },
  nameSaveError: {
    title: "profile.nameSaveErrorToastTitle",
    description: "profile.nameSaveError",
    variant: "error",
  },
  avatarSaveError: {
    title: "profile.avatarSaveErrorToastTitle",
    description: "profile.avatarSaveError",
    variant: "error",
  },
  avatarRemoveError: {
    title: "profile.avatarRemoveErrorToastTitle",
    description: "profile.avatarRemoveError",
    variant: "error",
  },
  coverSaveError: {
    title: "profile.avatarSaveErrorToastTitle",
    description: "profile.avatarProcessingError",
    variant: "error",
  },
  coverTooLargeError: {
    title: "profile.avatarSaveErrorToastTitle",
    description: "profile.avatarTooLarge",
    variant: "error",
  },
  coverUnsupportedError: {
    title: "profile.avatarSaveErrorToastTitle",
    description: "profile.avatarUnsupportedFormat",
    variant: "error",
  },
  profileLoadError: {
    title: "profile.loadErrorTitle",
    description: "profile.loadErrorDescription",
    variant: "error",
  },
} as const;

function ProfilePageContent() {
  const { t } = useTranslation();
  const {
    user,
    profileError,
    updateUserName,
    updateUserAvatar,
    removeUserAvatar,
  } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [isNameBusy, setIsNameBusy] = useState(false);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [isCoverBusy, setIsCoverBusy] = useState(false);

  const [coverMode, setCoverMode] = useState<CoverMode>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return "default";
    }
    try {
      const savedMode = window.localStorage.getItem(COVER_MODE_STORAGE_KEY);
      if (
        savedMode === "custom" &&
        window.localStorage.getItem(CUSTOM_COVER_STORAGE_KEY)
      ) {
        return "custom";
      }
      if (savedMode === "palette") {
        return "palette";
      }
      if (savedMode === "default") {
        return "default";
      }
      const legacyPalette = window.localStorage.getItem(COVER_PALETTE_STORAGE_KEY);
      if (
        legacyPalette === "pasto-sunset" ||
        legacyPalette === "eco-emerald" ||
        legacyPalette === "cyber-ocean" ||
        legacyPalette === "obsidian-tech"
      ) {
        return "palette";
      }
    } catch {
      // Fallback ante fallo de almacenamiento
    }
    return "default";
  });

  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(() => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(CUSTOM_COVER_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [coverPalette, setCoverPalette] = useState<CoverPaletteId>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_COVER_PALETTE;
    }
    try {
      const saved = window.localStorage.getItem(COVER_PALETTE_STORAGE_KEY);
      if (
        saved === "pasto-sunset" ||
        saved === "eco-emerald" ||
        saved === "cyber-ocean" ||
        saved === "obsidian-tech"
      ) {
        return saved;
      }
    } catch {
      // Fallback ante fallo de almacenamiento
    }
    return DEFAULT_COVER_PALETTE;
  });

  const handleSelectDefaultCover = (): void => {
    setCoverMode("default");
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(COVER_MODE_STORAGE_KEY, "default");
      }
    } catch {
      // Fallback
    }
  };

  const handleSelectCoverPalette = (paletteId: CoverPaletteId): void => {
    setCoverPalette(paletteId);
    setCoverMode("palette");
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(COVER_MODE_STORAGE_KEY, "palette");
        window.localStorage.setItem(COVER_PALETTE_STORAGE_KEY, paletteId);
      }
    } catch {
      // Fallback
    }
  };

  const handleSelectCustomCover = (): void => {
    if (!customCoverUrl) return;
    setCoverMode("custom");
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(COVER_MODE_STORAGE_KEY, "custom");
      }
    } catch {
      // Fallback
    }
  };

  const handleCoverSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setNotification(null);
    setIsCoverBusy(true);

    try {
      const preparedCover = await prepareCoverImage(file);

      if (!isMountedRef.current) return;

      setCustomCoverUrl(preparedCover);
      setCoverMode("custom");

      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(COVER_MODE_STORAGE_KEY, "custom");
          window.localStorage.setItem(CUSTOM_COVER_STORAGE_KEY, preparedCover);
        }
      } catch {
        // Fallback
      }

      showNotification("customCoverUpdated");
    } catch (error) {
      if (error instanceof ProfileImageError) {
        const op: ProfileNotificationOperation =
          error.code === "too-large"
            ? "coverTooLargeError"
            : error.code === "processing"
              ? "coverSaveError"
              : "coverUnsupportedError";
        showNotification(op);
      } else {
        showNotification("coverSaveError");
      }
    } finally {
      setIsCoverBusy(false);
    }
  };

  const handleRemoveCustomCover = (): void => {
    setNotification(null);
    setCustomCoverUrl(null);
    setCoverMode("default");

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(CUSTOM_COVER_STORAGE_KEY);
        window.localStorage.setItem(COVER_MODE_STORAGE_KEY, "default");
      }
    } catch {
      // Fallback
    }

    showNotification("customCoverRemoved");
  };

  const activePalette =
    COVER_PALETTES.find((p) => p.id === coverPalette) ?? COVER_PALETTES[0];
  const [avatarFeedback, setAvatarFeedback] = useState<AvatarFeedback | null>(
    null,
  );
  const [notification, setNotification] = useState<ProfileNotification | null>(
    null,
  );
  const [isProfileErrorDismissed, setIsProfileErrorDismissed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSequenceRef = useRef(0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const showNotification = (operation: ProfileNotificationOperation): void => {
    toastSequenceRef.current += 1;
    setNotification({ id: toastSequenceRef.current, operation });
  };

  const closeNotification = useCallback((): void => {
    setNotification(null);
  }, [setNotification]);

  const startNameEditing = (): void => {
    if (!user) return;

    setDraftName(user.name);
    setNameError(false);
    setIsEditingName(true);
  };

  const cancelNameEditing = (): void => {
    setDraftName(user?.name ?? "");
    setNameError(false);
    setIsEditingName(false);
  };

  const handleNameSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (isNameBusy) return;

    setNotification(null);

    const normalizedName = normalizeProfileName(draftName);

    if (!isValidProfileName(normalizedName)) {
      setNameError(true);
      return;
    }

    if (normalizedName === user?.name) {
      setDraftName(normalizedName);
      setNameError(false);
      setIsEditingName(false);
      return;
    }

    setIsNameBusy(true);

    try {
      if (!(await updateUserName(normalizedName))) {
        showNotification("nameSaveError");
        return;
      }

      setDraftName(normalizedName);
      setNameError(false);
      setIsEditingName(false);
      showNotification("nameUpdated");
    } finally {
      setIsNameBusy(false);
    }
  };

  const handleAvatarSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setNotification(null);
    setAvatarFeedback(null);
    setIsAvatarBusy(true);

    try {
      const preparedAvatar = await prepareProfileImage(file);

      if (!isMountedRef.current) return;

      if (!(await updateUserAvatar(preparedAvatar))) {
        showNotification("avatarSaveError");
        return;
      }

      setAvatarFeedback({ tone: "success", key: "profile.avatarUpdated" });
      showNotification("avatarUpdated");
    } catch (error) {
      if (!(error instanceof ProfileImageError)) {
        showNotification("avatarSaveError");
        return;
      }

      const key =
        error.code === "too-large"
          ? "profile.avatarTooLarge"
          : error.code === "processing"
            ? "profile.avatarProcessingError"
            : "profile.avatarUnsupportedFormat";

      setAvatarFeedback({ tone: "error", key });
    } finally {
      setIsAvatarBusy(false);
    }
  };

  const handleAvatarRemoval = async (): Promise<void> => {
    if (!user?.avatarUrl) return;

    setNotification(null);
    setAvatarFeedback(null);
    setIsAvatarBusy(true);

    try {
      if (!(await removeUserAvatar())) {
        showNotification("avatarRemoveError");
        return;
      }

      setAvatarFeedback({ tone: "success", key: "profile.avatarRemoved" });
      showNotification("avatarRemoved");
    } catch {
      showNotification("avatarRemoveError");
    } finally {
      setIsAvatarBusy(false);
    }
  };

  const handleCopyId = async (): Promise<void> => {
    if (!user?.id) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(user.id);
      }
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      // Fallback gracioso
    }
  };

  const notificationCopy = notification
    ? profileNotificationCopy[notification.operation]
    : profileError && !isProfileErrorDismissed
      ? profileNotificationCopy.profileLoadError
      : null;

  return (
    <section
      className="profile-page px-6 py-5 max-w-7xl mx-auto w-full min-h-0"
      aria-label={t("profile.title")}
    >
      <h1 className="profile-sr-only">{t("profile.title")}</h1>

      {user ? (
        <div className="profile-panel">
          <article className="profile-hero" aria-labelledby="profile-user-name">
            <div
              className={`profile-hero-cover ${
                coverMode === "default"
                  ? "profile-cover--default"
                  : coverMode === "custom"
                    ? "profile-cover--custom"
                    : activePalette.gradientClass
              }`}
              style={
                coverMode === "default"
                  ? { backgroundImage: `url(${defaultCoverUrl})` }
                  : coverMode === "custom" && customCoverUrl
                    ? { backgroundImage: `url(${customCoverUrl})` }
                    : undefined
              }
            >
              <span className="profile-brand">
                <Leaf size={14} strokeWidth={2.2} aria-hidden="true" />
                <span>EcoPlaza</span>
              </span>
            </div>

            <div className="profile-identity">
              <div className="profile-avatar-shell">
                <div className="profile-avatar">
                  {user.avatarUrl ? (
                    <img
                      className="profile-avatar-image"
                      src={user.avatarUrl}
                      alt=""
                    />
                  ) : (
                    <UserRound strokeWidth={1.5} aria-hidden="true" />
                  )}
                </div>
                <button
                  type="button"
                  className="profile-avatar-quick-camera"
                  aria-label={t("profile.changePhoto")}
                  title={t("profile.changePhoto")}
                  disabled={isAvatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={15} strokeWidth={2} aria-hidden="true" />
                </button>
                <input
                  ref={avatarInputRef}
                  className="profile-avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  aria-label={t("profile.changePhoto")}
                  onChange={handleAvatarSelection}
                />
              </div>

              <div className="profile-identity-copy">
                <div className="profile-identity-header">
                  <h2 id="profile-user-name" title={user.name}>
                    {user.name}
                  </h2>
                  <span className="profile-active-badge">
                    <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
                    {t("profile.accountActive")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="profile-edit-action"
                onClick={startNameEditing}
                aria-controls="profile-name-input"
                disabled={isEditingName || isNameBusy}
              >
                <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                {t("profile.editName")}
              </button>
            </div>
          </article>

          <div className="profile-content-grid">
            <section
              className="profile-section profile-personal-section"
              aria-labelledby="profile-personal-heading"
            >
              <header className="profile-section-heading">
                <h3 id="profile-personal-heading">
                  {t("profile.personalInformation")}
                </h3>
              </header>

              <dl className="profile-details-list">
                <div className="profile-detail-row">
                  <dt>{t("profile.name")}</dt>
                  <dd>
                    {isEditingName ? (
                      <form
                        className="profile-name-form"
                        onSubmit={handleNameSubmit}
                        noValidate
                      >
                        <label
                          className="profile-sr-only"
                          htmlFor="profile-name-input"
                        >
                          {t("profile.name")}
                        </label>
                        <div className="profile-name-editor">
                          <input
                            id="profile-name-input"
                            type="text"
                            value={draftName}
                            onChange={(event) => {
                              setDraftName(event.target.value);
                              if (nameError) setNameError(false);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") cancelNameEditing();
                            }}
                            aria-invalid={nameError}
                            aria-describedby={
                              nameError ? "profile-name-error" : undefined
                            }
                            autoComplete="name"
                            autoFocus
                            disabled={isNameBusy}
                          />
                          <div className="profile-name-actions">
                            <button
                              type="submit"
                              className="profile-name-save"
                              disabled={isNameBusy}
                            >
                              {t("profile.save")}
                            </button>
                            <button
                              type="button"
                              className="profile-name-cancel"
                              onClick={cancelNameEditing}
                              disabled={isNameBusy}
                            >
                              {t("profile.cancel")}
                            </button>
                          </div>
                        </div>
                        {nameError && (
                          <p
                            id="profile-name-error"
                            className="profile-name-error"
                            role="alert"
                          >
                            {t("profile.nameValidation")}
                          </p>
                        )}
                      </form>
                    ) : (
                      <span title={user.name}>{user.name}</span>
                    )}
                  </dd>
                </div>
                <div className="profile-detail-row">
                  <dt>{t("profile.email")}</dt>
                  <dd title={user.email}>{user.email}</dd>
                </div>
              </dl>

              <div className="profile-photo-management">
                <div className="profile-photo-copy">
                  <span className="profile-photo-title">
                    {t("profile.profilePhoto")}
                  </span>
                  <p
                    id="profile-avatar-feedback"
                    className="profile-avatar-feedback"
                    data-tone={avatarFeedback?.tone ?? "help"}
                    role={
                      avatarFeedback
                        ? avatarFeedback.tone === "error"
                          ? "alert"
                          : "status"
                        : undefined
                    }
                  >
                    {avatarFeedback
                      ? t(avatarFeedback.key)
                      : t("profile.avatarRequirements")}
                  </p>
                </div>
                <div className="profile-photo-action-buttons">
                  <button
                    type="button"
                    className="profile-avatar-change"
                    aria-label={t("profile.changePhoto")}
                    aria-busy={isAvatarBusy}
                    aria-describedby="profile-avatar-feedback"
                    disabled={isAvatarBusy}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera size={15} strokeWidth={2} aria-hidden="true" />
                    {t("profile.changePhoto")}
                  </button>
                  <button
                    type="button"
                    className="profile-avatar-remove"
                    aria-label={t("profile.removePhoto")}
                    aria-busy={isAvatarBusy}
                    aria-describedby="profile-avatar-feedback"
                    disabled={isAvatarBusy || !user.avatarUrl}
                    onClick={handleAvatarRemoval}
                  >
                    <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                    {t("profile.removePhoto")}
                  </button>
                </div>
              </div>
            </section>

            <section
              className="profile-section profile-identification-section"
              aria-labelledby="profile-identification-heading"
            >
              <header className="profile-section-heading profile-section-heading--icon">
                <span className="profile-section-icon" aria-hidden="true">
                  <IdCard size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 id="profile-identification-heading">
                    {t("profile.userIdentification")}
                  </h3>
                </div>
              </header>

              <dl className="profile-details-list profile-session-list">
                <div className="profile-detail-row profile-detail-row--stacked">
                  <dt>{t("profile.id")}</dt>
                  <dd className="profile-id-row">
                    <span className="profile-id-value" title={user.id}>
                      {user.id}
                    </span>
                    <button
                      type="button"
                      className="profile-id-copy-btn"
                      onClick={handleCopyId}
                      title={
                        isCopied
                          ? t("profile.idCopied", { defaultValue: "Copiado" })
                          : t("profile.copyId", { defaultValue: "Copiar ID" })
                      }
                      aria-label={
                        isCopied
                          ? t("profile.idCopied", { defaultValue: "Copiado" })
                          : t("profile.copyId", { defaultValue: "Copiar ID" })
                      }
                    >
                      {isCopied ? (
                        <Check
                          size={15}
                          className="profile-check-icon"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      ) : (
                        <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </button>
                  </dd>
                </div>
                <div className="profile-detail-row">
                  <dt>{t("profile.accountType")}</dt>
                  <dd>{t("profile.user")}</dd>
                </div>
                <div className="profile-detail-row">
                  <dt>{t("profile.accessEnvironment")}</dt>
                  <dd>{t("profile.desktopApplication")}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section
            className="profile-personalization"
            aria-labelledby="profile-personalization-heading"
          >
            <header className="profile-section-heading profile-section-heading--icon profile-personalization-header">
              <div className="profile-personalization-title-group">
                <span className="profile-section-icon" aria-hidden="true">
                  <Palette size={17} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 id="profile-personalization-heading">
                    {t("profile.personalization")}
                  </h3>
                </div>
              </div>

              <div className="profile-cover-action-buttons">
                <button
                  type="button"
                  className="profile-cover-upload-btn"
                  disabled={isCoverBusy}
                  onClick={() => coverInputRef.current?.click()}
                  title={t("profile.uploadCoverTitle", {
                    defaultValue: "Subir imagen de portada",
                  })}
                  aria-label={t("profile.uploadCoverTitle", {
                    defaultValue: "Subir imagen de portada",
                  })}
                >
                  <ImagePlus size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{t("profile.uploadCover", { defaultValue: "Subir imagen" })}</span>
                </button>
                {customCoverUrl ? (
                  <button
                    type="button"
                    className="profile-cover-remove-btn"
                    onClick={handleRemoveCustomCover}
                    disabled={isCoverBusy}
                    title={t("profile.restoreDefaultCover", {
                      defaultValue: "Restaurar portada predeterminada",
                    })}
                    aria-label={t("profile.restoreDefaultCover", {
                      defaultValue: "Restaurar portada predeterminada",
                    })}
                  >
                    <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{t("profile.restoreDefaultCover", { defaultValue: "Restaurar" })}</span>
                  </button>
                ) : null}
                <input
                  ref={coverInputRef}
                  type="file"
                  className="profile-sr-only"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  aria-label={t("profile.uploadCoverTitle", {
                    defaultValue: "Subir imagen de portada",
                  })}
                  onChange={handleCoverSelection}
                  disabled={isCoverBusy}
                />
              </div>
            </header>

            <div
              className="profile-palette-options"
              role="radiogroup"
              aria-label={t("profile.coverPalette")}
            >
              {/* Opción 1: Portada predeterminada del sistema (EcoPlaza) */}
              <button
                type="button"
                role="radio"
                aria-checked={coverMode === "default"}
                aria-label={t("profile.coverDefault", {
                  defaultValue: "EcoPlaza Institucional",
                })}
                className={`profile-palette-swatch ${coverMode === "default" ? "is-active" : ""}`}
                onClick={handleSelectDefaultCover}
              >
                <span
                  className="profile-palette-preview profile-palette-preview--image"
                  style={{ backgroundImage: `url(${defaultCoverUrl})` }}
                  aria-hidden="true"
                />
                <span className="profile-palette-name">
                  {t("profile.coverDefault", { defaultValue: "EcoPlaza" })}
                </span>
                <span className="profile-palette-selection" aria-hidden="true">
                  {coverMode === "default" && <Check size={14} strokeWidth={2.5} />}
                </span>
              </button>

              {/* Opciones 2-5: Portadas por paleta de color */}
              {COVER_PALETTES.map((palette) => {
                const isSelected = coverMode === "palette" && coverPalette === palette.id;
                const paletteName = t(palette.nameKey, {
                  defaultValue: palette.defaultName,
                });

                return (
                  <button
                    key={palette.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={paletteName}
                    className={`profile-palette-swatch ${isSelected ? "is-active" : ""}`}
                    onClick={() => handleSelectCoverPalette(palette.id)}
                  >
                    <span
                      className="profile-palette-preview"
                      style={{ background: palette.previewColor }}
                      aria-hidden="true"
                    />
                    <span className="profile-palette-name">{paletteName}</span>
                    <span className="profile-palette-selection" aria-hidden="true">
                      {isSelected && <Check size={14} strokeWidth={2.5} />}
                    </span>
                  </button>
                );
              })}

              {/* Opción 6: Imagen personalizada subida por el usuario (si existe) */}
              {customCoverUrl ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={coverMode === "custom"}
                  aria-label={t("profile.customCover", {
                    defaultValue: "Personalizada",
                  })}
                  className={`profile-palette-swatch ${coverMode === "custom" ? "is-active" : ""}`}
                  onClick={handleSelectCustomCover}
                >
                  <span
                    className="profile-palette-preview profile-palette-preview--image"
                    style={{ backgroundImage: `url(${customCoverUrl})` }}
                    aria-hidden="true"
                  />
                  <span className="profile-palette-name">
                    {t("profile.customCover", { defaultValue: "Personalizada" })}
                  </span>
                  <span className="profile-palette-selection" aria-hidden="true">
                    {coverMode === "custom" && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <div className="profile-empty-state mt-6">
          <Info size={22} aria-hidden="true" />
          <p role="status">{t("profile.unavailable")}</p>
        </div>
      )}

      {notificationCopy ? (
        <SuccessToast
          key={notification?.id ?? "profile-load-error"}
          title={t(notificationCopy.title)}
          description={t(notificationCopy.description)}
          closeLabel={t("profile.dismissNotification")}
          onClose={
            notification
              ? closeNotification
              : () => setIsProfileErrorDismissed(true)
          }
          duration={notificationCopy.variant === "error" ? 7000 : undefined}
          variant={notificationCopy.variant}
        />
      ) : null}
    </section>
  );
}

function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return <ProfilePageContent key={user.id} />;
}

export default ProfilePage;
