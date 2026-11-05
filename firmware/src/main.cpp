/**
 * EcoPlaza - Firmware ESP32 para telemetría de contenedor.
 *
 * Hardware mínimo viable:
 *   HC-SR04 TRIGGER: GPIO 5 (D5)
 *   HC-SR04 ECHO:    GPIO 18 (D18), protegido por divisor 1 kOhm / 2 kOhm
 *   LEDs de Estado:  Verde (GPIO 25), Amarillo (GPIO 26), Rojo (GPIO 27)
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

// Pines del circuito físico verificado.
constexpr uint8_t TRIGGER_PIN = 5; // D5
constexpr uint8_t ECHO_PIN = 18;   // D18; divisor 1 kOhm / 2 kOhm

// LEDs locales opcionales del montaje físico.
constexpr uint8_t LED_GREEN_PIN = 25;
constexpr uint8_t LED_YELLOW_PIN = 26;
constexpr uint8_t LED_RED_PIN = 27;

constexpr char CONTAINER_ID[] = "CTR-BOG-001";
constexpr uint8_t ULTRASONIC_SAMPLE_COUNT = 5;
constexpr unsigned long ULTRASONIC_SAMPLE_INTERVAL_MS = 40;
constexpr float USB_BATTERY_LEVEL = 100.0f;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;
constexpr unsigned long SOUND_TIMEOUT_US = 30000;

// Tiempos prudenciales para sincronización Wi-Fi en routers de doble banda (2.4 / 5 GHz)
constexpr unsigned long WIFI_INITIAL_TIMEOUT_MS = 15000;    // 15 segundos de espera inicial en setup
constexpr unsigned long WIFI_RECONNECT_INTERVAL_MS = 15000; // 15 segundos entre intentos periódicos de reconexión
constexpr unsigned long HTTP_TIMEOUT_MS = 10000;

struct TelemetryData {
  const char* containerId;
  float distanceCm;
  float fillPercentage;
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
const char* wifiStatusToString(wl_status_t status);
void initWiFi();
void maintainWiFiConnection();
bool publishTelemetry(const TelemetryData& telemetry);

/**
 * Traduce los códigos numéricos de WiFi.status() a diagnósticos descriptivos legibles.
 */
const char* wifiStatusToString(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS:
      return "WL_IDLE_STATUS (0: Inactivo / Negociando enlace)";
    case WL_NO_SSID_AVAIL:
      return "WL_NO_SSID_AVAIL (1: Red no encontrada - Verifique si el SSID es 2.4 GHz)";
    case WL_SCAN_COMPLETED:
      return "WL_SCAN_COMPLETED (2: Escaneo de redes finalizado)";
    case WL_CONNECTED:
      return "WL_CONNECTED (3: Conectado con IP asignada por DHCP)";
    case WL_CONNECT_FAILED:
      return "WL_CONNECT_FAILED (4: Fallo de autenticacion - Verifique contrasena)";
    case WL_CONNECTION_LOST:
      return "WL_CONNECTION_LOST (5: Enlace perdido con el punto de acceso)";
    case WL_DISCONNECTED:
      return "WL_DISCONNECTED (6: Desconectado / En espera de conexion)";
    default:
      return "ESTADO_DESCONOCIDO";
  }
}

/**
 * Inicialización controlada de Wi-Fi en setup() con tiempo de espera prudencial de 15s.
 */
void initWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  if (strlen(WIFI_SSID) == 0) {
    Serial.println(F("[WARN] WIFI_SSID no configurado en config.h; se omite conexion Wi-Fi."));
    Serial.println(F("[AYUDA] Configure SSID y contrasena en firmware/src/config.h para transmitir telemetria."));
    return;
  }

  Serial.println();
  Serial.print(F("[INFO] Conectando a red Wi-Fi: \""));
  Serial.print(WIFI_SSID);
  Serial.println(F("\" (Requiere banda 2.4 GHz)..."));

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startAttempt = millis();
  unsigned long lastDot = 0;

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startAttempt < WIFI_INITIAL_TIMEOUT_MS) {
    if (millis() - lastDot >= 500) {
      Serial.print(F("."));
      lastDot = millis();
    }
    delay(50);
    yield();
  }
  Serial.println();

  const wl_status_t finalStatus = WiFi.status();
  lastWiFiAttemptTimestamp = millis();

  if (finalStatus == WL_CONNECTED) {
    Serial.println(F("[INFO] Wi-Fi conectado exitosamente!"));
    Serial.print(F("[INFO] IP asignada: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[INFO] Intensidad de senal (RSSI): "));
    Serial.print(WiFi.RSSI());
    Serial.print(F(" dBm | Canal: "));
    Serial.println(WiFi.channel());
  } else {
    Serial.print(F("[WARN] Tiempo de espera agotado (15s). Estado de conexion: ["));
    Serial.print(finalStatus);
    Serial.print(F("] "));
    Serial.println(wifiStatusToString(finalStatus));
    Serial.println(F("[DIAG] NOTA TECNICA: El ESP32 opera exclusivamente en la banda de 2.4 GHz (802.11 b/g/n)."));
    Serial.println(F("[DIAG] Si su router tiene doble banda unificada (Band Steering), configure un SSID exclusivo para 2.4 GHz."));
    Serial.println(F("[INFO] El sensor continuara operando y reintentara la conexion periodicamente en segundo plano."));
  }
}

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

  initWiFi();
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
        CONTAINER_ID, filteredDistance, fillLevel, USB_BATTERY_LEVEL, status};

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
      Serial.print(F("[WARN] Lectura ultrasonica invalida: "));
      Serial.print(sampleDistance, 1);
      Serial.println(F(" cm; se descarta"));
    }

    if (sampleIndex + 1 < ULTRASONIC_SAMPLE_COUNT) {
      delay(ULTRASONIC_SAMPLE_INTERVAL_MS);
    }
  }

  if (validCount == 0) {
    Serial.println(F("[ERROR] Sin lecturas ultrasonicas validas; se usa distancia de contenedor vacio"));
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

/**
 * Mantenimiento resiliente y no bloqueante de la conexión Wi-Fi en loop().
 * Permite que los routers negocien DHCP sin interrupciones abruptas por reconexiones aceleradas.
 */
void maintainWiFiConnection() {
  static bool connectionReported = false;

  if (strlen(WIFI_SSID) == 0) {
    return;
  }

  const wl_status_t currentStatus = WiFi.status();

  if (currentStatus == WL_CONNECTED) {
    if (!connectionReported) {
      Serial.println();
      Serial.print(F("[INFO] Wi-Fi reconectado exitosamente: "));
      Serial.print(WiFi.localIP());
      Serial.print(F(" | RSSI: "));
      Serial.print(WiFi.RSSI());
      Serial.println(F(" dBm"));
      connectionReported = true;
    }
    return;
  }

  // Notificar transición de conectado a desconectado
  if (connectionReported) {
    Serial.println();
    Serial.println(F("[WARN] Enlace Wi-Fi perdido. Entrando a modo de reconexion periodica..."));
    connectionReported = false;
  }

  const unsigned long currentMillis = millis();
  if (lastWiFiAttemptTimestamp != 0 &&
      currentMillis - lastWiFiAttemptTimestamp < WIFI_RECONNECT_INTERVAL_MS) {
    return;
  }

  lastWiFiAttemptTimestamp = currentMillis;

  Serial.println();
  Serial.print(F("[INFO] Reintentando asociacion Wi-Fi a: \""));
  Serial.print(WIFI_SSID);
  Serial.println(F("\""));
  Serial.print(F("[DIAG] Diagnostico de estado previo: ["));
  Serial.print(currentStatus);
  Serial.print(F("] "));
  Serial.println(wifiStatusToString(currentStatus));

  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool publishTelemetry(const TelemetryData& telemetry) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WARN] Sin conexion Wi-Fi activa; telemetria no enviada a Supabase"));
    return false;
  }
  if (strlen(SUPABASE_URL) == 0 || strlen(SUPABASE_ANON_KEY) == 0) {
    Serial.println(F("[ERROR] SUPABASE_URL o SUPABASE_ANON_KEY no configurado"));
    return false;
  }

  if (strstr(SUPABASE_URL, "tu-proyecto") != nullptr ||
      strstr(SUPABASE_ANON_KEY, "tu-") != nullptr) {
    Serial.println(F("[ERROR] SUPABASE_URL o SUPABASE_ANON_KEY contiene valores de plantilla (config.example.h)."));
    Serial.println(F("[AYUDA] Configure su URL y clave anonima reales en firmware/src/config.h"));
    return false;
  }

  // Normalización de la URL base y de la ruta del endpoint
  String baseUrl = String(SUPABASE_URL);
  baseUrl.trim();
  while (baseUrl.endsWith("/")) {
    baseUrl.remove(baseUrl.length() - 1);
  }
  String path = String(TELEMETRY_PATH);
  path.trim();
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  const String endpoint = baseUrl + path;

  // Verificación previa de resolución DNS del host para diagnósticos rápidos
  String host = baseUrl;
  if (host.startsWith("https://")) {
    host.remove(0, 8);
  } else if (host.startsWith("http://")) {
    host.remove(0, 7);
  }
  const int slashIdx = host.indexOf('/');
  if (slashIdx >= 0) {
    host.remove(slashIdx);
  }

  IPAddress resolvedIp;
  if (!WiFi.hostByName(host.c_str(), resolvedIp)) {
    Serial.printf("[ERROR] Fallo de resolucion DNS para host: %s\n", host.c_str());
    Serial.println(F("[AYUDA] Verifique la conexion a Internet y que SUPABASE_URL en config.h sea valida."));
    return false;
  }

  // Documento JSON correspondiente a la tabla public.sensor_telemetry
  JsonDocument document;
  document["container_id"] = telemetry.containerId;
  document["distance_cm"] = roundf(telemetry.distanceCm * 100.0f) / 100.0f;
  document["fill_percentage"] = roundf(telemetry.fillPercentage * 100.0f) / 100.0f;

  String payload;
  serializeJson(document, payload);

  // Cliente TLS seguro con bypass de verificación CA para endpoints de Supabase
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(static_cast<uint32_t>(HTTP_TIMEOUT_MS / 1000));
  client.setHandshakeTimeout(static_cast<uint32_t>(HTTP_TIMEOUT_MS / 1000));

  HTTPClient http;
  http.setConnectTimeout(static_cast<int32_t>(HTTP_TIMEOUT_MS));
  http.setTimeout(static_cast<uint16_t>(HTTP_TIMEOUT_MS));
  http.setReuse(false);

  if (!http.begin(client, endpoint)) {
    Serial.println(F("[ERROR] No se pudo inicializar la conexion HTTPS"));
    client.stop();
    return false;
  }

  // Cabeceras estándar requeridas por la API REST de Supabase (PostgREST)
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization",
                 String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  const int responseCode = http.POST(payload);
  const String responseBody = http.getString();

  bool success = false;
  if (responseCode == HTTP_CODE_OK || responseCode == HTTP_CODE_CREATED ||
      responseCode == HTTP_CODE_NO_CONTENT) {
    Serial.printf("[INFO] Telemetria enviada exitosamente a Supabase (HTTP %d)\n", responseCode);
    success = true;
  } else if (responseCode < 0) {
    Serial.printf("[ERROR] Fallo HTTPS (HTTP %d): %s; cuerpo: %s\n",
                  responseCode, http.errorToString(responseCode).c_str(),
                  responseBody.c_str());
  } else {
    Serial.printf("[ERROR] Supabase rechazo la telemetria (HTTP %d), cuerpo: %s\n",
                  responseCode, responseBody.c_str());
  }

  http.end();
  client.stop();
  return success;
}
