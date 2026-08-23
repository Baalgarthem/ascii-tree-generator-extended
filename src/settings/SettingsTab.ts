import { App, PluginSettingTab, Setting } from "obsidian";
import type { AsciiTreeSettings } from "./defaultSettings";

// We need a plugin interface so we don't have to import the Main class directly
interface AsciiTreePlugin {
  app: App;
  settings: AsciiTreeSettings;
  t(key: string): string;
  saveSettings(): Promise<void>;
  applyCSSVars(): void;
  rerenderAllBlocks(): void;
  updateHoverClasses(): void;
}

export class AsciiTreeSettingTab extends PluginSettingTab {
  plugin: AsciiTreePlugin;

  constructor(app: App, plugin: AsciiTreePlugin) {
    super(app, plugin as any);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    const T = (key: string) => this.plugin.t(key);

    const headerDiv = containerEl.createEl("div");
    headerDiv.style.marginBottom = "18px";
    headerDiv.createEl("h2", { text: "ASCII Tree Generator Extended" });
    
    const authorP = headerDiv.createEl("p", { cls: "setting-item-description" });
    authorP.style.marginTop = "-6px";
    authorP.createEl("span", { text: "Desarrollado por " });
    authorP.createEl("a", { text: "Baalgarthem", href: "https://github.com/Baalgarthem" });

    new Setting(containerEl)
      .setName(T("langSettingName"))
      .setDesc(T("langSettingDesc"))
      .addDropdown((s) =>
        s
          .addOption("es", T("langEs"))
          .addOption("en", T("langEn"))
          .setValue(this.plugin.settings.language || "es")
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    containerEl.createEl("h3", { text: T("sectionBlockTypes") });
    
    const infoDiv = containerEl.createEl("div", { cls: "setting-item-description" });
    infoDiv.style.marginBottom = "14px";
    infoDiv.style.lineHeight = "1.5";
    infoDiv.createEl("p", { text: T("blockTypesDesc") });
    
    const ul = infoDiv.createEl("ul");
    ul.style.marginTop = "6px";
    ul.style.paddingLeft = "20px";
    ul.createEl("li", { text: T("infoTree") });
    ul.createEl("li", { text: T("infoTreeV") });
    ul.createEl("li", { text: T("infoTreeK") });

    containerEl.createEl("h3", { text: T("sectionAppearance") });

    new Setting(containerEl)
      .setName(T("treeStyleName"))
      .setDesc(T("treeStyleDesc"))
      .addDropdown((s) =>
        s
          .addOption("classic",   T("styleClassic"))
          .addOption("rounded",   T("styleRounded"))
          .addOption("heavy",     T("styleHeavy"))
          .addOption("double",    T("styleDouble"))
          .addOption("dotted",    T("styleDotted"))
          .addOption("slim",      T("styleSlim"))
          .addOption("asciiplus", T("styleAsciiplus"))
          .addOption("arrows",    T("styleArrows"))
          .setValue(this.plugin.settings.treeStyle || "classic")
          .onChange(async (value) => {
            this.plugin.settings.treeStyle = value;
            await this.plugin.saveSettings();
            this.plugin.rerenderAllBlocks();
          })
      );

    new Setting(containerEl)
      .setName(T("dashCountName"))
      .setDesc(T("dashCountDesc"))
      .addSlider((s) =>
        s
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.dashCount)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.dashCount = value;
            await this.plugin.saveSettings();
            this.plugin.rerenderAllBlocks();
          })
      );

    new Setting(containerEl)
      .setName(T("autoSlashName"))
      .setDesc(T("autoSlashDesc"))
      .addToggle((s) =>
        s.setValue(this.plugin.settings.autoAppendSlash).onChange(async (value) => {
          this.plugin.settings.autoAppendSlash = value;
          await this.plugin.saveSettings();
          this.plugin.rerenderAllBlocks();
        })
      );

    containerEl.createEl("h3", { text: T("sectionTitle") });

    new Setting(containerEl)
      .setName(T("titleFormatName"))
      .setDesc(T("titleFormatDesc"))
      .addToggle((s) =>
        s.setValue(this.plugin.settings.enableTitleFormat).onChange(async (value) => {
          this.plugin.settings.enableTitleFormat = value;
          await this.plugin.saveSettings();
          this.plugin.rerenderAllBlocks();
        })
      );

    new Setting(containerEl)
      .setName(T("titleSpacingName"))
      .setDesc(T("titleSpacingDesc"))
      .addSlider((s) =>
        s
          .setLimits(0, 40, 1)
          .setValue(this.plugin.settings.titleSpacing ?? 12)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.titleSpacing = value;
            await this.plugin.saveSettings();
            this.plugin.applyCSSVars();
          })
      );

    containerEl.createEl("h3", { text: T("sectionHover") });

    new Setting(containerEl)
      .setName(T("hoverEnableName"))
      .setDesc(T("hoverEnableDesc"))
      .addToggle((s) =>
        s.setValue(this.plugin.settings.enableLinkHover).onChange(async (value) => {
          this.plugin.settings.enableLinkHover = value;
          await this.plugin.saveSettings();
          this.plugin.updateHoverClasses();
        })
      );

    new Setting(containerEl)
      .setName(T("hoverStyleName"))
      .setDesc(T("hoverStyleDesc"))
      .addDropdown((s) =>
        s
          .addOption("bold",      T("hoverBold"))
          .addOption("border",    T("hoverBorder"))
          .addOption("underline", T("hoverUnderline"))
          .addOption("highlight", T("hoverHighlight"))
          .addOption("glow",      T("hoverGlow"))
          .addOption("pill",      T("hoverPill"))
          .addOption("neon",      T("hoverNeon"))
          .addOption("ghost",     T("hoverGhost"))
          .addOption("boldglow",  T("hoverBoldglow"))
          .setValue(this.plugin.settings.linkHoverStyle || "bold")
          .onChange(async (value) => {
            this.plugin.settings.linkHoverStyle = value;
            await this.plugin.saveSettings();
            this.plugin.updateHoverClasses();
          })
      );
  }
}
