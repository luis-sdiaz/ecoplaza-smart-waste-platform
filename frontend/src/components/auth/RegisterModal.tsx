import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Lock, Mail, User, X } from "lucide-react";
import "./RegisterModal.css";

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const registerFields = [
  { name: "fullName", label: "Nombre completo", type: "text", autoComplete: "name", placeholder: "Tu nombre completo", icon: User },
  { name: "email", label: "Correo electrónico", type: "email", autoComplete: "email", placeholder: "usuario@correo.com", icon: Mail },
  { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password", placeholder: "•••••••••••", icon: Lock },
  { name: "confirmPassword", label: "Confirmar contraseña", type: "password", autoComplete: "new-password", placeholder: "•••••••••••", icon: Lock },
] as const;

type RegisterFieldName = (typeof registerFields)[number]["name"];
type RegisterValues = Record<RegisterFieldName, string>;
type RegisterErrors = Partial<Record<RegisterFieldName, string>>;

const initialValues: RegisterValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateRegistration(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Ingresa tu nombre completo.";

  const email = values.email.trim();
  if (!email) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.password) errors.password = "Ingresa una contraseña.";
  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}

function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(initialValues);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const errors = hasSubmitted ? validateRegistration(values) : {};

  const handleClose = () => {
    setValues(initialValues);
    setHasSubmitted(false);
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const validationErrors = validateRegistration(values);
    const firstInvalidField = registerFields.find(({ name }) => validationErrors[name]);
    if (firstInvalidField) {
      const input = event.currentTarget.elements.namedItem(firstInvalidField.name);
      if (input instanceof HTMLInputElement) {
        // Wait for the error text and aria-describedby to render before focusing.
        requestAnimationFrame(() => {
          if (input.isConnected) input.focus();
        });
      }
    }

    // Registration is not connected yet; valid submissions keep the modal open.
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    dialog.showModal();
    firstInputRef.current?.focus();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      aria-describedby={`${formId}-description`}
      className="ecoplaza-register-modal px-8 py-7 text-ecoplaza-text"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
    >
      <button
        type="button"
        aria-label="Cerrar registro"
        onClick={handleClose}
        className="absolute top-5 right-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
      >
        <X size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <header>
        <h2 id={`${formId}-title`} className="pr-10 text-[28px] leading-9 font-semibold tracking-tight">
          Crear cuenta
        </h2>
        <p id={`${formId}-description`} className="mt-1.5 text-sm leading-5 text-ecoplaza-text-muted">
          Regístrate para comenzar a gestionar residuos y recursos en EcoPlaza.
        </p>
      </header>

      <form className="mt-5" noValidate onSubmit={handleSubmit}>
        <div className="space-y-3">
          {registerFields.map(({ name, label, type, autoComplete, placeholder, icon: Icon }, index) => (
            <div key={name}>
              <label
                htmlFor={`${formId}-${name}`}
                className="mb-1.5 block text-sm font-medium text-ecoplaza-text"
              >
                {label}
              </label>
              <div className="relative">
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted"
                />
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  id={`${formId}-${name}`}
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  required
                  value={values[name]}
                  onChange={(event) => setValues({ ...values, [name]: event.target.value })}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${formId}-${name}-error` : undefined}
                  className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                />
              </div>
              {errors[name] && (
                <p id={`${formId}-${name}-error`} className="mt-1 text-xs leading-4 text-ecoplaza-danger">
                  {errors[name]}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-surface transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
        >
          Crear cuenta
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </form>

      <p className="mt-3 text-center text-sm leading-5 text-ecoplaza-text-muted">
        ¿Ya tienes una cuenta?{" "}
        <button
          type="button"
          onClick={handleClose}
          className="cursor-pointer rounded font-semibold text-ecoplaza-primary transition-colors duration-150 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
        >
          Iniciar sesión
        </button>
      </p>
    </dialog>
  );
}

export default RegisterModal;
