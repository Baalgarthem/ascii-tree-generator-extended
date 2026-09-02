const assert = require("assert");

// Mock tree actions logic for node environment testing
function getCleanSortText(text) {
  if (!text) return "";
  let cleaned = text.replace(/\[\[([^\]\|]+)\|([^\]]+)\]\]/g, "$2");
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  cleaned = cleaned.replace(/[*_~=`]/g, "");
  return cleaned.trim();
}

function compareNodes(a, b, ascending = true) {
  const textA = getCleanSortText(a.text);
  const textB = getCleanSortText(b.text);
  const cmp = textA.localeCompare(textB, undefined, { sensitivity: "base", numeric: true });
  return ascending ? cmp : -cmp;
}

function parseSourceTreeHierarchy(sourceText) {
  const rawLines = sourceText.split("\n");
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

  const flatNodes = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

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

  const roots = [];
  const stack = [];

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

function isTreeSortedAscending(nodes) {
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

function sortNodeTree(nodes, ascending) {
  if (nodes.length > 1) {
    nodes.sort((a, b) => compareNodes(a, b, ascending));
  }
  for (const node of nodes) {
    if (node.children.length > 0) {
      sortNodeTree(node.children, ascending);
    }
  }
}

function serializeSourceTree(nodes) {
  const lines = [];
  for (const node of nodes) {
    lines.push(node.rawLine);
    if (node.children.length > 0) {
      lines.push(...serializeSourceTree(node.children));
    }
  }
  return lines;
}

function sortTreeSourceText(sourceText) {
  const { roots, leadingEmpty, trailingEmpty } = parseSourceTreeHierarchy(sourceText);
  if (roots.length === 0) return { newText: sourceText, isAscending: true };

  const currentlyAsc = isTreeSortedAscending(roots);
  const targetAsc = !currentlyAsc;

  sortNodeTree(roots, targetAsc);

  const sortedLines = serializeSourceTree(roots);
  const allLines = [...leadingEmpty, ...sortedLines, ...trailingEmpty];
  return { newText: allLines.join("\n"), isAscending: targetAsc };
}

// Tests
console.log("Running tree sorting tests...");

// Test 1: Clean sort text with wiki link custom text
assert.strictEqual(getCleanSortText("[[Fase escrita en derecho procesal laboral|Fase escrita]]"), "Fase escrita");
assert.strictEqual(getCleanSortText("[[Fase escrita]]"), "Fase escrita");
assert.strictEqual(getCleanSortText("[Texto](http://link.com)"), "Texto");
console.log("✔ Test 1: Clean sort text passed");

// Test 2: Sort tree ascending with title and nested items
const inputTree = `Etapas en el proceso de derecho laboral
- Conciliación prejudicial (obligatoria)
	- [[Fase escrita en derecho procesal laboral|Fase escrita]]
	- Audiencia preliminar
	- Audiencia de juicio
	- Sentencia`;

const resAsc = sortTreeSourceText(inputTree);
assert.strictEqual(resAsc.isAscending, true);
assert.ok(resAsc.newText.includes("Audiencia de juicio\n\t- Audiencia preliminar\n\t- [[Fase escrita en derecho procesal laboral|Fase escrita]]\n\t- Sentencia"));
console.log("✔ Test 2: Sort Ascending passed");

// Test 3: Sort tree descending on subsequent sort call
const resDesc = sortTreeSourceText(resAsc.newText);
assert.strictEqual(resDesc.isAscending, false);
assert.ok(resDesc.newText.includes("Sentencia\n\t- [[Fase escrita en derecho procesal laboral|Fase escrita]]\n\t- Audiencia preliminar\n\t- Audiencia de juicio"));
console.log("✔ Test 3: Sort Descending passed");

// Test 4: Multiple root levels without title
const inputMultiRoot = `- B
  - B2
  - B1
- A
  - A2
  - A1`;

const resMultiAsc = sortTreeSourceText(inputMultiRoot);
assert.strictEqual(resMultiAsc.isAscending, true);
assert.ok(resMultiAsc.newText.startsWith("- A\n  - A1\n  - A2\n- B\n  - B1\n  - B2"));
console.log("✔ Test 4: Multi-root sort passed");

console.log("All unit tests passed successfully!");
