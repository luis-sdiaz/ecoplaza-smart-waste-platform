import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Camera, CircleCheck, IdCard, Info, Leaf, Mail, Pencil, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { isValidProfileName, normalizeProfileName } from "../auth/profileStorage";
import { prepareProfileImage, ProfileImageError } from "../auth/profileImage";
import SuccessToast from "../components/SuccessToast";
import "./ProfilePage.css";

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
  | "nameSaveError"
  | "avatarSaveError"
  | "avatarRemoveError";

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
  profileLoadError: {
    title: "profile.loadErrorTitle",
    description: "profile.loadErrorDescription",
    variant: "error",
  },
} as const;

function ProfilePage() {
  const { t } = useTranslation();
  const {
    user,
    profileError,
    updateUserName,
    updateUserAvatar,
    removeUserAvatar,
  } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [isNameBusy, setIsNameBusy] = useState(false);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<AvatarFeedback | null>(null);
  const [notification, setNotification] = useState<ProfileNotification | null>(null);
  const [isProfileErrorDismissed, setIsProfileErrorDismissed] = useState(false);
  const toastSequenceRef = useRef(0);

  const showNotification = (operation: ProfileNotificationOperation): void => {
    toastSequenceRef.current += 1;
    setNotification({ id: toastSequenceRef.current, operation });
  };

  const closeNotification = useCallback((): void => {
    setNotification(null);
  }, []);

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

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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

  const handleAvatarSelection = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setNotification(null);
    setAvatarFeedback(null);
    setIsAvatarBusy(true);

    try {
      const preparedAvatar = await prepareProfileImage(file);

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

      const key = error.code === "too-large"
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

  const notificationCopy = notification
    ? profileNotificationCopy[notification.operation]
    : profileError && !isProfileErrorDismissed
      ? profileNotificationCopy.profileLoadError
      : null;

  return (
    <section className="profile-page" aria-label={t("profile.title")}>
      <h1 className="profile-sr-only">{t("profile.title")}</h1>

      {user ? (
        <div className="profile-panel">
          <div className="profile-panel-grid">
            <article className="profile-hero" aria-labelledby="profile-user-name">
              <div className="profile-hero-cover">
                <span className="profile-brand">
                  <Leaf size={18} strokeWidth={1.8} aria-hidden="true" />
                  EcoPlaza
                </span>
              </div>

              <div className="profile-hero-content">
                <div className="profile-identity-bar">
                  <div className="profile-avatar-group">
                    <div className="profile-avatar-shell">
                      <div className="profile-avatar">
                        {user.avatarUrl ? (
                          <img className="profile-avatar-image" src={user.avatarUrl} alt="" />
                        ) : (
                          <UserRound strokeWidth={1.35} aria-hidden="true" />
                        )}
                      </div>
                      <input
                        ref={avatarInputRef}
                        className="profile-avatar-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        aria-label={t("profile.changePhoto")}
                        onChange={handleAvatarSelection}
                      />
                    </div>
                    <span className="profile-demo-badge">{t("profile.userAccount")}</span>
                  </div>

                  <span className="profile-active-badge">
                    <span aria-hidden="true" />
                    {t("profile.accountActive")}
                  </span>
                </div>

                <div className="profile-identity-text">
                  {isEditingName ? (
                    <>
                      <h2 id="profile-user-name" className="profile-sr-only">{user.name}</h2>
                      <form className="profile-name-form" onSubmit={handleNameSubmit} noValidate>
                        <label className="profile-sr-only" htmlFor="profile-name-input">
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
                            aria-describedby={nameError ? "profile-name-error" : undefined}
                            autoComplete="name"
                            autoFocus
                            disabled={isNameBusy}
                          />
                          <div className="profile-name-actions">
                            <button type="submit" className="profile-name-save" disabled={isNameBusy}>
                              {t("profile.save")}
                            </button>
                            <button type="button" className="profile-name-cancel" onClick={cancelNameEditing} disabled={isNameBusy}>
                              {t("profile.cancel")}
                            </button>
                          </div>
                        </div>
                        {nameError && (
                          <p id="profile-name-error" className="profile-name-error" role="alert">
                            {t("profile.nameValidation")}
                          </p>
                        )}
                      </form>
                    </>
                  ) : (
                    <div className="profile-name-row">
                      <h2 id="profile-user-name" title={user.name}>{user.name}</h2>
                      <button type="button" className="profile-name-edit" onClick={startNameEditing}>
                        <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
                        {t("profile.editName")}
                      </button>
                    </div>
                  )}
                  <p className="profile-account-type">
                    <span>{t("profile.accountType")}</span>
                    <strong>{t("profile.user")}</strong>
                  </p>
                  <p className="profile-email" title={user.email}>
                    <Mail size={17} strokeWidth={1.7} aria-hidden="true" />
                    <span>{user.email}</span>
                  </p>

                  <div className="profile-photo-management">
                    <div className="profile-photo-copy">
                      <span className="profile-photo-title">{t("profile.profilePhoto")}</span>
                      <p
                        id="profile-avatar-feedback"
                        className="profile-avatar-feedback"
                        data-tone={avatarFeedback?.tone ?? "help"}
                        role={avatarFeedback ? (avatarFeedback.tone === "error" ? "alert" : "status") : undefined}
                      >
                        {avatarFeedback ? t(avatarFeedback.key) : t("profile.avatarRequirements")}
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
                        <Camera size={14} strokeWidth={1.9} aria-hidden="true" />
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
                        <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                        {t("profile.removePhoto")}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="profile-demo-note">{t("profile.userDescription")}</p>
              </div>
            </article>

            <aside className="profile-side-stack" aria-label={t("profile.profileSummary")}>
              <section className="profile-status-card" aria-labelledby="profile-status-heading">
                <header className="profile-card-heading">
                  <span className="profile-card-icon">
                    <ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h2 id="profile-status-heading">{t("profile.accountInformation")}</h2>
                </header>

                <dl className="profile-account-grid">
                  <div className="profile-account-item">
                    <dt>{t("profile.accountType")}</dt>
                    <dd>{t("profile.user")}</dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.status")}</dt>
                    <dd>{t("profile.active")}</dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.currentAccess")}</dt>
                    <dd>
                      <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
                      {t("profile.authenticated")}
                    </dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.platform")}</dt>
                    <dd>EcoPlaza</dd>
                  </div>
                </dl>
              </section>

              <section className="profile-id-card" aria-labelledby="profile-id-heading">
                <IdCard className="profile-id-watermark" strokeWidth={0.85} aria-hidden="true" />
                <header className="profile-card-heading">
                  <span className="profile-card-icon">
                    <IdCard size={21} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h2 id="profile-id-heading">{t("profile.userIdentification")}</h2>
                </header>

                <dl className="profile-identifier-list">
                  <div className="profile-identifier-item">
                    <dt>{t("profile.id")}</dt>
                    <dd title={user.id}>{user.id}</dd>
                  </div>
                  <div className="profile-identifier-item">
                    <dt>{t("profile.associatedEmail")}</dt>
                    <dd title={user.email}>{user.email}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <div className="profile-empty-state">
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
          onClose={notification
            ? closeNotification
            : () => setIsProfileErrorDismissed(true)}
          duration={notificationCopy.variant === "error" ? 7000 : undefined}
          variant={notificationCopy.variant}
        />
      ) : null}
    </section>
  );
}

export default ProfilePage;
