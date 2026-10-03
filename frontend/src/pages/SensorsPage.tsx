import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorDeviceCard from "../components/SensorDeviceCard";

function SensorsPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Monitoreo IoT"
        title="Sensores"
        description="Supervisa los sensores y contenedores conectados a EcoPlaza."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Sensores registrados"
          value="10"
          description="Dispositivos configurados"
        />

        <MetricCard
          title="Sensores activos"
          value="8"
          description="Actualmente conectados"
        />

        <MetricCard
          title="Nivel promedio"
          value="64%"
          description="Promedio de llenado"
        />

        <MetricCard
          title="Alertas"
          value="2"
          description="Contenedores que requieren atención"
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Dispositivos registrados
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Estado actual y últimas lecturas de los contenedores conectados.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <SensorDeviceCard
            name="Contenedor 01"
            sensorId="SEN-001"
            category="Residuos orgánicos"
            fillLevel={68}
            weight={18.4}
            status="Activo"
            lastUpdate="Hace 2 min"
          />

          <SensorDeviceCard
            name="Contenedor 02"
            sensorId="SEN-002"
            category="Residuos reciclables"
            fillLevel={42}
            weight={12.7}
            status="Activo"
            lastUpdate="Hace 4 min"
          />

          <SensorDeviceCard
            name="Contenedor 03"
            sensorId="SEN-003"
            category="Residuos no aprovechables"
            fillLevel={81}
            weight={23.1}
            status="Activo"
            lastUpdate="Hace 1 min"
          />
        </div>
      </div>
    </section>
  );
}

export default SensorsPage;
