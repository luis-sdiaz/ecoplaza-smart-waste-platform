/**
 * ============================================================================
 * EcoPlaza — Smart Waste & IoT Platform
 * Firmware para Microcontrolador ESP32-WROOM-32
 * ============================================================================
 * Descripción:
 *  Lectura periódica de sensores de nivel ultrasónico (HC-SR04) y condiciones
 *  ambientales (DHT22) para contenedores inteligentes de reciclaje.
 *  Controla un semáforo LED físico de estado y emite telemetría estructurada
 *  en formato JSON por puerto serie a 115200 baudios.
 *
 * Arquitectura de Pines:
 *  - HC-SR04 TRIG: GPIO 5
 *  - HC-SR04 ECHO: GPIO 18 (ADVERTENCIA: Usar divisor de tensión 5V -> 3.3V)
 *  - DHT22 DATA:   GPIO 4
 *  - LED Verde:    GPIO 25 (< 60% llenado)
 *  - LED Amarillo: GPIO 26 (60% - 84% llenado)
 *  - LED Rojo:     GPIO 27 (>= 85% llenado crítico)
 * ============================================================================
 */

#include <Arduino.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ----------------------------------------------------------------------------
// Configuración de Pines GPIO (ESP32)
// ----------------------------------------------------------------------------
constexpr uint8_t PIN_TRIG        = 5;   // Disparador del sensor ultrasónico
constexpr uint8_t PIN_ECHO        = 18;  // Eco ultrasónico (requiere divisor 5V a 3.3V)
constexpr uint8_t PIN_DHT         = 4;   // Pin de datos del sensor DHT22
constexpr uint8_t PIN_LED_GREEN   = 25;  // Semáforo: Estado Óptimo
constexpr uint8_t PIN_LED_YELLOW  = 26;  // Semáforo: Estado Advertencia
constexpr uint8_t PIN_LED_RED     = 27;  // Semáforo: Estado Crítico

// ----------------------------------------------------------------------------
// Constantes de Calibración del Contenedor
// ----------------------------------------------------------------------------
const char* const CONTAINER_ID          = "CTR-BOG-001"; // Identificador único EcoPlaza
constexpr float CONTAINER_HEIGHT_CM     = 100.0f;       // Distancia sensor-fondo (vacío)
constexpr float SENSOR_MIN_DISTANCE_CM  = 10.0f;        // Distancia mínima (zona ciega / lleno)
constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;    // Frecuencia de emisión (5 segundos)
constexpr unsigned long SOUND_TIMEOUT_US      = 30000;   // Timeout para pulso ultrasónico (~5 metros)

// Instancia de sensor DHT
#define DHTTYPE DHT22
DHT dht(PIN_DHT, DHTTYPE);

// Estructura de Telemetría
struct TelemetryData {
  float distanceCm;
  int   fillLevelPercent;
  float temperatureC;
  float humidityPercent;
  const char* status;
};

// Variable para control no bloqueante del ciclo
unsigned long lastTelemetryTimestamp = 0;

// ----------------------------------------------------------------------------
// Declaración de Funciones
// ----------------------------------------------------------------------------
float readUltrasonicRawDistance();
int calculateFillPercent(float distanceCm);
void readTemperatureHumidity(float &tempC, float &humidity);
void updateStatusLeds(int fillPercent);
const char* resolveStatusText(int fillPercent);
void publishTelemetryJson(const TelemetryData &data);

// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  EcoPlaza — ESP32 Smart Container Telemetry"));
  Serial.print(F("  Container ID: "));
  Serial.println(CONTAINER_ID);
  Serial.println(F("=================================================="));

  // Configuración de pines de entrada / salida
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  // Inicialización de LEDs (Prueba de arranque: parpadeo rápido)
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_YELLOW, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  delay(500);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Inicialización del sensor DHT22
  dht.begin();
  Serial.println(F("[INFO] Sensores inicializados correctamente. Iniciando bucle..."));
}

// ----------------------------------------------------------------------------
// Loop Principal (No Bloqueante)
// ----------------------------------------------------------------------------
void loop() {
  const unsigned long currentMillis = millis();

  if (currentMillis - lastTelemetryTimestamp >= TELEMETRY_INTERVAL_MS || lastTelemetryTimestamp == 0) {
    lastTelemetryTimestamp = currentMillis;

    // 1. Lectura de distancia ultrasónica y cálculo de llenado
    const float rawDistance = readUltrasonicRawDistance();
    const int fillPercent = calculateFillPercent(rawDistance);

    // 2. Actualización inmediata del semáforo LED físico
    updateStatusLeds(fillPercent);

    // 3. Lectura de temperatura y humedad
    float tempC = 0.0f;
    float humidity = 0.0f;
    readTemperatureHumidity(tempC, humidity);

    // 4. Preparación y emisión del paquete de telemetría JSON
    TelemetryData telemetry;
    telemetry.distanceCm = rawDistance;
    telemetry.fillLevelPercent = fillPercent;
    telemetry.temperatureC = tempC;
    telemetry.humidityPercent = humidity;
    telemetry.status = resolveStatusText(fillPercent);

    publishTelemetryJson(telemetry);
  }

  // Permite ceder tiempo para tareas internas del RTOS en ESP32
  yield();
}

// ----------------------------------------------------------------------------
// Lectura de Distancia Ultrasónica (HC-SR04)
// ----------------------------------------------------------------------------
float readUltrasonicRawDistance() {
  // Disparo de pulso limpio de 10 microsegundos
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Medición del tiempo en alto del pin ECHO con timeout de seguridad
  const unsigned long durationUs = pulseIn(PIN_ECHO, HIGH, SOUND_TIMEOUT_US);

  if (durationUs == 0) {
    // Si no hubo eco recibido dentro del tiempo límite, devolver distancia máxima
    return CONTAINER_HEIGHT_CM;
  }

  // Velocidad del sonido en aire: ~343 m/s => 0.0343 cm/µs => tiempo ida y vuelta / 2
  const float distanceCm = (durationUs * 0.0343f) / 2.0f;

  if (distanceCm < SENSOR_MIN_DISTANCE_CM) {
    return SENSOR_MIN_DISTANCE_CM;
  }
  if (distanceCm > CONTAINER_HEIGHT_CM) {
    return CONTAINER_HEIGHT_CM;
  }

  return distanceCm;
}

// ----------------------------------------------------------------------------
// Cálculo del Porcentaje de Llenado (0 - 100%)
// ----------------------------------------------------------------------------
int calculateFillPercent(float distanceCm) {
  // A menor distancia al sensor en la parte superior, mayor llenado
  // distanceCm = CONTAINER_HEIGHT_CM (100cm) => 0% lleno
  // distanceCm = SENSOR_MIN_DISTANCE_CM (10cm) => 100% lleno
  const float span = CONTAINER_HEIGHT_CM - SENSOR_MIN_DISTANCE_CM;
  if (span <= 0.0f) return 0;

  float percent = ((CONTAINER_HEIGHT_CM - distanceCm) / span) * 100.0f;

  if (percent < 0.0f) percent = 0.0f;
  if (percent > 100.0f) percent = 100.0f;

  return static_cast<int>(percent + 0.5f); // Redondeo al entero más cercano
}

// ----------------------------------------------------------------------------
// Lectura Segura de Condiciones Ambientales (DHT22)
// ----------------------------------------------------------------------------
void readTemperatureHumidity(float &tempC, float &humidity) {
  const float t = dht.readTemperature();
  const float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println(F("[WARN] Error al leer DHT22. Utilizando lecturas por defecto."));
    tempC = 22.0f;
    humidity = 50.0f;
  } else {
    tempC = t;
    humidity = h;
  }
}

// ----------------------------------------------------------------------------
// Control de Semáforo LED Físico
// ----------------------------------------------------------------------------
void updateStatusLeds(int fillPercent) {
  if (fillPercent >= 85) {
    // Crítico: Solo LED Rojo activo
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (fillPercent >= 60) {
    // Advertencia: Solo LED Amarillo activo
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
  } else {
    // Óptimo: Solo LED Verde activo
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, LOW);
  }
}

// ----------------------------------------------------------------------------
// Mapeo a Texto de Estado Estandarizado EcoPlaza
// ----------------------------------------------------------------------------
const char* resolveStatusText(int fillPercent) {
  if (fillPercent >= 85) return "CRITICAL";
  if (fillPercent >= 60) return "WARNING";
  return "OPTIMAL";
}

// ----------------------------------------------------------------------------
// Serialización y Envío de Telemetría JSON (EcoPlaza Schema)
// ----------------------------------------------------------------------------
void publishTelemetryJson(const TelemetryData &data) {
  StaticJsonDocument<256> doc;

  doc["container_id"]         = CONTAINER_ID;
  doc["fill_level_percent"]   = data.fillLevelPercent;
  doc["distance_cm"]          = serialized(String(data.distanceCm, 1));
  doc["temperature_c"]        = serialized(String(data.temperatureC, 1));
  doc["humidity_percent"]     = serialized(String(data.humidityPercent, 1));
  doc["status"]               = data.status;

  // Imprimir JSON por Serial para ingesta por bridge USB, MQTT o Gateway
  serializeJson(doc, Serial);
  Serial.println();
}

