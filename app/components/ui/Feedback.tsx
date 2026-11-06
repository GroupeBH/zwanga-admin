"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./ui.module.css";

/* Remplace window.confirm / alert / prompt: memes appels depuis n'importe quel
   gestionnaire (`await confirmAction(...)`), mais une boite stylee qui dit ce
   qui va se passer, et des notifications qui ne bloquent pas la page. */

export type ToastTone = "success" | "error" | "info";

export interface ConfirmOptions {
  readonly title?: string;
  readonly message: ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** "danger" colore le bouton et place le focus sur Annuler. */
  readonly tone?: "danger" | "default";
}

export interface PromptOptions extends ConfirmOptions {
  readonly label?: string;
  readonly placeholder?: string;
  readonly defaultValue?: string;
  readonly required?: boolean;
}

interface Bus {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  notify: (message: ReactNode, tone: ToastTone) => void;
}

let bus: Bus | null = null;

const DESTRUCTIVE = /supprim|définitiv|désactiv|suspend|retir|annuler cette|rejet|refus|révoqu|bloqu/i;
const toOptions = <T extends ConfirmOptions>(value: string | T) =>
  (typeof value === "string" ? { message: value } : value) as T;

export const confirmAction = (value: string | ConfirmOptions): Promise<boolean> => {
  const options = toOptions(value);
  const tone =
    options.tone ??
    (typeof options.message === "string" && DESTRUCTIVE.test(options.message)
      ? "danger"
      : "default");
  if (!bus) {
    return Promise.resolve(
      window.confirm(typeof options.message === "string" ? options.message : "Confirmer ?")
    );
  }
  return bus.confirm({ ...options, tone });
};

export const promptText = (value: string | PromptOptions): Promise<string | null> => {
  const options = toOptions(value);
  if (!bus) {
    return Promise.resolve(
      window.prompt(typeof options.message === "string" ? options.message : "")
    );
  }
  return bus.prompt({ required: true, ...options });
};

const ERROR_HINT = /impossible|échec|erreur|veuillez|refusé|indisponible/i;

export const notify = (message: ReactNode, tone?: ToastTone) => {
  const resolved =
    tone ?? (typeof message === "string" && ERROR_HINT.test(message) ? "error" : "success");
  if (!bus) {
    if (typeof message === "string") window.alert(message);
    return;
  }
  bus.notify(message, resolved);
};

interface Toast {
  readonly id: number;
  readonly message: ReactNode;
  readonly tone: ToastTone;
}

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

const TOAST_ICON = { success: CircleCheck, error: CircleAlert, info: Info };

export const FeedbackProvider = ({ children }: { readonly children: ReactNode }) => {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  /* window.confirm bloquait tout: ici, une seconde demande pendant qu'une boite
     est ouverte est refusee d'office, pour ne jamais declencher deux fois une
     action (virement, suppression...). */
  const open = useRef(false);

  useEffect(() => {
    bus = {
      confirm: (options) =>
        new Promise((resolve) => {
          if (open.current) return resolve(false);
          open.current = true;
          returnFocus.current = document.activeElement as HTMLElement | null;
          setPending({ kind: "confirm", options, resolve });
        }),
      prompt: (options) =>
        new Promise((resolve) => {
          if (open.current) return resolve(null);
          open.current = true;
          returnFocus.current = document.activeElement as HTMLElement | null;
          setValue(options.defaultValue ?? "");
          setPending({ kind: "prompt", options, resolve });
        }),
      notify: (message, tone) => {
        const id = ++nextId.current;
        setToasts((list) => [...list.slice(-3), { id, message, tone }]);
        window.setTimeout(() => dismiss(id), tone === "error" ? 9000 : 5000);
      },
    };
    return () => {
      bus = null;
    };
  }, [dismiss]);

  useEffect(() => {
    if (!pending) return;
    if (pending.kind === "prompt") inputRef.current?.focus();
    else if (pending.options.tone === "danger") cancelRef.current?.focus();
    else confirmRef.current?.focus();
  }, [pending]);

  const close = (accepted: boolean) => {
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(accepted);
    else pending.resolve(accepted ? value.trim() : null);
    open.current = false;
    setPending(null);
    returnFocus.current?.focus?.();
  };

  const promptInvalid =
    pending?.kind === "prompt" && pending.options.required !== false && !value.trim();
  const danger = pending?.options.tone === "danger";

  return (
    <>
      {children}
      {pending ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={() => close(false)}>
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            aria-describedby="feedback-message"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") close(false);
            }}
          >
            <div className={styles.dialogHead}>
              <span className={danger ? styles.iconDanger : styles.iconDefault}>
                {danger ? <TriangleAlert size={18} aria-hidden /> : <Info size={18} aria-hidden />}
              </span>
              <h2 id="feedback-title">
                {pending.options.title ?? (danger ? "Action irréversible ou sensible" : "Confirmer l’action")}
              </h2>
            </div>
            <div id="feedback-message" className={styles.dialogMessage}>
              {pending.options.message}
            </div>
            {pending.kind === "prompt" ? (
              <label className={styles.dialogField}>
                <span>{pending.options.label ?? "Motif"}</span>
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={value}
                  placeholder={pending.options.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !promptInvalid) {
                      event.preventDefault();
                      close(true);
                    }
                  }}
                />
              </label>
            ) : null}
            <div className={styles.dialogActions}>
              <button ref={cancelRef} type="button" className={styles.cancel} onClick={() => close(false)}>
                {pending.options.cancelLabel ?? "Annuler"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={danger ? styles.confirmDanger : styles.confirm}
                disabled={promptInvalid}
                onClick={() => close(true)}
              >
                {pending.options.confirmLabel ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={styles.toasts} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className={`${styles.toast} ${styles[toast.tone]}`}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <Icon size={18} aria-hidden />
              <div className={styles.toastBody}>{toast.message}</div>
              <button type="button" aria-label="Fermer la notification" onClick={() => dismiss(toast.id)}>
                <X size={15} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};
