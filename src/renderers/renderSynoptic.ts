import { App } from "obsidian";
import { SYNOPTIC_SYMBOLS } from "../constants/symbols";
import { getVisibleTextLength, safeSetGrid, safeGetGrid, renderLineContent, renderEmptyBlockPlaceholder } from "../utils/rendererUtils";
import { parseSourceText, buildNodeTree } from "../utils/treeParser";

export function renderTreeSynoptic(
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
    const symK = SYNOPTIC_SYMBOLS[styleKey] || SYNOPTIC_SYMBOLS.classic;

    const { items } = parseSourceText(sourceText);

    if (items.length === 0) {
      return renderEmptyBlockPlaceholder(containerEl, "k", settings, t);
    }

    const { nodes, roots } = buildNodeTree(items);
    
    // Add extra properties for Synoptic render
    for (const node of nodes) {
      node.startY = 0;
      node.endY = 0;
      node.centerY = 0;
      node.visLen = getVisibleTextLength(node.text);
    }

    if (o) {
      for (const node of nodes) {
        if (node.children.length > 0 && !node.text.endsWith("/")) {
          node.text += "/";
          node.visLen = getVisibleTextLength(node.text);
        }
      }
    }

    let currentLeafY = 0;
    const assignRows = (node: any) => {
      if (node.children.length === 0) {
        node.startY = currentLeafY;
        node.endY = currentLeafY;
        node.centerY = currentLeafY;
        currentLeafY += 2;
      } else {
        for (const child of node.children) {
          assignRows(child);
        }
        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];
        node.startY = firstChild.startY;
        node.endY = lastChild.endY;
        node.centerY = Math.floor((firstChild.centerY + lastChild.centerY) / 2);
      }
    };
    for (const root of roots) {
      assignRows(root);
    }

    const maxDepth = Math.max(...nodes.map((n) => n.depth));
    const maxLenByDepth = new Map<number, number>();
    for (let d = 0; d <= maxDepth; d++) {
      const depthNodes = nodes.filter((n) => n.depth === d);
      const maxL = depthNodes.length > 0 ? Math.max(...depthNodes.map((n) => n.visLen)) : 0;
      maxLenByDepth.set(d, maxL);
    }

    const colX = new Map<number, number>();
    let curX = 0;
    const dashPad = Math.max(1, dashCount);
    for (let d = 0; d <= maxDepth; d++) {
      colX.set(d, curX);
      const len = maxLenByDepth.get(d) || 0;
      curX += len + dashPad + 2 + dashPad;
    }

    const totalRows = Math.min(currentLeafY + 2, 500);
    const calculatedMaxX = (colX.get(maxDepth) || 0) + (maxLenByDepth.get(maxDepth) || 0) + 4;
    const maxColX = Math.min(Math.max(calculatedMaxX, 10), 2000);

    const grid = Array.from({ length: totalRows }, () => Array(maxColX + 2).fill(" "));

    for (const node of nodes) {
      const nodeX = colX.get(node.depth) || 0;
      const r = node.centerY;
      const text = node.text;
      for (let k = 0; k < text.length; k++) {
        safeSetGrid(grid, r, nodeX + k, text[k], maxColX);
      }
    }

    for (const node of nodes) {
      if (node.children.length > 0) {
        const depth = node.depth;
        const nodeX = colX.get(depth)!;
        const nextColX = colX.get(depth + 1)!;

        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];

        const topY = firstChild.centerY;
        const botY = lastChild.centerY;
        const midY = node.centerY;

        const braceX = nodeX + (maxLenByDepth.get(depth) || node.visLen) + dashPad;

        const textEndX = nodeX + node.visLen;
        for (let x = textEndX; x <= braceX; x++) {
          if (x < maxColX && safeGetGrid(grid, midY, x, maxColX) === " ") {
            safeSetGrid(grid, midY, x, symK.dash, maxColX);
          }
        }

        const keyCol = braceX + 1;
        if (keyCol < maxColX) {
          if (topY === botY) {
            if (topY < totalRows && safeGetGrid(grid, midY, keyCol, maxColX) === " ") {
              safeSetGrid(grid, midY, keyCol, symK.dash, maxColX);
            }
          } else {
            if (topY < totalRows && safeGetGrid(grid, topY, keyCol, maxColX) === " ") {
              safeSetGrid(grid, topY, keyCol, symK.topCorner, maxColX);
            }
            if (botY < totalRows && safeGetGrid(grid, botY, keyCol, maxColX) === " ") {
              safeSetGrid(grid, botY, keyCol, symK.bottomCorner, maxColX);
            }
            for (let r = topY + 1; r < botY; r++) {
              if (r < totalRows && safeGetGrid(grid, r, keyCol, maxColX) === " ") {
                safeSetGrid(grid, r, keyCol, (r === midY) ? symK.cusp : symK.stem, maxColX);
              }
            }
          }
        }

        const outDashStart = keyCol + 1;
        for (const child of node.children) {
          const cY = child.centerY;
          for (let x = outDashStart; x < nextColX; x++) {
            if (x < maxColX && cY < totalRows && safeGetGrid(grid, cY, x, maxColX) === " ") {
              safeSetGrid(grid, cY, x, symK.dash, maxColX);
            }
          }
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
      return renderEmptyBlockPlaceholder(containerEl, "k", settings, t);
    }

    containerEl.empty();
    const preEl = containerEl.createEl("pre");
    preEl.addClass("ascii-tree-block");
    preEl.addClass("ascii-tree-k");
    preEl.addClass("no-line-numbers");
    if (settings.centerTreeK) {
      preEl.addClass("ascii-tree-center");
    }

    if (settings.enableLinkHover) {
      preEl.addClass("ascii-tree-hover-" + (settings.linkHoverStyle || "bold"));
    }

    const codeEl = preEl.createEl("code");
    const frag = document.createDocumentFragment();

    for (let j = 0; j < linesOutput.length; j++) {
      const sp = document.createElement("span");
      const lineText = linesOutput[j];

      renderLineContent(sp, lineText, noteMapInfo, app);

      frag.appendChild(sp);
      if (j < linesOutput.length - 1) {
        frag.appendChild(document.createTextNode("\n"));
      }
    }
    codeEl.appendChild(frag);
  } catch (err) {
    console.error("[ASCII Tree EX] Safe synoptic render caught exception:", err);
    renderEmptyBlockPlaceholder(containerEl, "k", settings, t);
  }
}
