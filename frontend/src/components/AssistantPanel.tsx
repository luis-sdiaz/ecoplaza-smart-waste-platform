import { Bot, Send, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

function AssistantPanel() {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <div className="flex items-center justify-between border-b border-ecoplaza-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
            <Bot size={22} strokeWidth={2.2} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ecoplaza-text">
              {t("assistant.panelTitle")}
            </h2>

            <p className="mt-1 text-xs text-ecoplaza-text-muted">
              {t("assistant.panelDescription")}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
          {t("assistant.local")}
        </span>
      </div>

      <div className="min-h-72 p-6">
        <div className="flex max-w-2xl gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-background text-ecoplaza-primary">
            <Sparkles size={18} />
          </div>

          <div className="rounded-2xl bg-ecoplaza-background px-4 py-3">
            <p className="text-sm leading-6 text-ecoplaza-text">
              {t("assistant.greeting")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-ecoplaza-border p-5">
        <div className="flex items-end gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-2">
          <textarea
            rows={2}
            placeholder={t("assistant.placeholder")}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ecoplaza-text outline-none placeholder:text-ecoplaza-text-muted"
          />

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-primary text-white"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default AssistantPanel;
