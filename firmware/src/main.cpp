/**
 * EcoPlaza - Firmware ESP32 para telemetria de contenedor.
 *
 * Hardware minimo viable:
 *   HC-SR04 TRIGGER: GPIO 5 (D5)
 *   HC-SR04 ECHO:    GPIO 18 (D18), protegido por divisor 1 kOhm / 2 kOhm
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#if __has_include("config.h")
#include "config.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif
#ifndef SUPABASE_URL
#define SUPABASE_URL ""
#endif
#ifndef SUPABASE_ANON_KEY
#define SUPABASE_ANON_KEY ""
#endif

// Pines del circuito minimo viable.
constexpr uint8_t TRIGGER_PIN = 5; // D5
constexpr uint8_t ECHO_PIN = 18;   // D18; divisor 1 kOhm / 2 kOhm

// LEDs locales opcionales del montaje existente.
constexpr uint8_t LED_GREEN_PIN = 25;
constexpr uint8_t LED_YELLOW_PIN = 26;
constexpr uint8_t LED_RED_PIN = 27;

constexpr char CONTAINER_ID[] = "CTR-BOG-001";
constexpr float CONTAINER_HEIGHT_CM = 100.0f;
constexpr float SENSOR_MIN_DISTANCE_CM = 10.0f;
constexpr float USB_BATTERY_LEVEL = 100.0f;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;
constexpr unsigned long SOUND_TIMEOUT_US = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 20000;
constexpr char TELEMETRY_PATH[] = "/rest/v1/telemetry";

struct TelemetryData {
  const char* containerId;
  float fillLevel;
  float batteryLevel;
  const char* status;
};

unsigned long lastTelemetryTimestamp = 0;

float readUltrasonicDistance();
float calculateFillLevel(float distanceCm);
const char* resolveStatus(float fillLevel);
void updateStatusLeds(float fillLevel);
void connectToWiFi();
bool publishTelemetry(const TelemetryData& telemetry);

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIGGER_PIN, LOW);

  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  updateStatusLeds(0.0f);

  Serial.println();
  Serial.println(F("[INFO] EcoPlaza ESP32 iniciado"));
  Serial.print(F("[INFO] Container: "));
  Serial.println(CONTAINER_ID);
  connectToWiFi();
}

void loop() {
  const unsigned long currentMillis = millis();
  if (lastTelemetryTimestamp == 0 ||
      currentMillis - lastTelemetryTimestamp >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTimestamp = currentMillis;

    const float distanceCm = readUltrasonicDistance();
    const float fillLevel = calculateFillLevel(distanceCm);
    const char* status = resolveStatus(fillLevel);
    updateStatusLeds(fillLevel);

    const TelemetryData telemetry{
        CONTAINER_ID, fillLevel, USB_BATTERY_LEVEL, status};

    Serial.print(F("[INFO] Nivel: "));
    Serial.print(fillLevel, 1);
    Serial.print(F("%, estado: "));
    Serial.println(status);
    publishTelemetry(telemetry);
  }

  yield();
}

float readUltrasonicDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  const unsigned long durationUs =
      pulseIn(ECHO_PIN, HIGH, SOUND_TIMEOUT_US);
  if (durationUs == 0) {
    return CONTAINER_HEIGHT_CM;
  }

  const float distanceCm = (durationUs * 0.0343f) / 2.0f;
  return constrain(distanceCm, SENSOR_MIN_DISTANCE_CM,
                   CONTAINER_HEIGHT_CM);
}

float calculateFillLevel(float distanceCm) {
  const float span = CONTAINER_HEIGHT_CM - SENSOR_MIN_DISTANCE_CM;
  if (span <= 0.0f) {
    return 0.0f;
  }

  const float fillLevel =
      ((CONTAINER_HEIGHT_CM - distanceCm) / span) * 100.0f;
  return constrain(fillLevel, 0.0f, 100.0f);
}

const char* resolveStatus(float fillLevel) {
  if (fillLevel >= 90.0f) {
    return "critical";
  }
  if (fillLevel >= 75.0f) {
    return "warning";
  }
  return "normal";
}

void updateStatusLeds(float fillLevel) {
  digitalWrite(LED_GREEN_PIN, fillLevel < 75.0f ? HIGH : LOW);
  digitalWrite(LED_YELLOW_PIN,
               fillLevel >= 75.0f && fillLevel < 90.0f ? HIGH : LOW);
  digitalWrite(LED_RED_PIN, fillLevel >= 90.0f ? HIGH : LOW);
}

void connectToWiFi() {
  if (strlen(WIFI_SSID) == 0) {
    Serial.println(F("[WARN] WIFI_SSID no configurado; se omite WiFi"));
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print(F("[INFO] Conectando a WiFi"));
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[INFO] WiFi conectado: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("[ERROR] No se pudo conectar a WiFi"));
  }
}

bool publishTelemetry(const TelemetryData& telemetry) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WARN] Sin WiFi; telemetria no enviada"));
    return false;
  }
  if (strlen(SUPABASE_URL) == 0 || strlen(SUPABASE_ANON_KEY) == 0) {
    Serial.println(F("[ERROR] SUPABASE_URL o SUPABASE_ANON_KEY no configurado"));
    return false;
  }

  StaticJsonDocument<192> document;
  document["container_id"] = telemetry.containerId;
  document["fill_level"] = telemetry.fillLevel;
  document["battery_level"] = telemetry.batteryLevel;
  document["status"] = telemetry.status;

  String payload;
  serializeJson(document, payload);

  HTTPClient http;
  const String endpoint = String(SUPABASE_URL) + TELEMETRY_PATH;
  if (!http.begin(endpoint)) {
    Serial.println(F("[ERROR] No se pudo inicializar la conexion HTTP"));
    return false;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization",
                 String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");

  const int responseCode = http.POST(payload);
  if (responseCode >= 200 && responseCode < 300) {
    Serial.printf("[INFO] Telemetria enviada (HTTP %d)\n", responseCode);
    http.end();
    return true;
  }

  Serial.printf("[ERROR] Supabase rechazo la telemetria (HTTP %d): %s\n",
                responseCode, http.errorToString(responseCode).c_str());
  http.end();
  return false;
}
