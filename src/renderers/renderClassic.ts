import { App } from "obsidian";
import { STYLES } from "../constants/symbols";
import { renderLineContent, renderEmptyBlockPlaceholder } from "../utils/rendererUtils";
import { parseSourceText } from "../utils/treeParser";

export function renderTreeClassic(
  sourceText: string, 
  containerEl: HTMLElement, 
  settings: any, 
  dashCount: number, 
  noteMapInfo: any, 
  app: App,
  t: (key: string) => string
): void {
  try {
    const o = settings.autoAppendSlash;
    const a = dashCount ?? settings.dashCount;
    const styleKey = settings.treeStyle || "classic";
    const sym = STYLES[styleKey] || STYLES.classic;

    const r = sym.dash.repeat(a);
    const t_branch = sym.branch + r + " ";
    const S = sym.last + r + " ";
    const w = sym.stem + " ".repeat(a + 1);
    const A = " ".repeat(a + 2);
    const { commonIndent: C, items: m } = parseSourceText(sourceText);

    if (m.length === 0) {
      return renderEmptyBlockPlaceholder(containerEl, null, settings, t);
    }


    const y: boolean[] = [];
    const M = m
      .map((n, c) => {
        let g = true;
        for (let d = c + 1; d < m.length && !(m[d].level < n.level); d++) {
          if (m[d].level === n.level) { g = false; break; }
        }
        y[n.level] = g;
        y.length = n.level + 1;
        let f = "";
        for (let d = 1; d < n.level; d++) f += y[d] ? A : w;
        if (n.level > 0) f += g ? S : t_branch;
        let k = n.text;
        if (o && n.level > 0 && c + 1 < m.length && m[c + 1].level > n.level && !k.endsWith("/")) {
          k += "/";
        }
        return `${C}${n.leadingWhitespace}${f}${k}`;
      })
      .join("\n");

    containerEl.empty();
    const preEl = containerEl.createEl("pre");
    preEl.addClass("ascii-tree-block");

    if (settings.enableLinkHover) {
      preEl.addClass("ascii-tree-hover-" + (settings.linkHoverStyle || "bold"));
    }

    const codeEl = preEl.createEl("code");
    const ls = M.split("\n");
    const frag = document.createDocumentFragment();

    for (let j = 0; j < ls.length; j++) {
      const sp = document.createElement("span");
      const lineText = ls[j];

      if (j === 0 && settings.enableTitleFormat) {
        sp.addClass("ascii-tree-title");
        sp.setAttribute("data-spacing", String(settings.titleSpacing ?? 12));
        sp.style.fontSize = "var(--ascii-tree-title-font-size, " + (settings.titleFontSize || "1.15em") + ")";
        sp.style.marginBottom = "var(--ascii-tree-title-margin-bottom, 12px)";
      }

      renderLineContent(sp, lineText, noteMapInfo, app);

      frag.appendChild(sp);
      if (j < ls.length - 1) {
        frag.appendChild(document.createTextNode("\n"));
      }
    }
    codeEl.appendChild(frag);
  } catch (err) {
    console.error("[ASCII Tree EX] Safe classic render caught exception:", err);
  }
}
