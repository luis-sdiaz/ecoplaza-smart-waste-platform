import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import IoTFleetDiagnosticCard from "../components/IoTFleetDiagnosticCard";
import AssistantPanel from "../components/AssistantPanel";
import {
  clearAssistantMessages,
  loadAssistantMessages,
  saveAssistantMessages,
  DEFAULT_WELCOME_MESSAGE,
  type AssistantMessage,
} from "../services/assistantStorage";

function AssistantPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    loadAssistantMessages(DEFAULT_WELCOME_MESSAGE),
  );

  useEffect(() => {
    saveAssistantMessages(messages);
  }, [messages]);

  const handleClearMessages = () => {
    clearAssistantMessages();
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  return (
    <section className="flex h-full flex-col p-6 lg:p-8">
      <div className="shrink-0">
        <PageHeader
          eyebrow={t("assistant.eyebrow")}
          title={t("assistant.title")}
          description={t("assistant.description")}
        />
      </div>

      <div className="mt-4 shrink-0">
        <IoTFleetDiagnosticCard />
      </div>

      <div className="mt-6 mb-6 flex min-h-0 flex-1 flex-col">
        <AssistantPanel
          messages={messages}
          onMessagesChange={setMessages}
          onClearMessages={handleClearMessages}
        />
      </div>
    </section>
  );
}

export default AssistantPage;
