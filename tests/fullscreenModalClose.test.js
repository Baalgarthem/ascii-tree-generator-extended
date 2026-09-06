const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

console.log("Running fullscreen modal close button redundancy verification test...");

const code = fs.readFileSync("dist/main.js", "utf8");
const css = fs.readFileSync("dist/styles.css", "utf8");

// 1. Verify CSS rules
assert.ok(
  css.includes(".modal-container.ascii-tree-fs-active .modal-close-button") ||
  css.includes(".ascii-tree-fullscreen-modal-window .modal-close-button"),
  "CSS must include rules targeting .modal-close-button"
);
assert.ok(
  css.includes("display: none !important"),
  "CSS must suppress .modal-close-button with display: none !important"
);

class MockElement {
  constructor(tag = "div", cls = "") {
    this.tagName = tag.toUpperCase();
    this.classes = new Set(cls.split(" ").filter(Boolean));
    this.children = [];
    this.parentElement = null;
    this.style = {
      setProperty: (k, v, p) => { this.style[k] = v; }
    };
    this.attributes = {};
    this.eventListeners = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  getAttribute(k) { return this.attributes[k]; }
  addClass(c) { this.classes.add(c); return this; }
  removeClass(c) { this.classes.delete(c); return this; }
  hasClass(c) { return this.classes.has(c); }
  createDiv(opts = {}) {
    const el = new MockElement("div", opts.cls || "");
    this.appendChild(el);
    return el;
  }
  createSpan(opts = {}) {
    const el = new MockElement("span", opts.cls || "");
    if (opts.text) el.textContent = opts.text;
    this.appendChild(el);
    return el;
  }
  createEl(tag, opts = {}) {
    const el = new MockElement(tag, opts.cls || "");
    if (opts.text) el.textContent = opts.text;
    if (opts.attr) el.attributes = { ...opts.attr };
    this.appendChild(el);
    return el;
  }
  empty() {
    this.children = [];
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }
  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) {
        this.parentElement.children.splice(idx, 1);
      }
      this.parentElement = null;
    }
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (node) => {
      for (const child of node.children) {
        if (sel === ".modal-close-button" && child.hasClass("modal-close-button")) {
          results.push(child);
        } else if (sel.includes("ascii-tree-fs-btn-close-red") && child.hasClass("ascii-tree-fs-btn-close-red")) {
          results.push(child);
        } else if (sel.includes("ascii-tree-btn-fullscreen") && child.hasClass("ascii-tree-btn-fullscreen")) {
          results.push(child);
        }
        check(child);
      }
    };
    check(this);
    return results;
  }
  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }
  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }
  trigger(evt, data = {}) {
    if (this.eventListeners[evt]) {
      for (const fn of this.eventListeners[evt]) {
        fn({
          preventDefault: () => {},
          stopPropagation: () => {},
          target: this,
          ...data
        });
      }
    }
  }
  getBoundingClientRect() {
    return { width: 800, height: 600, top: 0, left: 0 };
  }
}

let activeModalInstance = null;

class MockModal {
  constructor(app) {
    this.app = app;
    this.scope = { register: () => {} };
    this.containerEl = new MockElement("div", "modal-container");
    this.modalEl = this.containerEl.createDiv({ cls: "modal" });
    // Obsidian natively attaches this.closeButtonEl inside modalEl or containerEl
    this.closeButtonEl = this.modalEl.createDiv({ cls: "modal-close-button" });
    this.contentEl = this.modalEl.createDiv({ cls: "modal-content" });
    activeModalInstance = this;
  }
  open() {
    this.onOpen();
  }
  close() {
    this.onClose();
  }
  onOpen() {}
  onClose() {}
}

const processors = {};

const mockObsidian = {
  Plugin: class {
    constructor(app, manifest) {
      this.app = app;
      this.manifest = manifest;
      this.settings = {};
    }
    loadData() { return Promise.resolve({ language: "es", dashCount: 2 }); }
    saveData() {}
    registerMarkdownCodeBlockProcessor(lang, fn) {
      processors[lang] = fn;
    }
    registerEvent() {}
    register() {}
    addCommand() {}
    addSettingTab() {}
  },
  Component: class {},
  PluginSettingTab: class {},
  Modal: MockModal,
  Setting: class { setName() { return this; } setDesc() { return this; } addDropdown() { return this; } addToggle() { return this; } addText() { return this; } addSlider() { return this; } addColorPicker() { return this; } },
  Notice: class {},
  Platform: { isMobile: false },
  setIcon: () => {},
  setTooltip: () => {},
  MarkdownPreviewRenderer: { unregisterCodeBlockPostProcessor: () => {} }
};

const req = function(name) {
  if (name === "obsidian") return mockObsidian;
  return require(name);
};

const sandbox = {
  require: req,
  console: console,
  document: {
    documentElement: { style: { setProperty: () => {} } },
    body: new MockElement("body"),
    createElement: (tag) => new MockElement(tag),
    createDocumentFragment: () => new MockElement("fragment"),
    createTextNode: (text) => new MockElement("text", text),
    querySelectorAll: () => []
  },
  window: {
    setTimeout: (fn) => fn(),
    requestAnimationFrame: (fn) => fn(),
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  setTimeout: (fn) => fn(),
  ResizeObserver: class { observe() {} disconnect() {} }
};
sandbox.window.window = sandbox.window;

const context = vm.createContext(sandbox);
const fn = vm.runInContext("(function(require, module, exports) {\n" + code + "\n})", context);

const moduleObj = { exports: {} };
fn(req, moduleObj, moduleObj.exports);

const PluginClass = moduleObj.exports.default || moduleObj.exports;
const app = {
  vault: { on: () => {}, getMarkdownFiles: () => [] },
  metadataCache: { on: () => {}, getFileCache: () => null }
};
const plugin = new PluginClass(app, { id: "ascii-tree-generator-extended" });

plugin.onload().then(() => {
  // Processor registered for 'tree'
  assert.ok(processors["tree"], "Markdown processor for 'tree' must be registered");

  const codeblockEl = new MockElement("div", "code-block-wrapper");
  const ctx = { sourcePath: "test.md" };
  const sourceText = "- Root\n  - Child 1\n  - Child 2";

  processors["tree"](sourceText, codeblockEl, ctx);

  // Find the fullscreen action button
  const fsBtn = codeblockEl.querySelector(".ascii-tree-btn-fullscreen");
  assert.ok(fsBtn, "Fullscreen button (.ascii-tree-btn-fullscreen) must be rendered in action bar");

  // Click fullscreen button
  fsBtn.trigger("click");

  assert.ok(activeModalInstance, "A FullscreenTreeModal must be opened when clicking fullscreen button");

  // 1. Verify that the native close button has been completely removed from DOM
  const nativeCloseButtons = activeModalInstance.containerEl.querySelectorAll(".modal-close-button");
  assert.strictEqual(
    nativeCloseButtons.length,
    0,
    "Native Obsidian top-right .modal-close-button must be completely removed from DOM"
  );

  // 2. Verify that the bottom bar close button exists and has the proper red styling class
  const bottomBarCloseButtons = activeModalInstance.containerEl.querySelectorAll(".ascii-tree-fs-btn-close-red");
  assert.strictEqual(
    bottomBarCloseButtons.length,
    1,
    "Exactly ONE bottom-bar close button with .ascii-tree-fs-btn-close-red must prevail"
  );

  console.log("✔ Test 1: Native top-right close button eliminated successfully");
  console.log("✔ Test 2: Bottom horizontal bar red close button prevails exclusively");
  console.log("✔ Fullscreen modal close button redundancy verification PASSED!");
  process.exit(0);
}).catch((err) => {
  console.error("✖ Test failed:", err);
  process.exit(1);
});
