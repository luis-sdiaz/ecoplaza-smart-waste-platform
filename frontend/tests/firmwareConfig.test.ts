import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function getWorkspaceRoot(): string {
  const current = process.cwd();
  if (fs.existsSync(path.resolve(current, "firmware"))) {
    return current;
  }
  const parent = path.resolve(current, "..");
  if (fs.existsSync(path.resolve(parent, "firmware"))) {
    return parent;
  }
  throw new Error("No fue posible resolver la raíz del workspace para firmware");
}

const rootDir = getWorkspaceRoot();

test("firmware/platformio.ini: existe y define board esp32doit-devkit-v1 y monitor_speed 115200", () => {
  const iniPath = path.join(rootDir, "firmware", "platformio.ini");
  assert.equal(fs.existsSync(iniPath), true, "firmware/platformio.ini debe existir");

  const content = fs.readFileSync(iniPath, "utf-8");
  assert.match(
    content,
    /board\s*=\s*esp32doit-devkit-v1/,
    "platformio.ini debe configurar la placa esp32doit-devkit-v1",
  );
  assert.match(
    content,
    /monitor_speed\s*=\s*115200/,
    "platformio.ini debe configurar monitor_speed en 115200 baudios",
  );
  assert.match(
    content,
    /framework\s*=\s*arduino/,
    "platformio.ini debe usar el framework arduino",
  );
  assert.match(
    content,
    /bblanchon\/ArduinoJson/,
    "platformio.ini debe incluir la librería ArduinoJson",
  );
});

test("firmware/src/main.cpp: define pines físicos correctos TRIGGER_PIN = 5 y ECHO_PIN = 18", () => {
  const mainCppPath = path.join(rootDir, "firmware", "src", "main.cpp");
  assert.equal(fs.existsSync(mainCppPath), true, "firmware/src/main.cpp debe existir");

  const content = fs.readFileSync(mainCppPath, "utf-8");
  assert.match(
    content,
    /TRIGGER_PIN\s*=\s*5\b/,
    "TRIGGER_PIN debe estar asignado a GPIO 5",
  );
  assert.match(
    content,
    /ECHO_PIN\s*=\s*18\b/,
    "ECHO_PIN debe estar asignado a GPIO 18",
  );
});

test("Seguridad de credenciales: tanto firmware/.gitignore como la raíz excluyen config.h", () => {
  const firmwareGitignorePath = path.join(rootDir, "firmware", ".gitignore");
  const rootGitignorePath = path.join(rootDir, ".gitignore");

  assert.equal(
    fs.existsSync(firmwareGitignorePath),
    true,
    "firmware/.gitignore debe existir",
  );
  assert.equal(
    fs.existsSync(rootGitignorePath),
    true,
    ".gitignore en la raíz debe existir",
  );

  const firmwareGitignore = fs.readFileSync(firmwareGitignorePath, "utf-8");
  const rootGitignore = fs.readFileSync(rootGitignorePath, "utf-8");

  assert.match(
    firmwareGitignore,
    /(^|\r?\n)config\.h(\r?\n|$)/,
    "firmware/.gitignore debe excluir config.h",
  );
  assert.match(
    rootGitignore,
    /firmware\/config\.h/,
    ".gitignore raíz debe excluir firmware/config.h",
  );
  assert.match(
    rootGitignore,
    /firmware\/src\/config\.h/,
    ".gitignore raíz debe excluir firmware/src/config.h",
  );
});

test("firmware/flash-esp32.ps1: script de flasheo existe y contiene automatización PlatformIO", () => {
  const scriptPath = path.join(rootDir, "firmware", "flash-esp32.ps1");
  assert.equal(fs.existsSync(scriptPath), true, "firmware/flash-esp32.ps1 debe existir");

  const scriptContent = fs.readFileSync(scriptPath, "utf-8");
  assert.match(
    scriptContent,
    /\$Port\s*=\s*"COM3"/,
    "El script debe definir COM3 como puerto por defecto",
  );
  assert.match(
    scriptContent,
    /pio run --target upload/,
    "El script debe invocar la carga de firmware mediante PlatformIO",
  );
  assert.match(
    scriptContent,
    /pio device monitor/,
    "El script debe iniciar el monitor serial de PlatformIO",
  );
  assert.match(
    scriptContent,
    /pip install platformio/,
    "El script debe sugerir pip install platformio si pio no está en el PATH",
  );
});

