import { App } from "obsidian";

/**
 * Returns the visual display text of a wiki link, following Obsidian rules:
 * - If alias is present ([[target|alias]]), returns alias.
 * - If heading link ([[#Heading]] or [[##Heading]]), strips the leading hashtags and returns Heading.
 * - If note heading link ([[Note#Heading]]), returns "Note > Heading".
 * - If standard note link ([[Note]]), returns Note.
 */
export function getWikiLinkDisplayText(rawTarget: string, alias?: string): string {
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

/**
 * Strips markup to calculate the exact text rendered on screen (no brackets, no hidden hashtags).
 */
export function getCleanVisibleText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[[#]+\s*([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]#\|]+)#([^\]]+)\]\]/g, "$1 > $2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
}

export function getVisibleTextLength(text: string): number {
  if (!text) return 0;
  return getCleanVisibleText(text).length;
}

export function safeSetGrid(grid: any[][], r: number, c: number, val: any, maxColX: number): void {
  if (r >= 0 && r < grid.length && Array.isArray(grid[r]) && c >= 0 && c < maxColX) {
    grid[r][c] = val;
  }
}

export function safeGetGrid(grid: any[][], r: number, c: number, maxColX: number): any {
  if (r >= 0 && r < grid.length && Array.isArray(grid[r]) && c >= 0 && c < maxColX) {
    return grid[r][c];
  }
  return null;
}

export function wrapText(text: string, maxLineLen = 24): string[] {
  if (!text) return [""];
  const cleaned = getCleanVisibleText(text);
  if (cleaned.length <= maxLineLen) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let curLine = "";

  for (const word of words) {
    const testLine = curLine ? curLine + " " + word : word;
    const testClean = getCleanVisibleText(testLine);

    if (testClean.length <= maxLineLen || !curLine) {
      curLine = testLine;
    } else {
      lines.push(curLine);
      curLine = word;
    }
  }
  if (curLine) lines.push(curLine);
  return lines;
}

/**
 * Resolves a wiki link target based on Obsidian link conventions:
 * 1. [[Note]] -> opens note
 * 2. [[#Heading]] -> opens local heading in sourcePath
 * 3. [[##Heading]] -> searches all files in vault (or sourcePath) for matching heading, returns file.path#Heading
 * 4. [[Note#Heading]] -> opens heading in specific note
 */
export function resolveWikiLinkTarget(
  rawTarget: string,
  app: App,
  sourcePath: string = ""
): { target: string; isGlobalHeading: boolean } {
  if (!rawTarget) return { target: "", isGlobalHeading: false };

  const trimmed = rawTarget.trim();

  // Case 1: Global heading link [[##Heading]]
  if (trimmed.startsWith("##")) {
    const headingQuery = trimmed.replace(/^##\s*/, "").trim().toLowerCase();

    // 1.1 Check current file first if sourcePath is available
    if (sourcePath && app?.vault && app?.metadataCache) {
      const currentFile = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(sourcePath) : null;
      if (currentFile) {
        const cache = app.metadataCache.getFileCache(currentFile as any);
        const match = cache?.headings?.find(
          (h: any) => h.heading && h.heading.trim().toLowerCase() === headingQuery
        );
        if (match) {
          return { target: `${currentFile.path}#${match.heading}`, isGlobalHeading: true };
        }
      }
    }

    // 1.2 Search across all markdown files in the vault
    if (app?.vault && app?.metadataCache) {
      const files = app.vault.getMarkdownFiles ? app.vault.getMarkdownFiles() : [];
      for (const file of files) {
        const cache = app.metadataCache.getFileCache(file);
        const match = cache?.headings?.find(
          (h: any) => h.heading && h.heading.trim().toLowerCase() === headingQuery
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

export function renderLineContent(
  container: HTMLElement, 
  text: string, 
  noteMapInfo: any, 
  app: App,
  sourcePath: string = ""
): void {
  const wikiLinkRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^\)]+)\)/g;
  let lastIndex = 0;
  let match;
  const { noteMap, pattern } = noteMapInfo || {};

  const processPlainSegment = (plainText: string) => {
    if (!plainText) return;
    if (!noteMap || noteMap.size === 0 || !pattern) {
      container.appendChild(document.createTextNode(plainText));
      return;
    }
    const reg = new RegExp(pattern.source, pattern.flags);
    let segLastIndex = 0;
    let m;
    let iterations = 0;
    while ((m = reg.exec(plainText)) !== null && iterations++ < 500) {
      if (m.index > segLastIndex) {
        container.appendChild(document.createTextNode(plainText.substring(segLastIndex, m.index)));
      }
      const matchedText = m[0];
      const info = noteMap.get(matchedText.toLowerCase());
      if (!info) {
        container.appendChild(document.createTextNode(matchedText));
      } else {
        const target = info.target;
        const a = container.createEl("a", {
          text: matchedText,
          cls: "internal-link glossary-link",
          attr: { "data-href": target, href: target }
        });
        a.addEventListener("click", (evt) => {
          evt.preventDefault();
          app.workspace.openLinkText(target, sourcePath || "", evt.metaKey || evt.ctrlKey);
        });
        a.addEventListener("mouseover", (evt) => {
          app.workspace.trigger("hover-link", {
            event: evt,
            source: "preview",
            hoverParent: container,
            targetEl: a,
            linktext: target,
            sourcePath: sourcePath || ""
          });
        });
      }
      segLastIndex = reg.lastIndex;
      if (m.index === reg.lastIndex) {
        reg.lastIndex++;
      }
    }
    if (segLastIndex < plainText.length) {
      container.appendChild(document.createTextNode(plainText.substring(segLastIndex)));
    }
  };

  let wikiIterations = 0;
  while ((match = wikiLinkRegex.exec(text)) !== null && wikiIterations++ < 200) {
    if (match.index > lastIndex) {
      processPlainSegment(text.substring(lastIndex, match.index));
    }
    let rawTarget: string;
    let display: string;
    if (match[1] !== void 0) {
      rawTarget = match[1];
      display = getWikiLinkDisplayText(rawTarget, match[2]);
    } else {
      display = match[3];
      rawTarget = match[4];
    }

    const { target: resolvedTarget } = resolveWikiLinkTarget(rawTarget, app, sourcePath);

    const a = container.createEl("a", {
      text: display,
      cls: "internal-link",
      attr: {
        "data-href": resolvedTarget || rawTarget,
        href: resolvedTarget || rawTarget,
        "target": "_blank",
        "rel": "noopener"
      }
    });

    a.addEventListener("click", (evt) => {
      evt.preventDefault();
      const currentTarget = resolveWikiLinkTarget(rawTarget, app, sourcePath).target;
      app.workspace.openLinkText(currentTarget, sourcePath || "", evt.metaKey || evt.ctrlKey);
    });

    a.addEventListener("mouseover", (evt) => {
      const currentTarget = resolveWikiLinkTarget(rawTarget, app, sourcePath).target;
      app.workspace.trigger("hover-link", {
        event: evt,
        source: "preview",
        hoverParent: container,
        targetEl: a,
        linktext: currentTarget,
        sourcePath: sourcePath || ""
      });
    });

    lastIndex = wikiLinkRegex.lastIndex;
    if (match.index === wikiLinkRegex.lastIndex) {
      wikiLinkRegex.lastIndex++;
    }
  }
  if (lastIndex < text.length) {
    processPlainSegment(text.substring(lastIndex));
  }
}

export function renderEmptyBlockPlaceholder(containerEl: HTMLElement, mode: string | null, settings: any, t: (key: string) => string): void {
  containerEl.empty();
  const preEl = containerEl.createEl("pre");
  preEl.addClass("ascii-tree-block");
  preEl.addClass("ascii-tree-empty");
  if (mode === "v") {
    preEl.addClass("ascii-tree-v");
    if (settings.centerTreeV) preEl.addClass("ascii-tree-center");
  } else if (mode === "k") {
    preEl.addClass("ascii-tree-k");
    if (settings.centerTreeK) preEl.addClass("ascii-tree-center");
  }

  const codeEl = preEl.createEl("code");
  const sp = codeEl.createEl("span", { cls: "ascii-tree-ghost-placeholder" });
  sp.innerText = t("emptyBlockPlaceholder");
}
