const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

console.log("Running plugin lifecycle and load verification test...");

const code = fs.readFileSync("dist/main.js", "utf8");

class Component {
  addChild(c) { return c; }
  register(f) {}
  registerEvent(e) {}
}

class Plugin extends Component {
  constructor(app, manifest) {
    super();
    this.app = app;
    this.manifest = manifest;
    this._loaded = false;
  }
  async load() {
    this._loaded = true;
    await this.onload();
  }
  async loadData() {
    return { language: "es", dashCount: 2 };
  }
  async saveData(d) {}
  registerMarkdownCodeBlockProcessor(lang, handler) {}
  addCommand(cmd) {}
  addSettingTab(tab) {}
}

const mockObsidian = {
  Plugin,
  Component,
  PluginSettingTab: class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; } },
  Modal: class Modal { constructor(app) { this.app = app; this.scope = { register() {} }; } },
  Setting: class Setting { constructor() { return this; } setName() { return this; } setDesc() { return this; } addDropdown() { return this; } addToggle() { return this; } addText() { return this; } addSlider() { return this; } addColorPicker() { return this; } },
  Notice: class Notice {},
  Platform: { isMobile: false },
  setIcon: () => {},
  setTooltip: () => {},
  MarkdownPreviewRenderer: {
    unregisterCodeBlockPostProcessor: () => {}
  }
};

const req = function(name) {
  if (name === "obsidian") return mockObsidian;
  return require(name);
};

const docElement = {
  style: {
    setProperty: (k, v) => {}
  }
};

const sandbox = {
  require: req,
  console: console,
  document: {
    documentElement: docElement,
    body: { hasClass: () => false, addClass: () => {}, removeClass: () => {} },
    createElement: () => ({ style: {}, addEventListener: () => {} }),
    querySelectorAll: () => []
  },
  window: {},
  ResizeObserver: class ResizeObserver { observe() {} disconnect() {} }
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
const fn = vm.runInContext("(function(require, module, exports) {\n" + code + "\n})", context);

const moduleObj = { exports: {} };
fn(req, moduleObj, moduleObj.exports);
const PluginClass = moduleObj.exports.default || moduleObj.exports;

assert(typeof PluginClass === "function", "Plugin must export a constructor");

const app = {
  vault: {
    on: (evt, cb) => ({ evt, cb }),
    getMarkdownFiles: () => []
  },
  metadataCache: {
    on: (evt, cb) => ({ evt, cb }),
    getFileCache: () => null
  }
};

const manifest = { id: "ascii-tree-generator-extended", name: "ASCII Tree Generator Extended" };
const inst = new PluginClass(app, manifest);

inst.load().then(() => {
  assert(inst._loaded === true, "Plugin._loaded must be true");
  assert(inst.settings.dashCount === 2, "Settings should be loaded");
  console.log("✔ Plugin lifecycle and load test PASSED!");
  process.exit(0);
}).catch(err => {
  console.error("✖ Plugin load test FAILED:", err);
  process.exit(1);
});
