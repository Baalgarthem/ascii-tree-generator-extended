import { App } from "obsidian";
import { ORGANIGRAM_SYMBOLS } from "../constants/symbols";
import { getVisibleTextLength, safeSetGrid, safeGetGrid, wrapText, renderLineContent, renderEmptyBlockPlaceholder } from "../utils/rendererUtils";
import { parseSourceText, buildNodeTree } from "../utils/treeParser";

export function renderTreeVertical(
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
    const styleKey = settings.treeStyle || "classic";
    const symH = ORGANIGRAM_SYMBOLS[styleKey] || ORGANIGRAM_SYMBOLS.classic;

    const { items } = parseSourceText(sourceText);

    if (items.length === 0) {
      return renderEmptyBlockPlaceholder(containerEl, "v", settings, t);
    }

    const { nodes, roots } = buildNodeTree(items);
    
    // Add extra properties for Vertical render
    for (const node of nodes) {
      // Preserve wiki links (e.g., [[target|display]]) without wrapping, otherwise wrap normally
        if (node.text.includes('[[') && node.text.includes(']]')) {
          // Extract display text for layout; preserve full wiki syntax for link rendering
          const match = node.text.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
          const display = match ? (match[2] || match[1]) : node.text;
          node.lines = [display];
          node.visLen = getVisibleTextLength(display);
          node.wikiText = node.text; // preserved for renderLineContent
        } else {
          const lines = wrapText(node.text, 24);
          node.lines = lines;
          node.visLen = Math.max(...lines.map((l: string) => getVisibleTextLength(l)));
        }
      node.startX = 0;
      node.centerX = 0;
      node.subtreeWidth = 0;
    }

    if (o) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          const lastLineIdx = node.lines.length - 1;
          if (!node.lines[lastLineIdx].endsWith("/")) {
            node.lines[lastLineIdx] += "/";
            node.visLen = Math.max(...node.lines.map((l: string) => getVisibleTextLength(l)));
          }
        }
      }
    }

    const gap = Math.max(3, dashCount * 2 + 1);

    const calcSubtreeWidth = (node: any) => {
      if (node.children.length === 0) {
        node.subtreeWidth = node.visLen;
      } else {
        let sumChildrenWidth = 0;
        for (let i = 0; i < node.children.length; i++) {
          calcSubtreeWidth(node.children[i]);
          sumChildrenWidth += node.children[i].subtreeWidth;
        }
        sumChildrenWidth += (node.children.length - 1) * gap;
        node.subtreeWidth = Math.max(node.visLen, sumChildrenWidth);
      }
    };
    for (const root of roots) {
      calcSubtreeWidth(root);
    }

    const assignPositions = (node: any, leftBound: number) => {
      node.startX = leftBound + Math.floor((node.subtreeWidth - node.visLen) / 2);
      node.centerX = node.startX + Math.floor(node.visLen / 2);

      if (node.children.length === 1) {
        const child = node.children[0];
        const childLeft = leftBound + Math.floor((node.subtreeWidth - child.subtreeWidth) / 2);
        assignPositions(child, childLeft);
        if (child.subtreeWidth <= node.subtreeWidth) {
          node.centerX = child.centerX;
          node.startX = node.centerX - Math.floor(node.visLen / 2);
        }
      } else if (node.children.length > 1) {
        const sumChildWidths = node.children.reduce((acc: number, c: any) => acc + c.subtreeWidth, 0);
        const remSpace = node.subtreeWidth - sumChildWidths;
        const numGaps = node.children.length - 1;
        const smartGap = Math.max(gap, Math.floor(remSpace / numGaps));
        const remMargin = remSpace - smartGap * numGaps;
        let childLeft = leftBound + Math.floor(remMargin / 2);

        for (const child of node.children) {
          assignPositions(child, childLeft);
          childLeft += child.subtreeWidth + smartGap;
        }
        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];
        const childrenMidX = Math.floor((firstChild.centerX + lastChild.centerX) / 2);
        node.centerX = childrenMidX;
        node.startX = node.centerX - Math.floor(node.visLen / 2);
      }
    };

    let currentRootLeft = 0;
    for (const root of roots) {
      assignPositions(root, currentRootLeft);
      currentRootLeft += root.subtreeWidth + gap * 2;
    }

    const minStartX = Math.min(...nodes.map((n) => n.centerX - Math.floor(n.visLen / 2)));
    if (minStartX < 0) {
      const shiftX = -minStartX;
      for (const n of nodes) {
        n.startX += shiftX;
        n.centerX += shiftX;
      }
    }

    const maxDepth = Math.max(...nodes.map((n) => n.depth));
    const maxLinesByDepth = new Map<number, number>();
    for (let d = 0; d <= maxDepth; d++) {
      const dNodes = nodes.filter((n) => n.depth === d);
      const maxL = dNodes.length > 0 ? Math.max(...dNodes.map((n) => n.lines.length)) : 1;
      maxLinesByDepth.set(d, maxL);
    }

    const depthStartY = new Map<number, number>();
    let curY = 0;
    for (let d = 0; d <= maxDepth; d++) {
      depthStartY.set(d, curY);
      curY += (maxLinesByDepth.get(d) || 1) + 2;
    }

    const totalRows = Math.min(curY + 2, 500);
    const calculatedMaxX = Math.max(...nodes.map((n) => n.centerX + Math.ceil(n.visLen / 2))) + 10;
    const maxColX = Math.min(Math.max(calculatedMaxX, 20), 2000);

    const grid = Array.from({ length: totalRows }, () => Array(maxColX + 2).fill(" "));

    for (const node of nodes) {
      const d = node.depth;
      const pY = depthStartY.get(d) || 0;
      for (let lIdx = 0; lIdx < node.lines.length; lIdx++) {
        const lineText = node.lines[lIdx];
        const lineVisLen = getVisibleTextLength(lineText);
        const startX = Math.max(0, node.centerX - Math.floor(lineVisLen / 2));
        for (let k = 0; k < lineText.length; k++) {
          safeSetGrid(grid, pY + lIdx, startX + k, lineText[k], maxColX);
        }
      }
    }

    for (const node of nodes) {
      if (node.children.length > 0) {
        const d = node.depth;
        const pY = depthStartY.get(d) || 0;
        const mL = maxLinesByDepth.get(d) || 1;

        const pX = Math.min(Math.max(0, node.centerX), maxColX - 1);
        const dropRow = pY + mL;
        const barRow = pY + mL + 1;

        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];
        const leftX = Math.min(Math.max(0, firstChild.centerX), maxColX - 1);
        const rightX = Math.min(Math.max(0, lastChild.centerX), maxColX - 1);

        if (barRow < totalRows) {
          if (node.children.length === 1) {
            const lineX = pX;
            if (dropRow < totalRows && safeGetGrid(grid, dropRow, lineX, maxColX) === " ") {
              safeSetGrid(grid, dropRow, lineX, symH.stem, maxColX);
            }
            if (safeGetGrid(grid, barRow, lineX, maxColX) === " ") {
              safeSetGrid(grid, barRow, lineX, symH.stem, maxColX);
            }
          } else {
            if (dropRow < totalRows && safeGetGrid(grid, dropRow, pX, maxColX) === " ") {
              safeSetGrid(grid, dropRow, pX, symH.stem, maxColX);
            }
            for (let x = leftX; x <= rightX; x++) {
              if (x < maxColX && safeGetGrid(grid, barRow, x, maxColX) === " ") {
                safeSetGrid(grid, barRow, x, symH.dash, maxColX);
              }
            }
            if (leftX < maxColX && safeGetGrid(grid, barRow, leftX, maxColX) === symH.dash) {
              safeSetGrid(grid, barRow, leftX, symH.topCorner, maxColX);
            }
            if (rightX < maxColX && safeGetGrid(grid, barRow, rightX, maxColX) === symH.dash) {
              safeSetGrid(grid, barRow, rightX, symH.topRightCorner, maxColX);
            }

            for (let i = 1; i < node.children.length - 1; i++) {
              const childX = Math.min(Math.max(0, node.children[i].centerX), maxColX - 1);
              if (childX < maxColX && safeGetGrid(grid, barRow, childX, maxColX) === symH.dash) {
                safeSetGrid(grid, barRow, childX, symH.topT, maxColX);
              }
            }

            const isChildX = node.children.some((c: any) => c.centerX === pX);
            if (pX === leftX) {
              if (pX < maxColX) safeSetGrid(grid, barRow, pX, symH.topCorner, maxColX);
            } else if (pX === rightX) {
              if (pX < maxColX) safeSetGrid(grid, barRow, pX, symH.topRightCorner, maxColX);
            } else {
              if (pX < maxColX) safeSetGrid(grid, barRow, pX, isChildX ? symH.cross : symH.bottomT, maxColX);
            }
          }
        }
      }
    }

    // Build a map of row → { display, wikiText } replacements for wiki link nodes
    const wikiReplacements = new Map<number, { display: string; wikiText: string }[]>();
    for (const node of nodes) {
      if (node.wikiText) {
        const d = node.depth;
        const pY = depthStartY.get(d) || 0;
        for (let lIdx = 0; lIdx < node.lines.length; lIdx++) {
          const rowIdx = pY + lIdx;
          if (!wikiReplacements.has(rowIdx)) wikiReplacements.set(rowIdx, []);
          wikiReplacements.get(rowIdx)!.push({ display: node.lines[lIdx], wikiText: node.wikiText });
        }
      }
    }

    const linesOutput = [];
    for (let r = 0; r < totalRows; r++) {
      const lineStr = grid[r].join("").replace(/\s+$/, "");
      linesOutput.push(lineStr);
    }

    while (linesOutput.length > 0 && linesOutput[linesOutput.length - 1] === "") {
      linesOutput.pop();
    }

    if (linesOutput.length === 0) {
      return renderEmptyBlockPlaceholder(containerEl, "v", settings, t);
    }

    containerEl.empty();
    const preEl = containerEl.createEl("pre");
    preEl.addClass("ascii-tree-block");
    preEl.addClass("ascii-tree-v");
    if (settings.centerTreeV) {
      preEl.addClass("ascii-tree-center");
    }

    if (settings.enableLinkHover) {
      preEl.addClass("ascii-tree-hover-" + (settings.linkHoverStyle || "bold"));
    }

    const codeEl = preEl.createEl("code");
    const frag = document.createDocumentFragment();

    for (let j = 0; j < linesOutput.length; j++) {
      const sp = document.createElement("span");
      let lineText = linesOutput[j];

      // Restore wiki link syntax so renderLineContent can create clickable anchors
      const replacements = wikiReplacements.get(j);
      if (replacements) {
        for (const r of replacements) {
          // Replace the plain display text in the grid line with the full [[target|display]] syntax
          lineText = lineText.replace(r.display, r.wikiText);
        }
      }

      renderLineContent(sp, lineText, noteMapInfo, app);

      frag.appendChild(sp);
      if (j < linesOutput.length - 1) {
        frag.appendChild(document.createTextNode("\n"));
      }
    }
    codeEl.appendChild(frag);
  } catch (err) {
    console.error("[ASCII Tree EX] Safe vertical render caught exception:", err);
    renderEmptyBlockPlaceholder(containerEl, "v", settings, t);
  }
}
