import { App } from "obsidian";

export function getVisibleTextLength(text: string): number {
  if (!text) return 0;
  const cleaned = text
    .replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  return cleaned.length;
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
  const cleaned = text
    .replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  if (cleaned.length <= maxLineLen) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let curLine = "";

  for (const word of words) {
    const testLine = curLine ? curLine + " " + word : word;
    const testClean = testLine
      .replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

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

export function renderLineContent(container: HTMLElement, text: string, noteMapInfo: any, app: App): void {
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
          app.workspace.openLinkText(target, "", evt.metaKey || evt.ctrlKey);
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
    let target, display;
    if (match[1] !== void 0) {
      target = match[1];
      display = match[2] || match[1];
    } else {
      display = match[3];
      target = match[4];
    }
    const a = container.createEl("a", {
      text: display,
      cls: "internal-link",
      attr: { "data-href": target, href: target }
    });
    a.addEventListener("click", (evt) => {
      evt.preventDefault();
      app.workspace.openLinkText(target, "", evt.metaKey || evt.ctrlKey);
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
