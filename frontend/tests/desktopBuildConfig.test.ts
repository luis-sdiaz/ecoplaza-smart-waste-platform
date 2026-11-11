import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function getWorkspaceRoot(): string {
  const current = process.cwd();
  if (
    fs.existsSync(path.resolve(current, "frontend")) &&
    fs.existsSync(path.resolve(current, "build-windows-installer.ps1"))
  ) {
    return current;
  }
  const parent = path.resolve(current, "..");
  if (
    fs.existsSync(path.resolve(parent, "frontend")) &&
    fs.existsSync(path.resolve(parent, "build-windows-installer.ps1"))
  ) {
    return parent;
  }
  return parent;
}

const rootDir = getWorkspaceRoot();
const frontendDir = path.join(rootDir, "frontend");

test("tauri.conf.json: valida configuración de empaquetado desktop y build", () => {
  const tauriConfPath = path.join(
    frontendDir,
    "src-tauri",
    "tauri.conf.json",
  );
  assert.equal(
    fs.existsSync(tauriConfPath),
    true,
    "frontend/src-tauri/tauri.conf.json debe existir",
  );

  const rawConfig = fs.readFileSync(tauriConfPath, "utf-8");
  const config = JSON.parse(rawConfig);

  // Valida productName (incluye o es "EcoPlaza")
  assert.ok(
    typeof config.productName === "string" &&
      config.productName.includes("EcoPlaza"),
    'productName debe contener "EcoPlaza"',
  );

  // El identificador no debe terminar en `.app`, porque macOS lo interpreta
  // como un sufijo reservado para bundles de aplicaciones.
  assert.equal(config.identifier, "com.ecoplaza.smartwaste");

  // Valida beforeBuildCommand
  assert.equal(
    config.build?.beforeBuildCommand,
    "npm run build",
    'beforeBuildCommand debe ser "npm run build"',
  );
});

test("frontend/package.json: define los scripts de empaquetado desktop:dev y desktop:build", () => {
  const packageJsonPath = path.join(frontendDir, "package.json");
  assert.equal(
    fs.existsSync(packageJsonPath),
    true,
    "frontend/package.json debe existir",
  );

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  assert.ok(pkg.scripts, "package.json debe tener un objeto 'scripts'");

  assert.equal(
    pkg.scripts["desktop:dev"],
    "tauri dev",
    "desktop:dev debe invocar 'tauri dev'",
  );
  assert.equal(
    pkg.scripts["desktop:build"],
    "tauri build",
    "desktop:build debe invocar 'tauri build'",
  );
});

test("build-windows-installer.ps1: existe en la raíz y automatiza el ciclo de calidad y build", () => {
  const scriptPath = path.join(rootDir, "build-windows-installer.ps1");
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    "build-windows-installer.ps1 debe existir en la raíz del proyecto",
  );

  const content = fs.readFileSync(scriptPath, "utf-8");

  // Verificación de compilación del frontend
  assert.match(
    content,
    /npm\s+--prefix\s+frontend\s+run\s+build/,
    "El script debe compilar el frontend con npm run build",
  );

  // Verificación de linter
  assert.match(
    content,
    /npm\s+--prefix\s+frontend\s+run\s+lint/,
    "El script debe ejecutar eslint con npm run lint",
  );

  // Verificación de suite de pruebas
  assert.match(
    content,
    /npm\s+--prefix\s+frontend\s+test\s+--\s+--run/,
    "El script debe ejecutar la suite de pruebas completa con npm test -- --run",
  );

  // Verificación de build desktop
  assert.match(
    content,
    /npm\s+--prefix\s+frontend\s+run\s+desktop:build/,
    "El script debe compilar el release desktop con npm run desktop:build",
  );

  // Verificación de rutas de salida
  assert.match(
    content,
    /EcoPlaza\.exe/,
    "El script debe documentar la ruta de salida del ejecutable EcoPlaza.exe",
  );
  assert.match(
    content,
    /bundle[\\/]msi/,
    "El script debe documentar la ruta del instalador MSI",
  );
  assert.match(
    content,
    /bundle[\\/]nsis/,
    "El script debe documentar la ruta del instalador NSIS",
  );
});

