// Copia este archivo como config.h y completa los valores antes de cargar
// el firmware. No subas config.h al repositorio: contiene credenciales.

#define WIFI_SSID "tu-red-wifi"
#define WIFI_PASSWORD "tu-password-wifi"

// URL base del proyecto Supabase, sin la ruta /rest/v1.
#define SUPABASE_URL "https://tu-proyecto.supabase.co"
#define SUPABASE_ANON_KEY "tu-clave-anon"

// Tabla REST usada por frontend/src/services/sensorService.ts.
#define TELEMETRY_PATH "/rest/v1/sensor_telemetry"

// Calibracion del contenedor (centimetros). Si no se definen, main.cpp usa
// 100.0 cm y 5.0 cm respectivamente.
// #define CONTAINER_HEIGHT_CM 100.0f
// #define SENSOR_MIN_DISTANCE_CM 5.0f
