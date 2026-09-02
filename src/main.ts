import { Plugin, Component, Editor, MarkdownPostProcessorContext } from "obsidian";
import { TRANSLATIONS } from "./constants/translations";
import { DEFAULT_SETTINGS, AsciiTreeSettings } from "./settings/defaultSettings";
import { AsciiTreeSettingTab } from "./settings/SettingsTab";
import { renderTreeClassic } from "./renderers/renderClassic";
import { renderTreeVertical } from "./renderers/renderVertical";
import { renderTreeSynoptic } from "./renderers/renderSynoptic";
import { addCodeblockActions } from "./utils/treeActions";

export default class AsciiTreeGeneratorExtended extends Plugin {
  settings!: AsciiTreeSettings;
  renderedBlocks: Map<HTMLElement, any> = new Map();
  _cachedNoteMapInfo: any = null;

  async onload() {
    await this.loadSettings();
    this.applyCSSVars();
    this.addSettingTab(new AsciiTreeSettingTab(this.app, this as any));

    if (this.app && this.app.vault) {
      this.registerEvent(this.app.vault.on("create", () => this.invalidateNoteMapCache()));
      this.registerEvent(this.app.vault.on("delete", () => this.invalidateNoteMapCache()));
      this.registerEvent(this.app.vault.on("rename", () => this.invalidateNoteMapCache()));
    }
    if (this.app && this.app.metadataCache) {
      this.registerEvent(this.app.metadataCache.on("changed", () => this.invalidateNoteMapCache()));
    }

    this.registerMarkdownCodeBlockProcessor("tree", (sourceText, containerEl, ctx) => {
      this.treeProcessor(sourceText, containerEl, ctx, null);
    });
    this.registerMarkdownCodeBlockProcessor("tree-v", (sourceText, containerEl, ctx) => {
      this.treeProcessor(sourceText, containerEl, ctx, "v");
    });
    this.registerMarkdownCodeBlockProcessor("tree-k", (sourceText, containerEl, ctx) => {
      this.treeProcessor(sourceText, containerEl, ctx, "k");
    });

    this.addCommand({
      id: "convert-to-tree-block",
      name: "Convert selection to default tree code block (tree)",
      editorCallback: (e) => { this.convertSelectionToTreeBlock(e, null); }
    });
    this.addCommand({
      id: "convert-to-tree-v-block",
      name: "Convert selection to vertical organigram block (tree-v)",
      editorCallback: (e) => { this.convertSelectionToTreeBlock(e, "v"); }
    });
    this.addCommand({
      id: "convert-to-tree-k-block",
      name: "Convert selection to synoptic diagram block (tree-k)",
      editorCallback: (e) => { this.convertSelectionToTreeBlock(e, "k"); }
    });
    this.addCommand({
      id: "remove-tree-block",
      name: "Convert tree block back to text",
      editorCallback: (e) => { this.removeTreeBlock(e); }
    });
    this.addCommand({
      id: "toggle-tree-block",
      name: "Toggle tree block",
      editorCallback: (e) => { this.toggleTreeBlock(e); }
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  t(key: string): string {
    const lang = this.settings.language || "es";
    const dict = (TRANSLATIONS as any)[lang] || (TRANSLATIONS as any).es;
    return dict[key] || (TRANSLATIONS as any).es[key] || key;
  }

  treeProcessor = (sourceText: string, containerEl: HTMLElement, ctx: MarkdownPostProcessorContext, mode: string | null = null) => {
    this.renderedBlocks.set(containerEl, { sourceText, mode });
    if (ctx && ctx.addChild) {
      const comp = new Component();
      comp.onunload = () => {
        this.renderedBlocks.delete(containerEl);
      };
      ctx.addChild(comp);
    }
    this._renderTree(sourceText, containerEl, ctx, mode);
    if (ctx) {
      addCodeblockActions(this.app, containerEl, ctx, mode, sourceText, (key) => this.t(key));
    }
  };

  _renderTree(sourceText: string, containerEl: HTMLElement, ctx: MarkdownPostProcessorContext | null, modeOverride: string | null = null) {
    const a = this.settings.dashCount;
    const noteMapInfo = this.getVaultNoteMapInfo();

    if (modeOverride === "v") {
      return renderTreeVertical(sourceText, containerEl, this.settings, a, noteMapInfo, this.app, (key) => this.t(key));
    }
    if (modeOverride === "k") {
      return renderTreeSynoptic(sourceText, containerEl, this.settings, a, noteMapInfo, this.app, (key) => this.t(key));
    }

    return renderTreeClassic(sourceText, containerEl, this.settings, a, noteMapInfo, this.app, (key) => this.t(key));
  }

  applyCSSVars() {
    const root = document.documentElement;
    const spacing = this.settings.titleSpacing ?? 12;
    root.style.setProperty("--ascii-tree-title-font-size", this.settings.titleFontSize || "1.15em");
    root.style.setProperty("--ascii-tree-title-margin-bottom", spacing + "px");
  }

  rerenderAllBlocks() {
    for (const [containerEl, data] of this.renderedBlocks) {
      if (!containerEl.isConnected) {
        this.renderedBlocks.delete(containerEl);
        continue;
      }
      const sourceText = typeof data === "string" ? data : data.sourceText;
      const mode = typeof data === "object" ? data.mode : null;
      this._renderTree(sourceText, containerEl, null, mode);
    }
  }

  updateHoverClasses() {
    const allPre = document.querySelectorAll("pre.ascii-tree-block");
    for (const pre of (allPre as any)) {
      const toRemove = Array.from(pre.classList).filter((c: any) => c.startsWith("ascii-tree-hover-"));
      toRemove.forEach((c: any) => pre.classList.remove(c));
      if (this.settings.enableLinkHover) {
        pre.classList.add("ascii-tree-hover-" + (this.settings.linkHoverStyle || "bold"));
      }
    }
  }

  invalidateNoteMapCache() {
    this._cachedNoteMapInfo = null;
  }

  getVaultNoteMapInfo() {
    if (this._cachedNoteMapInfo) {
      return this._cachedNoteMapInfo;
    }
    const noteMap = new Map();
    let pattern = null;
    try {
      if (this.app && this.app.vault) {
        const files = this.app.vault.getMarkdownFiles ? this.app.vault.getMarkdownFiles() : [];
        for (const file of files) {
          const title = file.basename;
          if (title) noteMap.set(title.toLowerCase(), { display: title, target: file.path });
          const cache = this.app.metadataCache ? this.app.metadataCache.getFileCache(file) : null;
          if (cache && cache.frontmatter && cache.frontmatter.aliases) {
            let aliases = cache.frontmatter.aliases;
            if (typeof aliases === "string") aliases = [aliases];
            if (Array.isArray(aliases)) {
              for (const alias of aliases) {
                if (typeof alias === "string" && alias.trim()) {
                  noteMap.set(alias.trim().toLowerCase(), { display: alias.trim(), target: file.path });
                }
              }
            }
          }
        }
      }
      if (noteMap.size > 0) {
        const keys = Array.from(noteMap.keys()).sort((a, b) => b.length - a.length);
        const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        pattern = new RegExp("(?<![\\w\\[])" + "(" + escaped.join("|") + ")" + "(?![\\w\\]])", "gi");
      }
    } catch (err) {
      console.error("[ASCII Tree EX] Error building vault note map:", err);
    }
    this._cachedNoteMapInfo = { noteMap, pattern };
    return this._cachedNoteMapInfo;
  }

  convertSelectionToTreeBlock(e: Editor, mode: string | null = null) {
    const tag = mode === "v" ? "tree-v" : (mode === "k" ? "tree-k" : "tree");
    const s = e.getSelection();
    if (s) {
      e.replaceSelection("```" + tag + "\n" + s + "\n```");
    } else {
      const o = e.getCursor().line;
      const a = e.getLine(o);
      const r = { line: o, ch: 0 };
      const t = { line: o, ch: a.length };
      e.replaceRange("```" + tag + "\n" + a + "\n```", r, t);
      e.setCursor(o + 1, a.length);
    }
  }

  removeTreeBlock(e: Editor) {
    const s = e.getCursor();
    const o = e.getValue().split("\n");
    const a = s.line;
    let i = -1;
    let r = -1;
    for (let t = a; t >= 0; t--) {
      if (o[t].trim().match(/^```tree(?:-[vk])?\s*$/)) { i = t; break; }
      if (t !== a && o[t].trim().match(/^```/)) break;
    }
    if (i !== -1)
      for (let t = i + 1; t < o.length; t++)
        if (o[t].trim() === "```") { r = t; break; }
    if (i !== -1 && r !== -1 && a >= i && a <= r) {
      const t = o.slice(i + 1, r).join("\n");
      const S = { line: i, ch: 0 };
      const w = { line: r, ch: o[r].length };
      e.replaceRange(t, S, w);
      e.setCursor(i, 0);
    }
  }

  toggleTreeBlock(e: Editor) {
    this.isInsideTreeBlock(e) ? this.removeTreeBlock(e) : this.convertSelectionToTreeBlock(e);
  }

  isInsideTreeBlock(e: Editor) {
    const s = e.getCursor();
    const o = e.getValue().split("\n");
    const a = s.line;
    let i = -1;
    let r = -1;
    for (let t = a; t >= 0; t--) {
      if (o[t].trim().match(/^```tree(?:-[vk])?\s*$/)) { i = t; break; }
      if (t !== a && o[t].trim().match(/^```/)) break;
    }
    if (i !== -1)
      for (let t = i + 1; t < o.length; t++)
        if (o[t].trim() === "```") { r = t; break; }
    return i !== -1 && r !== -1 && a >= i && a <= r;
  }
}
