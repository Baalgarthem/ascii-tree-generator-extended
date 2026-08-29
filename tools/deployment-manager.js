#!/usr/bin/env node
// tools/deployment-manager.js
// ------------------------------------------------------------
// Simple deployment manager with an interactive console menu.
// No external dependencies – uses only Node core modules.
// ------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ---------- Helpers ----------
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}
function bumpPatchVersion(version) {
  const parts = version.split('.');
  while (parts.length < 3) parts.push('0');
  const patch = (parseInt(parts[2] || '0', 10) + 1).toString();
  parts[2] = patch;
  return parts.join('.');
}
function getRootDir() {
  // The script lives in <plugin>/tools, so the root is one level up.
  return path.resolve(__dirname, '..');
}
function updateVersion(newVersion) {
  const root = getRootDir();
  const manifestPath = path.join(root, 'manifest.json');
  const pkgPath = path.join(root, 'package.json');
  const manifest = readJson(manifestPath);
  manifest.version = newVersion;
  writeJson(manifestPath, manifest);
  if (fs.existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    pkg.version = newVersion;
    writeJson(pkgPath, pkg);
  }
  console.log(`✅ Versión actualizada a ${newVersion}`);
}
function runBuild() {
  const root = getRootDir();
  console.log('\n🔧 Ejecutando build (npm run build)...');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
  console.log('✅ Build completado. Los artefactos están en la carpeta dist/.');
}
function createTag() {
  const root = getRootDir();
  const manifest = readJson(path.join(root, 'manifest.json'));
  const version = manifest.version;
  console.log(`\n📦 Creando tag git '${version}'`);
  try {
    execSync(`git tag ${version}`, { cwd: root, stdio: 'inherit' });
    console.log(`✅ Tag '${version}' creado.`);
  } catch (e) {
    console.error('⚠️ Error al crear el tag:', e.message);
  }
}

// ---------- Interactive menu ----------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

async function versionMenu() {
  const root = getRootDir();
  const manifest = readJson(path.join(root, 'manifest.json'));
  const current = manifest.version || '0.0.0';
  console.log(`\nVersión actual: ${current}`);
  console.log('1) Incrementar parche');
  console.log('2) Introducir versión manualmente');
  console.log('3) Volver al menú principal');
  const choice = await ask('Seleccione una opción: ');
  if (choice === '1') {
    const newVer = bumpPatchVersion(current);
    updateVersion(newVer);
  } else if (choice === '2') {
    const manual = await ask('Ingrese la versión (sin prefijo "v"): ');
    if (/^(\d+\.){1,2}\d+$/.test(manual)) {
      updateVersion(manual);
    } else {
      console.log('Formato de versión inválido.');
    }
  }
}

async function mainMenu() {
  while (true) {
    console.log('\n=== Deployment Manager ===');
    console.log('1) Gestión de versiones');
    console.log('2) Compilación del proyecto');
    console.log('3) Crear tag (preparar publicación)');
    console.log('4) Salir');
    const opt = await ask('Seleccione una opción: ');
    if (opt === '1') {
      await versionMenu();
    } else if (opt === '2') {
      runBuild();
    } else if (opt === '3') {
      createTag();
    } else if (opt === '4') {
      console.log('👋 Hasta luego.');
      break;
    } else {
      console.log('Opción no reconocida. Intente de nuevo.');
    }
  }
  rl.close();
}

if (require.main === module) {
  mainMenu().catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  });
}
