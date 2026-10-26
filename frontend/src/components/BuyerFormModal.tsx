import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  isValidBuyerEmail,
  isValidBuyerName,
  isValidBuyerPhone,
  type Buyer,
  type BuyerInput,
} from "../services/buyerService";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface BuyerFormModalProps {
  buyer: Buyer | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: BuyerInput) => void;
}

type BuyerFormErrors = {
  name: boolean;
  email: boolean;
  phone: boolean;
};

const emptyErrors: BuyerFormErrors = {
  name: false,
  email: false,
  phone: false,
};

function BuyerFormModal({
  buyer,
  isSubmitting,
  onClose,
  onSubmit,
}: BuyerFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(buyer?.name ?? "");
  const [documentNumber, setDocumentNumber] = useState(
    buyer?.documentNumber ?? "",
  );
  const [email, setEmail] = useState(buyer?.email ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [address, setAddress] = useState(buyer?.address ?? "");
  const [errors, setErrors] = useState<BuyerFormErrors>(emptyErrors);
  const dialogRef = useDialogFocus(onClose, !isSubmitting);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const nextErrors: BuyerFormErrors = {
      name: !isValidBuyerName(name),
      email: !isValidBuyerEmail(email),
      phone: !isValidBuyerPhone(phone),
    };
    setErrors(nextErrors);

    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.phone ||
      isSubmitting
    ) {
      return;
    }

    onSubmit({
      name,
      documentNumber,
      email,
      phone,
      address,
    });
  };

  const fieldClassName = (hasError: boolean): string =>
    `mt-2 w-full rounded-xl border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
      hasError
        ? "border-ecoplaza-danger focus-visible:outline-ecoplaza-danger"
        : "border-ecoplaza-border focus-visible:outline-ecoplaza-accent"
    }`;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/25 p-8">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-form-title"
        className="w-full max-w-md rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-xl"
      >
        <h2
          id="buyer-form-title"
          className="text-lg font-semibold text-ecoplaza-text"
        >
          {t(buyer ? "buyers.editModalTitle" : "buyers.createModalTitle")}
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          {t("buyers.formDescription")}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="buyer-name"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("buyers.nameField")}
            </label>
            <input
              id="buyer-name"
              type="text"
              autoComplete="organization"
              maxLength={100}
              required
              disabled={isSubmitting}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) {
                  setErrors((current) => ({ ...current, name: false }));
                }
              }}
              aria-invalid={errors.name}
              aria-describedby={errors.name ? "buyer-name-error" : undefined}
              className={fieldClassName(errors.name)}
            />
            {errors.name && (
              <p
                id="buyer-name-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("buyers.invalidName")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="buyer-document"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              Documento / NIT
            </label>
            <input
              id="buyer-document"
              type="text"
              autoComplete="off"
              maxLength={50}
              disabled={isSubmitting}
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder="Documento o NIT"
              className={fieldClassName(false)}
            />
          </div>

          <div>
            <label
              htmlFor="buyer-email"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("buyers.emailField")}
            </label>
            <input
              id="buyer-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              disabled={isSubmitting}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) {
                  setErrors((current) => ({ ...current, email: false }));
                }
              }}
              aria-invalid={errors.email}
              aria-describedby={
                errors.email ? "buyer-email-error" : "buyer-contact-help"
              }
              className={fieldClassName(errors.email)}
            />
            {errors.email && (
              <p
                id="buyer-email-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("buyers.invalidEmail")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="buyer-phone"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("buyers.phoneField")}
            </label>
            <input
              id="buyer-phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              disabled={isSubmitting}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (errors.phone) {
                  setErrors((current) => ({ ...current, phone: false }));
                }
              }}
              aria-invalid={errors.phone}
              aria-describedby={
                errors.phone ? "buyer-phone-error" : "buyer-contact-help"
              }
              className={fieldClassName(errors.phone)}
            />
            {errors.phone && (
              <p
                id="buyer-phone-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("buyers.invalidPhone")}
              </p>
            )}
            {!errors.email && !errors.phone && (
              <p
                id="buyer-contact-help"
                className="mt-1.5 text-xs text-ecoplaza-text-muted"
              >
                {t("buyers.optionalContactHelp")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="buyer-address"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              Dirección
            </label>
            <input
              id="buyer-address"
              type="text"
              autoComplete="street-address"
              maxLength={120}
              disabled={isSubmitting}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Dirección física"
              className={fieldClassName(false)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("buyers.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-medium text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t(isSubmitting ? "buyers.saving" : "buyers.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BuyerFormModal;
