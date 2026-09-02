import { App, MarkdownPostProcessorContext, MarkdownView, TFile, setIcon, setTooltip } from "obsidian";
import { getVisibleTextLength } from "./rendererUtils";

export interface SourceTreeNode {
  rawLine: string;
  bullet: string;
  indent: string;
  level: number;
  text: string;
  children: SourceTreeNode[];
}

/**
 * Extracts clean text for sorting (removes wiki links, markdown links, formatting).
 */
export function getCleanSortText(text: string): string {
  if (!text) return "";
  // 1. [[target|display]] -> display, [[target]] -> target
  let cleaned = text.replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2");
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, "$1");
  // 2. [display](url) -> display
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  // 3. Strip bold/italic/highlight/code markers
  cleaned = cleaned.replace(/[*_~=`]/g, "");
  return cleaned.trim();
}

/**
 * Compares two nodes alphabetically based on their clean display text.
 */
export function compareNodes(a: SourceTreeNode, b: SourceTreeNode, ascending = true): number {
  const textA = getCleanSortText(a.text);
  const textB = getCleanSortText(b.text);
  const cmp = textA.localeCompare(textB, undefined, { sensitivity: "base", numeric: true });
  return ascending ? cmp : -cmp;
}

/**
 * Parses raw source text lines into a hierarchical tree of SourceTreeNode.
 */
export function parseSourceTreeHierarchy(sourceText: string): { roots: SourceTreeNode[]; leadingEmpty: string[]; trailingEmpty: string[] } {
  const rawLines = sourceText.split("\n");
  
  // Extract leading and trailing empty lines to preserve them
  let firstNonEmpty = 0;
  while (firstNonEmpty < rawLines.length && rawLines[firstNonEmpty].trim() === "") {
    firstNonEmpty++;
  }
  let lastNonEmpty = rawLines.length - 1;
  while (lastNonEmpty >= firstNonEmpty && rawLines[lastNonEmpty].trim() === "") {
    lastNonEmpty--;
  }

  const leadingEmpty = rawLines.slice(0, firstNonEmpty);
  const trailingEmpty = rawLines.slice(lastNonEmpty + 1);
  const lines = rawLines.slice(firstNonEmpty, lastNonEmpty + 1);

  const flatNodes: SourceTreeNode[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // 1. List item match (- * + 1. ─ etc)
    const listMatch = line.match(/^([\t ]*)((?:[-*+─—–‒•⁃])|\d+\.)\s*(.*)$/);
    if (listMatch) {
      const indentStr = listMatch[1];
      const tabs = (indentStr.match(/\t/g) || []).length;
      const spaces = (indentStr.match(/ /g) || []).length;
      const level = tabs + Math.floor(spaces / 4) + 1;
      flatNodes.push({
        rawLine: line,
        bullet: listMatch[2],
        indent: indentStr,
        level,
        text: listMatch[3] ? listMatch[3].trim() : "",
        children: []
      });
      continue;
    }

    // 2. Heading item match (= == ===)
    const headingMatch = line.match(/^(=+)\s*(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      flatNodes.push({
        rawLine: line,
        bullet: headingMatch[1],
        indent: "",
        level,
        text: headingMatch[2] ? headingMatch[2].trim() : "",
        children: []
      });
      continue;
    }

    // 3. Plain text / Title line (level 0)
    const plainMatch = line.match(/^([\t ]*)(.*)$/);
    const indentStr = plainMatch ? plainMatch[1] : "";
    const tabs = (indentStr.match(/\t/g) || []).length;
    const spaces = (indentStr.match(/ /g) || []).length;
    const level = tabs + Math.floor(spaces / 4);
    flatNodes.push({
      rawLine: line,
      bullet: "",
      indent: indentStr,
      level,
      text: plainMatch ? plainMatch[2].trim() : "",
      children: []
    });
  }

  // Build tree hierarchy using stack
  const roots: SourceTreeNode[] = [];
  const stack: SourceTreeNode[] = [];

  for (const node of flatNodes) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  }

  return { roots, leadingEmpty, trailingEmpty };
}

/**
 * Checks if all sibling groups in the tree are sorted ascending.
 */
export function isTreeSortedAscending(nodes: SourceTreeNode[]): boolean {
  if (nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      if (compareNodes(nodes[i], nodes[i + 1], true) > 0) {
        return false;
      }
    }
  }
  for (const node of nodes) {
    if (node.children.length > 0) {
      if (!isTreeSortedAscending(node.children)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Recursively sorts children at each level.
 */
export function sortNodeTree(nodes: SourceTreeNode[], ascending: boolean): void {
  // If there's a single root title at level 0 and its children are list items, sort children
  if (nodes.length > 1) {
    nodes.sort((a, b) => compareNodes(a, b, ascending));
  }
  for (const node of nodes) {
    if (node.children.length > 0) {
      sortNodeTree(node.children, ascending);
    }
  }
}

/**
 * Serializes the sorted tree back to text lines.
 */
export function serializeSourceTree(nodes: SourceTreeNode[]): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    lines.push(node.rawLine);
    if (node.children.length > 0) {
      lines.push(...serializeSourceTree(node.children));
    }
  }
  return lines;
}

/**
 * Sorts sourceText alternating between Ascending and Descending.
 */
export function sortTreeSourceText(sourceText: string): { newText: string; isAscending: boolean } {
  const { roots, leadingEmpty, trailingEmpty } = parseSourceTreeHierarchy(sourceText);
  if (roots.length === 0) return { newText: sourceText, isAscending: true };

  // Check if currently sorted ascending
  const currentlyAsc = isTreeSortedAscending(roots);
  const targetAsc = !currentlyAsc;

  // Sort hierarchy
  sortNodeTree(roots, targetAsc);

  // Serialize back
  const sortedLines = serializeSourceTree(roots);
  const allLines = [...leadingEmpty, ...sortedLines, ...trailingEmpty];
  return { newText: allLines.join("\n"), isAscending: targetAsc };
}

/**
 * Cycles the codeblock fence between tree -> tree-v -> tree-k -> tree.
 */
export async function cycleTreeMode(
  app: App,
  ctx: MarkdownPostProcessorContext,
  containerEl: HTMLElement,
  currentMode: string | null
): Promise<void> {
  const sectionInfo = ctx.getSectionInfo(containerEl);
  if (!sectionInfo) return;

  const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
  if (!(file instanceof TFile)) return;

  const nextTag = currentMode === null ? "tree-v" : (currentMode === "v" ? "tree-k" : "tree");

  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeView && activeView.file?.path === ctx.sourcePath && activeView.getMode() === "source" && activeView.editor) {
    const editor = activeView.editor;
    const lineStart = sectionInfo.lineStart;
    const lineContent = editor.getLine(lineStart);
    if (lineContent !== undefined && lineContent.includes("```")) {
      const newLineContent = lineContent.replace(/^([\t ]*```)tree(?:-[vk])?(.*)$/, `$1${nextTag}$2`);
      editor.replaceRange(newLineContent, { line: lineStart, ch: 0 }, { line: lineStart, ch: lineContent.length });
      return;
    }
  }

  await app.vault.process(file, (data) => {
    const lines = data.split("\n");
    let lineStart = sectionInfo.lineStart;
    
    // Safety check around lineStart in case of slight offset
    if (!lines[lineStart] || !lines[lineStart].includes("```")) {
      for (let offset = -5; offset <= 5; offset++) {
        const checkIdx = lineStart + offset;
        if (checkIdx >= 0 && checkIdx < lines.length && lines[checkIdx].match(/^[\t ]*```tree(?:-[vk])?/)) {
          lineStart = checkIdx;
          break;
        }
      }
    }

    if (lineStart >= 0 && lineStart < lines.length && lines[lineStart].includes("```")) {
      lines[lineStart] = lines[lineStart].replace(/^([\t ]*```)tree(?:-[vk])?(.*)$/, `$1${nextTag}$2`);
    }
    return lines.join("\n");
  });
}

/**
 * Sorts the tree block content in the document.
 */
export async function sortTreeBlock(
  app: App,
  ctx: MarkdownPostProcessorContext,
  containerEl: HTMLElement,
  sourceText: string
): Promise<boolean> {
  const sectionInfo = ctx.getSectionInfo(containerEl);
  if (!sectionInfo) return false;

  const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
  if (!(file instanceof TFile)) return false;

  const { newText, isAscending } = sortTreeSourceText(sourceText);

  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeView && activeView.file?.path === ctx.sourcePath && activeView.getMode() === "source" && activeView.editor) {
    const editor = activeView.editor;
    const lineStart = sectionInfo.lineStart;
    const lineEnd = sectionInfo.lineEnd;
    
    // Replace content between fence lines (lineStart + 1 to lineEnd - 1)
    const from = { line: lineStart + 1, ch: 0 };
    const to = { line: lineEnd, ch: 0 };
    editor.replaceRange(newText + "\n", from, to);
    return isAscending;
  }

  await app.vault.process(file, (data) => {
    const lines = data.split("\n");
    let lineStart = sectionInfo.lineStart;
    let lineEnd = sectionInfo.lineEnd;

    // Verify fence bounds
    if (!lines[lineStart] || !lines[lineStart].includes("```")) {
      for (let offset = -5; offset <= 5; offset++) {
        const checkIdx = lineStart + offset;
        if (checkIdx >= 0 && checkIdx < lines.length && lines[checkIdx].match(/^[\t ]*```tree(?:-[vk])?/)) {
          lineStart = checkIdx;
          break;
        }
      }
    }

    const newLines = newText.split("\n");
    const countToRemove = Math.max(0, lineEnd - (lineStart + 1));
    lines.splice(lineStart + 1, countToRemove, ...newLines);
    return lines.join("\n");
  });

  return isAscending;
}

/**
 * Injects the action buttons (Next layout + Alphabetical Sort) into the codeblock container.
 */
export function addCodeblockActions(
  app: App,
  containerEl: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  currentMode: string | null,
  sourceText: string,
  t: (key: string) => string
): void {
  // Container wrapper class
  containerEl.addClass("ascii-tree-wrapper");
  containerEl.addClass("no-line-numbers");

  // Remove existing action bar if re-rendering
  const existingToolbar = containerEl.querySelector(".ascii-tree-codeblock-actions");
  if (existingToolbar) {
    existingToolbar.remove();
  }

  const toolbar = containerEl.createDiv({ cls: "ascii-tree-codeblock-actions" });

  // 1. Sort Button (A-Z / Z-A)
  const sortBtn = toolbar.createEl("button", {
    cls: "ascii-tree-action-btn ascii-tree-btn-sort",
    attr: { type: "button", "aria-label": t("sortTreeTooltip") }
  });
  setIcon(sortBtn, "arrow-down-up");
  setTooltip(sortBtn, t("sortTreeTooltip"));

  sortBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const isAsc = await sortTreeBlock(app, ctx, containerEl, sourceText);
      setIcon(sortBtn, isAsc ? "arrow-down-a-z" : "arrow-up-z-a");
      setTooltip(sortBtn, isAsc ? t("sortTreeTooltipDesc") : t("sortTreeTooltipAsc"));
    } catch (err) {
      console.error("[ASCII Tree EX] Error sorting tree block:", err);
    }
  });

  // 2. Next Layout Button (tree -> tree-v -> tree-k)
  const nextBtn = toolbar.createEl("button", {
    cls: "ascii-tree-action-btn ascii-tree-btn-next",
    attr: { type: "button", "aria-label": t("nextStyleTooltip") }
  });
  setIcon(nextBtn, "step-forward");
  setTooltip(nextBtn, t("nextStyleTooltip"));

  nextBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await cycleTreeMode(app, ctx, containerEl, currentMode);
    } catch (err) {
      console.error("[ASCII Tree EX] Error cycling tree mode:", err);
    }
  });
}
