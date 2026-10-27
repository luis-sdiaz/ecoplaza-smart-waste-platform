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
#include <math.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

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
#ifndef CONTAINER_HEIGHT_CM
#define CONTAINER_HEIGHT_CM 100.0f
#endif
#ifndef SENSOR_MIN_DISTANCE_CM
#define SENSOR_MIN_DISTANCE_CM 5.0f
#endif
#ifndef TELEMETRY_PATH
#define TELEMETRY_PATH "/rest/v1/sensor_telemetry"
#endif

// Pines del circuito minimo viable.
constexpr uint8_t TRIGGER_PIN = 5; // D5
constexpr uint8_t ECHO_PIN = 18;   // D18; divisor 1 kOhm / 2 kOhm

// LEDs locales opcionales del montaje existente.
constexpr uint8_t LED_GREEN_PIN = 25;
constexpr uint8_t LED_YELLOW_PIN = 26;
constexpr uint8_t LED_RED_PIN = 27;

constexpr char CONTAINER_ID[] = "CTR-BOG-001";
constexpr uint8_t ULTRASONIC_SAMPLE_COUNT = 5;
constexpr unsigned long ULTRASONIC_SAMPLE_INTERVAL_MS = 40;
constexpr float USB_BATTERY_LEVEL = 100.0f;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;
constexpr unsigned long SOUND_TIMEOUT_US = 30000;
constexpr unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;
constexpr unsigned long HTTP_TIMEOUT_MS = 7000;

struct TelemetryData {
  const char* containerId;
  float fillLevel;
  float batteryLevel;
  const char* status;
};

unsigned long lastTelemetryTimestamp = 0;
unsigned long lastWiFiAttemptTimestamp = 0;

float readUltrasonicDistance(float& rawDistance);
float readUltrasonicSample();
float calculateFillLevel(float distanceCm);
const char* resolveStatus(float fillLevel);
void updateStatusLeds(float fillLevel);
void maintainWiFiConnection();
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
  maintainWiFiConnection();
}

void loop() {
  const unsigned long currentMillis = millis();
  maintainWiFiConnection();

  if (lastTelemetryTimestamp == 0 ||
      currentMillis - lastTelemetryTimestamp >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTimestamp = currentMillis;

    float rawDistance = 0.0f;
    const float filteredDistance = readUltrasonicDistance(rawDistance);
    const float fillLevel = calculateFillLevel(filteredDistance);
    const char* status = resolveStatus(fillLevel);
    updateStatusLeds(fillLevel);

    const TelemetryData telemetry{
        CONTAINER_ID, fillLevel, USB_BATTERY_LEVEL, status};

    Serial.print(F("[INFO] Distancia cruda: "));
    Serial.print(rawDistance, 1);
    Serial.print(F(" cm, distancia filtrada: "));
    Serial.print(filteredDistance, 1);
    Serial.print(F(" cm, porcentaje: "));
    Serial.print(fillLevel, 1);
    Serial.print(F("%, estado: "));
    Serial.println(status);
    publishTelemetry(telemetry);
  }

  yield();
}

float readUltrasonicSample() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  const unsigned long durationUs =
      pulseIn(ECHO_PIN, HIGH, SOUND_TIMEOUT_US);
  if (durationUs == 0) {
    return 0.0f;
  }

  return (durationUs * 0.0343f) / 2.0f;
}

float readUltrasonicDistance(float& rawDistance) {
  float validDistances[ULTRASONIC_SAMPLE_COUNT];
  uint8_t validCount = 0;
  rawDistance = 0.0f;

  for (uint8_t sampleIndex = 0;
       sampleIndex < ULTRASONIC_SAMPLE_COUNT; ++sampleIndex) {
    const float sampleDistance = readUltrasonicSample();
    rawDistance = sampleDistance;

    if (sampleDistance > 0.0f &&
        sampleDistance <= CONTAINER_HEIGHT_CM) {
      validDistances[validCount++] = sampleDistance;
    } else {
      Serial.print(F("[WARN] Lectura ultrasónica inválida: "));
      Serial.print(sampleDistance, 1);
      Serial.println(F(" cm; se descarta"));
    }

    if (sampleIndex + 1 < ULTRASONIC_SAMPLE_COUNT) {
      delay(ULTRASONIC_SAMPLE_INTERVAL_MS);
    }
  }

  if (validCount == 0) {
    Serial.println(F("[ERROR] Sin lecturas ultrasónicas válidas; se usa distancia de contenedor vacío"));
    return CONTAINER_HEIGHT_CM;
  }

  for (uint8_t i = 1; i < validCount; ++i) {
    const float value = validDistances[i];
    int8_t j = static_cast<int8_t>(i) - 1;
    while (j >= 0 && validDistances[j] > value) {
      validDistances[j + 1] = validDistances[j];
      --j;
    }
    validDistances[j + 1] = value;
  }

  if (validCount % 2 == 1) {
    return validDistances[validCount / 2];
  }
  return (validDistances[validCount / 2 - 1] +
          validDistances[validCount / 2]) /
         2.0f;
}

float calculateFillLevel(float distanceCm) {
  const float span = CONTAINER_HEIGHT_CM - SENSOR_MIN_DISTANCE_CM;
  if (span <= 0.0f) {
    return 0.0f;
  }

  const float unclampedFillLevel =
      ((CONTAINER_HEIGHT_CM - distanceCm) / span) * 100.0f;
  const float clampedFillLevel =
      constrain(unclampedFillLevel, 0.0f, 100.0f);
  return roundf(clampedFillLevel * 10.0f) / 10.0f;
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

void maintainWiFiConnection() {
  static bool connectionReported = false;

  if (strlen(WIFI_SSID) == 0) {
    Serial.println(F("[WARN] WIFI_SSID no configurado; se omite WiFi"));
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    if (!connectionReported) {
      Serial.print(F("[INFO] WiFi conectado: "));
      Serial.println(WiFi.localIP());
      connectionReported = true;
    }
    return;
  }

  connectionReported = false;
  const unsigned long currentMillis = millis();
  if (lastWiFiAttemptTimestamp != 0 &&
      currentMillis - lastWiFiAttemptTimestamp <
          WIFI_RECONNECT_INTERVAL_MS) {
    return;
  }

  lastWiFiAttemptTimestamp = currentMillis;
  Serial.println(F("[INFO] Iniciando (re)conexion WiFi"));
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
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

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  const String endpoint = String(SUPABASE_URL) + TELEMETRY_PATH;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, endpoint)) {
    Serial.println(F("[ERROR] No se pudo inicializar la conexion HTTP"));
    return false;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization",
                 String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  const int responseCode = http.POST(payload);
  const String responseBody = http.getString();
  if (responseCode == HTTP_CODE_OK || responseCode == HTTP_CODE_CREATED ||
      responseCode == HTTP_CODE_NO_CONTENT) {
    Serial.printf("[INFO] Telemetria enviada (HTTP %d)\n", responseCode);
    http.end();
    return true;
  }

  if (responseCode < 0) {
    Serial.printf("[ERROR] Fallo HTTPS (HTTP %d): %s; cuerpo: %s\n",
                  responseCode, http.errorToString(responseCode).c_str(),
                  responseBody.c_str());
  } else {
    Serial.printf("[ERROR] Supabase rechazo la telemetria (HTTP %d), cuerpo: %s\n",
                  responseCode, responseBody.c_str());
  }
  http.end();
  return false;
}
