// tools/release-manual.mjs
// ------------------------------------------------------------
// Release manual – versión pedagógica y Clean Code (español)
// ------------------------------------------------------------
// Este script muestra, paso a paso, el proceso de publicación de una nueva
// versión del plugin. Se invoca mediante los npm scripts creados en
// package.json:
//   npm run release-patch-manual   → node tools/release-manual.mjs patch
//   npm run release-minor-manual   → node tools/release-manual.mjs minor
//   npm run release-major-manual   → node tools/release-manual.mjs major
//
// Flujo de trabajo (orden probado para evitar "Git working directory not clean"):
//   1️⃣ Incremento de versión (npm version) – crea commit y tag.
//   2️⃣ Compilación del proyecto (esbuild) – genera los artefactos en dist/.
//   3️⃣ Stage de *todos* los archivos modificados (incluye dist/).
//
// No se realiza "git push" automáticamente; el usuario puede empujar manualmente.

import { execSync } from "child_process";

/**
 * Ejecuta un comando del sistema y muestra una descripción clara.
 * @param {string} cmd          Comando a ejecutar.
 * @param {string} descripcion  Texto explicativo que se mostrará antes del comando.
 */
function ejecutar(cmd, descripcion) {
  console.log(`\n=== ${descripcion} ===`);
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

/**
 * Punto de entrada del script.
 * Lee el nivel de versión (patch, minor, major) y ejecuta los pasos en el orden correcto.
 */
function principal() {
  const nivel = process.argv[2];
  const nivelesValidos = ["patch", "minor", "major"];

  if (!nivel || !nivelesValidos.includes(nivel)) {
    console.error("Uso: node tools/release-manual.mjs <patch|minor|major>");
    process.exit(1);
  }

  // 1️⃣ Incremento de versión (actualiza package.json sin commit ni tag)
  const mensaje = `liberación(${nivel}): actualizar versión y generar artefactos`;
  ejecutar(`npm version ${nivel} --no-git-tag-version -m "${mensaje}"`, "Incremento de versión sin commit ni tag");

  // 2️⃣ Compilación del proyecto (modo producción)
  ejecutar(`npm run build`, "Compilación (build) del plugin");

  // 3️⃣ Stage de todos los cambios (incluye dist/ y package.json actualizado)
  ejecutar(`git add -A`, "Stage de todos los archivos modificados (incluye dist/ y package.json)");

  // 4️⃣ Commit manual con mensaje descriptivo
  ejecutar(`git commit -m "${mensaje}"`, "Commit de los cambios de versionado y build");

  // 5️⃣ Creación del tag con la nueva versión
  const nuevaVersion = JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version;
  ejecutar(`git tag ${nuevaVersion}`, "Creación del tag de versión");

  console.log("\n=== Release manual completado ===");
  const etiqueta = execSync('git describe --tags --abbrev=0').toString().trim();
  console.log(`Versión actual (último tag): ${etiqueta}`);
  console.log("Recuerda: el commit y el tag ya están creados; si deseas subirlos, ejecuta 'git push && git push --tags'.");
}

principal();
