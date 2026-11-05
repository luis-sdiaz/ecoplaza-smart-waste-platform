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
import {
  fetchLatestTelemetryByContainer,
  type SensorTelemetry,
} from "../services/telemetryService";

export type AssistantPageProps = {
  initialMessages?: AssistantMessage[];
  initialTelemetry?: SensorTelemetry | null;
};

export function AssistantPage({
  initialMessages,
  initialTelemetry,
}: AssistantPageProps = {}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    initialMessages ?? loadAssistantMessages(DEFAULT_WELCOME_MESSAGE),
  );
  const [physicalTelemetry, setPhysicalTelemetry] =
    useState<SensorTelemetry | null>(
      initialTelemetry !== undefined ? initialTelemetry : null,
    );

  useEffect(() => {
    saveAssistantMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (initialTelemetry !== undefined) return;
    void fetchLatestTelemetryByContainer("CTR-BOG-001")
      .then((data) => setPhysicalTelemetry(data))
      .catch(() => setPhysicalTelemetry(null));
  }, [initialTelemetry]);

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
          physicalTelemetry={physicalTelemetry}
        />
      </div>
    </section>
  );
}

export default AssistantPage;
