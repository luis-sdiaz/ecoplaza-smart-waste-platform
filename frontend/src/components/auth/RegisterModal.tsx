import { useEffect, useRef } from "react";
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
];

function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

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
      aria-labelledby="register-title"
      aria-describedby="register-description"
      className="ecoplaza-register-modal px-8 py-7 text-ecoplaza-text"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        aria-label="Cerrar registro"
        onClick={onClose}
        className="absolute top-5 right-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
      >
        <X size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <header>
        <h2 id="register-title" className="pr-10 text-[28px] leading-9 font-semibold tracking-tight">
          Crear cuenta
        </h2>
        <p id="register-description" className="mt-1.5 text-sm leading-5 text-ecoplaza-text-muted">
          Regístrate para comenzar a gestionar residuos y recursos en EcoPlaza.
        </p>
      </header>

      <form className="mt-5" noValidate onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-3">
          {registerFields.map(({ name, label, type, autoComplete, placeholder, icon: Icon }, index) => (
            <div key={name}>
              <label
                htmlFor={`register-${name}`}
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
                  id={`register-${name}`}
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                />
              </div>
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
          onClick={onClose}
          className="cursor-pointer rounded font-semibold text-ecoplaza-primary transition-colors duration-150 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
        >
          Iniciar sesión
        </button>
      </p>
    </dialog>
  );
}

export default RegisterModal;
