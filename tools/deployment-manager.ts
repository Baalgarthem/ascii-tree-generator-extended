// tools/deployment-manager.ts
// ------------------------------------------------------------
// Deployment Manager – CLI interactivo para gestionar versiones y compilación
// ------------------------------------------------------------
// Este script está pensado para ejecutarse con Node (ts-node o compiled JS).
// Provee un menú interactivo dividido en secciones:
//   1️⃣ Gestión de versiones
//   2️⃣ Compilación del proyecto
//   3️⃣ Publicación (solo prepara, no ejecuta git push automáticamente)
// Cada opción actualiza el archivo `manifest.json` (y `package.json` si existe)
// manteniendo la alineación de versiones, siguiendo las reglas del proyecto
// (sin prefijo «v», solo incremento del último número). Además, llama a
// `npm run build` para generar los artefactos en `dist/`.
// ------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import inquirer from "inquirer";

// ---------- Helpers ----------
/**
 * Lee y parsea un JSON desde un archivo.
 */
function readJson(filePath: string): any {
  const raw = fs.readFileSync(filePath, { encoding: "utf-8" });
  return JSON.parse(raw);
}

/**
 * Escribe un objeto como JSON formateado.
 */
function writeJson(filePath: string, data: any): void {
  const json = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, json, { encoding: "utf-8" });
}

/**
 * Incrementa la versión del último dígito (parche).
 * Si la versión no tiene tres componentes, se añaden los que falten.
 */
function bumpPatchVersion(version: string): string {
  const parts = version.split(".");
  while (parts.length < 3) parts.push("0");
  const patch = parseInt(parts[2] ?? "0", 10) + 1;
  parts[2] = patch.toString();
  return parts.join(".");
}

/**
 * Actualiza manifest.json y, si existe, package.json con la nueva versión.
 */
function updateVersionFiles(newVersion: string, rootDir: string): void {
  const manifestPath = path.join(rootDir, "manifest.json");
  const pkgPath = path.join(rootDir, "package.json");

  const manifest = readJson(manifestPath);
  manifest.version = newVersion;
  writeJson(manifestPath, manifest);

  if (fs.existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    pkg.version = newVersion;
    writeJson(pkgPath, pkg);
  }
}

/**
 * Ejecuta `npm run build` para generar los artefactos en `dist/`.
 */
function runBuild(rootDir: string): void {
  console.log("\n🔧 Ejecutando build (npm run build)...");
  execSync("npm run build", { cwd: rootDir, stdio: "inherit" });
  console.log("✅ Build completado. Los archivos están en la carpeta dist/.");
}

/**
 * Menú principal, dividido en secciones.
 */
async function mainMenu() {
  const rootDir = path.resolve(__dirname, ".."); // raíz del plugin

  const { section } = await inquirer.prompt([
    {
      type: "list",
      name: "section",
      message: "Seleccione la sección de gestión:",
      choices: [
        { name: "📦 Gestión de versiones", value: "version" },
        { name: "⚙️ Compilación del proyecto", value: "build" },
        { name: "🚀 Preparar publicación (tag)", value: "release" },
        { name: "❌ Salir", value: "exit" },
      ],
    },
  ]);

  switch (section) {
    case "version":
      await versionSection(rootDir);
      break;
    case "build":
      runBuild(rootDir);
      break;
    case "release":
      await releaseSection(rootDir);
      break;
    case "exit":
      console.log("👋 Hasta luego.");
      process.exit(0);
  }

  // Después de ejecutar una acción volvemos al menú principal
  await mainMenu();
}

/**
 * Sub‑menú para gestionar versiones.
 */
async function versionSection(rootDir: string) {
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const currentVersion = manifest.version || "0.0.0";

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: `Versión actual: ${currentVersion}. ¿Qué desea hacer?`,
      choices: [
        { name: "🔼 Incrementar parche", value: "bump" },
        { name: "🖊️ Introducir versión manualmente", value: "manual" },
        { name: "↩️ Volver al menú principal", value: "back" },
      ],
    },
  ]);

  if (action === "bump") {
    const newVersion = bumpPatchVersion(currentVersion);
    updateVersionFiles(newVersion, rootDir);
    console.log(`✅ Versión actualizada a ${newVersion}`);
  } else if (action === "manual") {
    const { manualVersion } = await inquirer.prompt([
      {
        type: "input",
        name: "manualVersion",
        message: "Introduce la versión (sin prefijo 'v'):",
        validate: (input) => /^(\d+\.){1,2}\d+$/.test(input) || "Formato de versión inválido",
      },
    ]);
    updateVersionFiles(manualVersion, rootDir);
    console.log(`✅ Versión establecida a ${manualVersion}`);
  }
}

/**
 * Sub‑menú para preparar una publicación (creación de tag).
 * Solo crea la etiqueta usando Git, pero **no hace commit ni push**.
 */
async function releaseSection(rootDir: string) {
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const version = manifest.version;

  console.log(`\n📦 Versión del plugin: ${version}`);
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `¿Crear tag git '${version}'? (No se hará push automáticamente)`,
      default: false,
    },
  ]);

  if (confirm) {
    try {
      execSync(`git tag ${version}`, { cwd: rootDir, stdio: "inherit" });
      console.log(`✅ Tag '${version}' creado.`);
    } catch (e) {
      console.error("⚠️ Error al crear el tag:", e);
    }
  } else {
    console.log("⚡ Acción cancelada por el usuario.");
  }
}

// Ejecutar el menú cuando el script se lanza directamente
if (require.main === module) {
  mainMenu().catch((err) => {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  });
}
