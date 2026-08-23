export interface ParsedItem {
  level: number;
  leadingWhitespace: string;
  text: string;
}

export interface ParseResult {
  commonIndent: string;
  items: ParsedItem[]; // Already filtered for empty texts
}

export function parseSourceText(sourceText: string): ParseResult {
  const lines = sourceText.split("\n");
  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() !== "") {
      const match = line.match(/^([\t ]*)/);
      if (match && match[1].length < minIndent) minIndent = match[1].length;
    }
  }

  let commonIndent = "";
  if (minIndent !== Infinity && minIndent > 0) {
    const firstNonEmpty = lines.find((l) => l.trim() !== "");
    commonIndent = firstNonEmpty ? firstNonEmpty.slice(0, minIndent) : "";
  }

  const items = lines.map((line) => (line.startsWith(commonIndent) ? line.slice(commonIndent.length) : line)).map((line) => {
    const listMatch = line.match(/^([\t ]*)((?:[-*+─—–‒•⁃])|\d+\.)\s*(.*)$/);
    if (listMatch) {
      const indentStr = listMatch[1];
      const tabs = (indentStr.match(/\t/g) || []).length;
      const spaces = (indentStr.match(/ /g) || []).length;
      let level = tabs + Math.floor(spaces / 4);
      level++;
      return { level, leadingWhitespace: "", text: listMatch[3] ? listMatch[3].trim() : "" };
    }
    const headingMatch = line.match(/^(=+)\s?(.*)$/);
    if (headingMatch) {
      return { level: headingMatch[1].length, leadingWhitespace: "", text: headingMatch[2] ? headingMatch[2].trim() : "" };
    }
    return { level: 0, leadingWhitespace: "", text: line ? line.trim() : "" };
  }).filter((item) => item.text !== "");

  return { commonIndent, items };
}

export interface TreeNode {
  id: number;
  level: number;
  text: string;
  children: TreeNode[];
  parent: TreeNode | null;
  depth: number;
  [key: string]: any; 
}

export function buildNodeTree(items: ParsedItem[]): { nodes: TreeNode[], roots: TreeNode[] } {
  const nodes: TreeNode[] = items.map((it, idx) => ({
    id: idx,
    level: it.level,
    text: it.text,
    children: [],
    parent: null,
    depth: 0
  }));

  const stack: TreeNode[] = [];
  for (const node of nodes) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length > 0) {
      const parentNode = stack[stack.length - 1];
      parentNode.children.push(node);
      node.parent = parentNode;
    }
    stack.push(node);
  }

  const roots = nodes.filter((n) => n.parent === null);

  const setDepth = (node: TreeNode, d: number) => {
    node.depth = d;
    for (const c of node.children) {
      setDepth(c, d + 1);
    }
  };
  for (const root of roots) {
    setDepth(root, 0);
  }

  return { nodes, roots };
}
