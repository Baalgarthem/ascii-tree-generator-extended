import fs from "fs";

// 1. Leer la nueva versión del package.json que npm acaba de actualizar
const targetVersion = process.env.npm_package_version;

// 2. Leer el manifest.json (La fuente de la verdad para Obsidian)
const manifest = JSON.parse(fs.readFileSync("src/manifest.json", "utf8"));
manifest.version = targetVersion;
fs.writeFileSync("src/manifest.json", JSON.stringify(manifest, null, "\t"));

// 3. (Opcional) Si manejas un versions.json para retrocompatibilidad, también se actualiza
if (fs.existsSync("versions.json")) {
	let versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
	versions[targetVersion] = manifest.minAppVersion || "0.15.0";
	fs.writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
}

console.log(`\n✅ El empleado mágico (version.mjs) ha pintado la versión ${targetVersion} en manifest.json\n`);
