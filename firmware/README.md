# EcoPlaza — Firmware IoT para Monitoreo de Contenedores (ESP32)

Este directorio contiene el código fuente y las especificaciones de hardware para el nodo de telemetría IoT de los contenedores inteligentes de **EcoPlaza**, basado en el microcontrolador **ESP32-WROOM-32**.

---

## 1. Arquitectura de Hardware y Sensores

Cada contenedor inteligente dispone de una unidad IoT encargada de medir el nivel volumétrico de llenado, supervisar la temperatura y humedad interna, emitir alertas visuales mediante un semáforo LED local y transmitir telemetría periódica hacia la plataforma.

### Componentes Utilizados

| Componente | Modelo / Referencia | Función en el Contenedor |
| :--- | :--- | :--- |
| **Microcontrolador** | ESP32 NodeMCU (ESP-WROOM-32, 38 o 30 pines) | Procesamiento y emisión de telemetría |
| **Sensor de Distancia** | HC-SR04 (Ultrasónico) | Medición de altura libre y cálculo de llenado % |
| **Sensor Ambiental** | DHT22 (AM2302) | Supervisión de temperatura y humedad |
| **Semáforo LED** | 3 LEDs (Verde, Amarillo, Rojo) de 5 mm | Indicación visual del estado del contenedor |
| **Resistencias de LEDs** | 3 x 220 Ω (1/4 W) | Limitación de corriente para los LEDs |
| **Divisor de Tensión** | 1 x 1 kΩ + 1 x 2 kΩ (1/4 W) | **Protección del pin ECHO (conversión de 5 V a 3.3 V)** |

---

## 2. Mapa de Conexiones y Pines GPIO

| Módulo / Periférico | Pin del Módulo | Pin del ESP32 | Nivel de Voltaje | Observaciones |
| :--- | :--- | :--- | :--- | :--- |
| **HC-SR04** | VCC | 5V / VIN | 5.0 V | Alimentación recomendada a 5V para precisión |
| **HC-SR04** | GND | GND | 0 V | Masa común |
| **HC-SR04** | TRIG | **GPIO 5** | 3.3 V | Salida digital ESP32 |
| **HC-SR04** | ECHO | **GPIO 18** | **3.3 V** | **Requiere divisor resistivo (ver advertencia)** |
| **DHT22** | VCC | 3V3 o 5V | 3.3 V / 5.0 V | Alimentación del sensor |
| **DHT22** | DATA | **GPIO 4** | 3.3 V | Entrada digital con pull-up interna |
| **DHT22** | GND | GND | 0 V | Masa común |
| **LED Verde** | Ánodo (+) | **GPIO 25** | 3.3 V | En serie con resistencia de 220 Ω (< 60% llenado) |
| **LED Amarillo** | Ánodo (+) | **GPIO 26** | 3.3 V | En serie con resistencia de 220 Ω (60% - 84% llenado) |
| **LED Rojo** | Ánodo (+) | **GPIO 27** | 3.3 V | En serie con resistencia de 220 Ω (>= 85% crítico) |
| **LEDs (Cátodos)** | Cátodos (-) | GND | 0 V | Retorno a masa |

---

## 3. Circuito Divisor de Tensión para el Pin ECHO (Protección 5V -> 3.3V)

> [!WARNING]
> **El sensor HC-SR04 emite su pulso ECHO a 5.0 V.**
> Los pines GPIO del ESP32 toleran un voltaje máximo de **3.3 V**. Conectar el pin ECHO directamente al GPIO 18 puede dañar irreversiblemente el microcontrolador.

### Diagrama del Divisor Resistivo

```text
Pin ECHO (HC-SR04, 5V)
         │
         ├─── [ 1 kΩ ] ───┬───> Pin GPIO 18 (ESP32, ~3.33 V)
                          │
                      [ 2 kΩ ]
                          │
                         GND (Masa común)
```

$$\text{V}_{\text{out}} = 5\,\text{V} \times \frac{2\,\text{k}\Omega}{1\,\text{k}\Omega + 2\,\text{k}\Omega} = 5\,\text{V} \times 0.666 = 3.33\,\text{V}$$

---

## 4. Umbrales del Semáforo Físico

El contenedor actualiza automáticamente los LEDs locales según el cálculo porcentual de volumen ocupado:

- **Verde (< 60%):** Estado óptimo (`OPTIMAL`). Contenedor con capacidad disponible.
- **Amarillo (60% - 84%):** Advertencia (`WARNING`). Contenedor próximo a saturarse; programar recolección.
- **Rojo (>= 85%):** Nivel crítico (`CRITICAL`). Contenedor desbordado o prioritario para recolección inmediata.

---

## 5. Formato del Paquete JSON de Telemetría

El microcontrolador emite por el puerto serial (115200 baudios) cadenas JSON estructuradas con el siguiente esquema:

```json
{
  "container_id": "CTR-BOG-001",
  "fill_level_percent": 78,
  "distance_cm": 29.8,
  "temperature_c": 21.4,
  "humidity_percent": 54.2,
  "status": "WARNING"
}
```

Este paquete es consumible directamente por el simulador de telemetría de EcoPlaza, gateways MQTT o puentes Serial-to-Supabase.

---

## 6. Dependencias de Librerías

Para compilar el proyecto en **Arduino IDE** o **PlatformIO**, instala las siguientes librerías:

1. **DHT sensor library** (por Adafruit) — Versión 1.4.x
2. **Adafruit Unified Sensor** (por Adafruit) — Versión 1.1.x
3. **ArduinoJson** (por Benoît Blanchon) — Versión 6.x o 7.x

---

## 7. Instrucciones de Compilación y Carga

### Opción A: Con PlatformIO (VS Code)

Crea un archivo `platformio.ini` en la raíz de `firmware/`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
    adafruit/DHT sensor library @ ^1.4.6
    adafruit/Adafruit Unified Sensor @ ^1.1.14
    bblanchon/ArduinoJson @ ^7.0.4
```

Ejecuta en la terminal de PlatformIO:
```bash
pio run --target upload
pio device monitor
```

### Opción B: Con Arduino IDE 2.x

1. Instala el paquete de placas **ESP32 by Espressif Systems** desde el *Boards Manager*.
2. Selecciona la placa **ESP32 Dev Module**.
3. Abre el archivo `firmware/src/main.cpp` (puedes renombrarlo a `main.ino` si tu entorno lo requiere).
4. Selecciona el puerto COM correspondiente a tu placa ESP32.
5. Haz clic en **Subir (Upload)**.
6. Abre el **Monitor Serie (Serial Monitor)** a **115200 baudios**.

