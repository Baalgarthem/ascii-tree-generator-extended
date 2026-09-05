const assert = require("assert");

function getWikiLinkDisplayText(rawTarget, alias) {
  if (alias !== undefined && alias !== null) {
    return alias;
  }
  const trimmed = rawTarget.trim();
  if (trimmed.startsWith("##")) {
    return trimmed.replace(/^##\s*/, "").trim();
  }
  if (trimmed.startsWith("#")) {
    return trimmed.replace(/^#\s*/, "").trim();
  }
  if (trimmed.includes("#")) {
    return trimmed.replace(/#/g, " > ");
  }
  return trimmed;
}

function getCleanVisibleText(text) {
  if (!text) return "";
  return text
    .replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[[#]+\s*([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]#\|]+)#([^\]]+)\]\]/g, "$1 > $2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
}

function getVisibleTextLength(text) {
  if (!text) return 0;
  return getCleanVisibleText(text).length;
}

function resolveWikiLinkTarget(rawTarget, app, sourcePath = "") {
  if (!rawTarget) return { target: "", isGlobalHeading: false };

  const trimmed = rawTarget.trim();

  // Case 1: Global heading link [[##Heading]]
  if (trimmed.startsWith("##")) {
    const headingQuery = trimmed.replace(/^##\s*/, "").trim().toLowerCase();

    // 1.1 Check current file first if sourcePath is available
    if (sourcePath && app && app.vault && app.metadataCache) {
      const currentFile = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(sourcePath) : null;
      if (currentFile) {
        const cache = app.metadataCache.getFileCache(currentFile);
        const match = cache && cache.headings && cache.headings.find(
          (h) => h.heading && h.heading.trim().toLowerCase() === headingQuery
        );
        if (match) {
          return { target: `${currentFile.path}#${match.heading}`, isGlobalHeading: true };
        }
      }
    }

    // 1.2 Search across all markdown files in the vault
    if (app && app.vault && app.metadataCache) {
      const files = app.vault.getMarkdownFiles ? app.vault.getMarkdownFiles() : [];
      for (const file of files) {
        const cache = app.metadataCache.getFileCache(file);
        const match = cache && cache.headings && cache.headings.find(
          (h) => h.heading && h.heading.trim().toLowerCase() === headingQuery
        );
        if (match) {
          return { target: `${file.path}#${match.heading}`, isGlobalHeading: true };
        }
      }
    }

    // Fallback: local heading link with single #
    const fallbackHeading = trimmed.replace(/^##\s*/, "").trim();
    return { target: `#${fallbackHeading}`, isGlobalHeading: true };
  }

  // Case 2: Local heading [[#Heading]], Note [[Note]], or Note Heading [[Note#Heading]]
  return { target: trimmed, isGlobalHeading: false };
}

function parseWikiLinksFromText(text) {
  const wikiLinkRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^\)]+)\)/g;
  const matches = [];
  let match;
  while ((match = wikiLinkRegex.exec(text)) !== null) {
    let rawTarget, display;
    if (match[1] !== undefined) {
      rawTarget = match[1];
      display = getWikiLinkDisplayText(rawTarget, match[2]);
    } else {
      display = match[3];
      rawTarget = match[4];
    }
    matches.push({ rawTarget, display });
  }
  return matches;
}

console.log("Running wiki linking unit tests...");

// Test 1: Extraction and visual display of [[Titulo de nota]]
const t1 = parseWikiLinksFromText("├── [[Mi Nota Principal]]");
assert.strictEqual(t1.length, 1);
assert.strictEqual(t1[0].rawTarget, "Mi Nota Principal");
assert.strictEqual(t1[0].display, "Mi Nota Principal");
console.log("✔ Test 1: [[Titulo de nota]] visual display passed (no brackets)");

// Test 2: Extraction and visual display of [[Nota|textoPersonalizado]]
const t2 = parseWikiLinksFromText("├── [[Fase escrita en derecho laboral|Fase escrita]]");
assert.strictEqual(t2.length, 1);
assert.strictEqual(t2[0].rawTarget, "Fase escrita en derecho laboral");
assert.strictEqual(t2[0].display, "Fase escrita");
console.log("✔ Test 2: [[Nota|textoPersonalizado]] visual display passed");

// Test 3: Extraction and visual display of local heading [[#Titulo de nota]] (NO hashtag in display) and [[#Titulo|Alias]]
const t3a = parseWikiLinksFromText("└── [[#Conclusiones]]");
assert.strictEqual(t3a[0].rawTarget, "#Conclusiones");
assert.strictEqual(t3a[0].display, "Conclusiones"); // Hashtag stripped visually

const t3b = parseWikiLinksFromText("└── [[#Conclusiones|Resumen Final]]");
assert.strictEqual(t3b[0].rawTarget, "#Conclusiones");
assert.strictEqual(t3b[0].display, "Resumen Final");
console.log("✔ Test 3: [[#Heading]] visual display passed (hashtag hidden)");

// Test 4: Extraction and visual display of global heading [[##Titulo de nota]] (NO hashtags in display) and [[##Titulo|Alias]]
const t4a = parseWikiLinksFromText("└── [[##Audiencia de juicio]]");
assert.strictEqual(t4a[0].rawTarget, "##Audiencia de juicio");
assert.strictEqual(t4a[0].display, "Audiencia de juicio"); // Double hashtag stripped visually

const t4b = parseWikiLinksFromText("└── [[##Audiencia de juicio|Vista Oral]]");
assert.strictEqual(t4b[0].rawTarget, "##Audiencia de juicio");
assert.strictEqual(t4b[0].display, "Vista Oral");
console.log("✔ Test 4: [[##Heading]] visual display passed (hashtags hidden)");

// Test 5: Global heading resolution with Vault Mock
const mockVault = {
  files: [
    { path: "Notas/Derecho/Procesal.md", basename: "Procesal" },
    { path: "Notas/Penal/Juicios.md", basename: "Juicios" },
  ],
  cacheMap: new Map([
    ["Notas/Derecho/Procesal.md", { headings: [{ heading: "Fase Escrita" }, { heading: "Audiencia Preliminar" }] }],
    ["Notas/Penal/Juicios.md", { headings: [{ heading: "Audiencia de juicio" }, { heading: "Sentencia Penal" }] }]
  ]),
  getMarkdownFiles() {
    return this.files;
  },
  getAbstractFileByPath(path) {
    return this.files.find(f => f.path === path) || null;
  }
};

const mockApp = {
  vault: mockVault,
  metadataCache: {
    getFileCache(file) {
      return mockVault.cacheMap.get(file.path) || null;
    }
  }
};

// Global heading in external file
const resGlobal = resolveWikiLinkTarget("##Audiencia de juicio", mockApp, "Notas/Derecho/Procesal.md");
assert.strictEqual(resGlobal.target, "Notas/Penal/Juicios.md#Audiencia de juicio");
assert.strictEqual(resGlobal.isGlobalHeading, true);
console.log("✔ Test 5.1: Global heading resolution across vault passed");

// Global heading in current sourcePath file
const resCurrent = resolveWikiLinkTarget("##Fase Escrita", mockApp, "Notas/Derecho/Procesal.md");
assert.strictEqual(resCurrent.target, "Notas/Derecho/Procesal.md#Fase Escrita");
assert.strictEqual(resCurrent.isGlobalHeading, true);
console.log("✔ Test 5.2: Global heading resolution in current file passed");

// Local heading resolution
const resLocal = resolveWikiLinkTarget("#Audiencia Preliminar", mockApp, "Notas/Derecho/Procesal.md");
assert.strictEqual(resLocal.target, "#Audiencia Preliminar");
assert.strictEqual(resLocal.isGlobalHeading, false);
console.log("✔ Test 5.3: Local heading resolution passed");

// Standard note resolution
const resNote = resolveWikiLinkTarget("Procesal", mockApp, "Notas/Derecho/Procesal.md");
assert.strictEqual(resNote.target, "Procesal");
assert.strictEqual(resNote.isGlobalHeading, false);
console.log("✔ Test 5.4: Standard note resolution passed");

// Test 6: Visible text length calculation without brackets or hashtags
assert.strictEqual(getVisibleTextLength("[[Nota]]"), 4);
assert.strictEqual(getVisibleTextLength("[[Nota|Alias Corto]]"), 11);
assert.strictEqual(getVisibleTextLength("[[##Audiencia de juicio]]"), 19);
assert.strictEqual(getVisibleTextLength("[[#Conclusiones]]"), 12);
assert.strictEqual(getVisibleTextLength("[[##Audiencia de juicio|Vista Oral]]"), 10);
assert.strictEqual(getVisibleTextLength("[[#Conclusiones|Resumen]]"), 7);
assert.strictEqual(getVisibleTextLength("Item: [[Nota|Texto]] y más"), 17);
console.log("✔ Test 6: getVisibleTextLength calculations passed");

console.log("\nAll wiki linking visual display unit tests passed successfully!");
