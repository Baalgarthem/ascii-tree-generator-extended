import { App, Modal, Platform, setIcon, setTooltip, Notice } from "obsidian";
import { renderTreeClassic } from "../renderers/renderClassic";
import { renderTreeVertical } from "../renderers/renderVertical";
import { renderTreeSynoptic } from "../renderers/renderSynoptic";

export class FullscreenTreeModal extends Modal {
  plugin: any;
  sourceText: string;
  currentMode: string | null;
  sourcePath: string;

  // Pan & Zoom state
  panX: number = 0;
  panY: number = 0;
  zoom: number = 1.0;
  minZoom: number = 0.2;
  maxZoom: number = 5.0;

  // Drag state
  isDragging: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;

  // Touch state
  lastTouchDistance: number = 0;

  // DOM Elements
  viewportEl!: HTMLElement;
  canvasContainerEl!: HTMLElement;
  diagramEl!: HTMLElement;
  zoomDisplayEl!: HTMLElement;

  constructor(
    app: App,
    plugin: any,
    sourceText: string,
    currentMode: string | null,
    sourcePath: string = ""
  ) {
    super(app);
    this.plugin = plugin;
    this.sourceText = sourceText;
    this.currentMode = currentMode;
    this.sourcePath = sourcePath;
  }

  t(key: string): string {
    return this.plugin.t ? this.plugin.t(key) : key;
  }

  onOpen(): void {
    const { contentEl, modalEl, containerEl } = this;
    contentEl.empty();

    // Configure true fullscreen container & modal classes
    containerEl.addClass("ascii-tree-fs-active");
    modalEl.addClass("ascii-tree-fullscreen-modal-window");
    contentEl.addClass("ascii-tree-fullscreen-modal-content");

    // Remove redundant native top-right close button so only the bottom bar close button prevails
    this.removeDefaultCloseButton();

    // 1. Central Canvas Viewport Zone (Preview panel - diagram is strictly contained inside)
    this.buildViewport(contentEl);

    // 2. Bottom Bar (Horizontal single line containing all controls, ending with red-contoured Close button)
    this.buildBottomBar(contentEl);

    // 3. Register Keyboard, Mouse & Touch Listeners
    this.registerEventListeners();

    // 4. Render tree diagram inside central canvas
    this.renderDiagram();

    // 5. Initial centering after DOM measurement and re-verify close button removal
    setTimeout(() => {
      this.centerDiagram();
      this.removeDefaultCloseButton();
    }, 60);
  }

  onClose(): void {
    const { contentEl, containerEl } = this;
    containerEl.removeClass("ascii-tree-fs-active");
    contentEl.empty();
  }

  private removeDefaultCloseButton(): void {
    if ((this as any).closeButtonEl) {
      const btn = (this as any).closeButtonEl as HTMLElement;
      btn.addClass("ascii-tree-fs-hide-close");
      btn.style.setProperty("display", "none", "important");
      btn.style.setProperty("visibility", "hidden", "important");
      btn.remove();
    }
    const closeSelectors = [
      ...Array.from(this.containerEl.querySelectorAll(".modal-close-button")),
      ...Array.from(this.modalEl.querySelectorAll(".modal-close-button"))
    ];
    for (const btn of closeSelectors) {
      const el = btn as HTMLElement;
      el.addClass("ascii-tree-fs-hide-close");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.remove();
    }
  }

  private buildViewport(container: HTMLElement): void {
    this.viewportEl = container.createDiv({ cls: "ascii-tree-fs-viewport" });
    this.canvasContainerEl = this.viewportEl.createDiv({ cls: "ascii-tree-fs-canvas" });
    this.diagramEl = this.canvasContainerEl.createDiv({ cls: "ascii-tree-fs-diagram" });
  }

  private buildBottomBar(container: HTMLElement): void {
    const isMobile = Platform.isMobile;
    const navSetting = this.plugin.settings?.fullscreenNavButtons || "always";
    const zoomSetting = this.plugin.settings?.fullscreenZoomButtons || "always";

    const showNav = navSetting === "always" || (navSetting === "mobile" && isMobile);
    const showZoom = zoomSetting === "always" || (zoomSetting === "mobile" && isMobile);

    const bottomBar = container.createDiv({ cls: "ascii-tree-fs-bottombar" });
    const barContent = bottomBar.createDiv({ cls: "ascii-tree-fs-bottombar-inner" });

    // 1. Zoom Controls (Horizontal)
    if (showZoom) {
      const zoomGroup = barContent.createDiv({ cls: "ascii-tree-fs-ctrl-group ascii-tree-fs-zoom-group" });

      const zoomInBtn = zoomGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenZoomIn") }
      });
      setIcon(zoomInBtn, "plus");
      setTooltip(zoomInBtn, this.t("fullscreenZoomIn"));
      zoomInBtn.addEventListener("click", () => this.changeZoom(0.2));

      this.zoomDisplayEl = zoomGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn ascii-tree-fs-btn-reset-zoom",
        attr: { type: "button", "aria-label": this.t("fullscreenResetZoom") },
        text: "100%"
      });
      setTooltip(this.zoomDisplayEl, this.t("fullscreenResetZoom"));
      this.zoomDisplayEl.addEventListener("click", () => this.resetZoom());

      const zoomOutBtn = zoomGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenZoomOut") }
      });
      setIcon(zoomOutBtn, "minus");
      setTooltip(zoomOutBtn, this.t("fullscreenZoomOut"));
      zoomOutBtn.addEventListener("click", () => this.changeZoom(-0.2));
    }

    // Divider if both zoom and nav are shown
    if (showZoom && showNav) {
      barContent.createDiv({ cls: "ascii-tree-fs-bar-divider" });
    }

    // 2. Navigation Controls (Horizontal Single Line: Left, Up, Down, Right, Center)
    if (showNav) {
      const navGroup = barContent.createDiv({ cls: "ascii-tree-fs-ctrl-group ascii-tree-fs-nav-group" });

      const leftBtn = navGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenPanLeft") }
      });
      setIcon(leftBtn, "arrow-left");
      setTooltip(leftBtn, this.t("fullscreenPanLeft"));
      leftBtn.addEventListener("click", () => this.pan(60, 0));

      const upBtn = navGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenPanUp") }
      });
      setIcon(upBtn, "arrow-up");
      setTooltip(upBtn, this.t("fullscreenPanUp"));
      upBtn.addEventListener("click", () => this.pan(0, 60));

      const downBtn = navGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenPanDown") }
      });
      setIcon(downBtn, "arrow-down");
      setTooltip(downBtn, this.t("fullscreenPanDown"));
      downBtn.addEventListener("click", () => this.pan(0, -60));

      const rightBtn = navGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn",
        attr: { type: "button", "aria-label": this.t("fullscreenPanRight") }
      });
      setIcon(rightBtn, "arrow-right");
      setTooltip(rightBtn, this.t("fullscreenPanRight"));
      rightBtn.addEventListener("click", () => this.pan(-60, 0));

      const centerBtn = navGroup.createEl("button", {
        cls: "ascii-tree-fs-ctrl-btn ascii-tree-fs-btn-center",
        attr: { type: "button", "aria-label": this.t("fullscreenPanCenter") }
      });
      setIcon(centerBtn, "crosshair");
      centerBtn.createSpan({ text: this.t("fullscreenPanCenter"), cls: "ascii-tree-fs-btn-center-label" });
      setTooltip(centerBtn, this.t("fullscreenPanCenter"));
      centerBtn.addEventListener("click", () => this.centerDiagram());
    }

    // Divider
    barContent.createDiv({ cls: "ascii-tree-fs-bar-divider" });

    // 3. Export Controls (Export with background & Export transparent)
    const exportGroup = barContent.createDiv({ cls: "ascii-tree-fs-ctrl-group ascii-tree-fs-export-group" });

    const exportBgBtn = exportGroup.createEl("button", {
      cls: "ascii-tree-fs-ctrl-btn ascii-tree-fs-btn-export",
      attr: { type: "button", "aria-label": this.t("fullscreenExportBg") }
    });
    setIcon(exportBgBtn, "image");
    exportBgBtn.createSpan({ text: this.t("fullscreenExportBg"), cls: "ascii-tree-fs-btn-label" });
    setTooltip(exportBgBtn, this.t("fullscreenExportBg"));
    exportBgBtn.addEventListener("click", () => this.exportToImage(false));

    const exportTransBtn = exportGroup.createEl("button", {
      cls: "ascii-tree-fs-ctrl-btn ascii-tree-fs-btn-export-trans",
      attr: { type: "button", "aria-label": this.t("fullscreenExportTransparent") }
    });
    setIcon(exportTransBtn, "layers");
    exportTransBtn.createSpan({ text: this.t("fullscreenExportTransparent"), cls: "ascii-tree-fs-btn-label" });
    setTooltip(exportTransBtn, this.t("fullscreenExportTransparent"));
    exportTransBtn.addEventListener("click", () => this.exportToImage(true));

    // Divider
    barContent.createDiv({ cls: "ascii-tree-fs-bar-divider" });

    // 4. Close Button (Last button in row, with red outline/border)
    const closeGroup = barContent.createDiv({ cls: "ascii-tree-fs-ctrl-group ascii-tree-fs-close-group" });

    const closeBtn = closeGroup.createEl("button", {
      cls: "ascii-tree-fs-ctrl-btn ascii-tree-fs-btn-close-red",
      attr: { type: "button", "aria-label": this.t("fullscreenClose") }
    });
    setIcon(closeBtn, "x");
    setTooltip(closeBtn, this.t("fullscreenClose"));
    closeBtn.addEventListener("click", () => this.close());
  }

  private renderDiagram(): void {
    const a = this.plugin.settings?.dashCount ?? 2;
    const noteMapInfo = this.plugin.getVaultNoteMapInfo ? this.plugin.getVaultNoteMapInfo() : null;

    if (this.currentMode === "v") {
      renderTreeVertical(this.sourceText, this.diagramEl, this.plugin.settings, a, noteMapInfo, this.app, (k) => this.t(k), this.sourcePath);
    } else if (this.currentMode === "k") {
      renderTreeSynoptic(this.sourceText, this.diagramEl, this.plugin.settings, a, noteMapInfo, this.app, (k) => this.t(k), this.sourcePath);
    } else {
      renderTreeClassic(this.sourceText, this.diagramEl, this.plugin.settings, a, noteMapInfo, this.app, (k) => this.t(k), this.sourcePath);
    }
  }

  private updateTransform(): void {
    if (!this.canvasContainerEl) return;
    this.canvasContainerEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    if (this.zoomDisplayEl) {
      this.zoomDisplayEl.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  private changeZoom(delta: number, pivotX?: number, pivotY?: number): void {
    const oldZoom = this.zoom;
    let newZoom = Math.min(Math.max(oldZoom + delta, this.minZoom), this.maxZoom);
    newZoom = Math.round(newZoom * 100) / 100;

    if (newZoom === oldZoom) return;

    if (pivotX !== undefined && pivotY !== undefined) {
      const rect = this.viewportEl.getBoundingClientRect();
      const vx = pivotX - rect.left;
      const vy = pivotY - rect.top;

      // Zoom towards cursor
      this.panX = vx - (vx - this.panX) * (newZoom / oldZoom);
      this.panY = vy - (vy - this.panY) * (newZoom / oldZoom);
    }

    this.zoom = newZoom;
    this.updateTransform();
  }

  private resetZoom(): void {
    this.zoom = 1.0;
    this.updateTransform();
  }

  private pan(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.updateTransform();
  }

  private centerDiagram(): void {
    if (!this.viewportEl || !this.diagramEl) return;
    const vpRect = this.viewportEl.getBoundingClientRect();
    const dRect = this.diagramEl.getBoundingClientRect();

    // Center the diagram in the central viewport
    this.zoom = 1.0;
    const diagramWidth = dRect.width > 0 ? dRect.width : 400;
    const diagramHeight = dRect.height > 0 ? dRect.height : 300;
    this.panX = Math.max(30, Math.floor((vpRect.width - diagramWidth) / 2));
    this.panY = Math.max(30, Math.floor((vpRect.height - diagramHeight) / 2));
    this.updateTransform();
  }

  private registerEventListeners(): void {
    // 1. Mouse Drag (Pan)
    this.viewportEl.addEventListener("mousedown", (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a, button, .ascii-tree-fs-btn, .ascii-tree-fs-ctrl-btn")) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      this.viewportEl.addClass("is-dragging");
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
      this.updateTransform();
    });

    window.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.viewportEl.removeClass("is-dragging");
      }
    });

    // 2. Mouse Wheel (Zoom)
    this.viewportEl.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
      this.changeZoom(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    // 3. Touch Drag & Pinch-to-zoom (Mobile)
    this.viewportEl.addEventListener("touchstart", (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("a, button")) return;
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX - this.panX;
        this.dragStartY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    this.viewportEl.addEventListener("touchmove", (e: TouchEvent) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - this.dragStartX;
        this.panY = e.touches[0].clientY - this.dragStartY;
        this.updateTransform();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (this.lastTouchDistance > 0) {
          const delta = (dist - this.lastTouchDistance) * 0.005;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          this.changeZoom(delta, midX, midY);
        }
        this.lastTouchDistance = dist;
      }
    }, { passive: true });

    this.viewportEl.addEventListener("touchend", () => {
      this.isDragging = false;
      this.lastTouchDistance = 0;
    });

    // 4. Keyboard Navigation (Arrow keys, +, -, 0, Escape)
    this.scope.register([], "ArrowUp", (e) => { e.preventDefault(); this.pan(0, 40); });
    this.scope.register([], "ArrowDown", (e) => { e.preventDefault(); this.pan(0, -40); });
    this.scope.register([], "ArrowLeft", (e) => { e.preventDefault(); this.pan(40, 0); });
    this.scope.register([], "ArrowRight", (e) => { e.preventDefault(); this.pan(-40, 0); });
    this.scope.register(["Shift"], "ArrowUp", (e) => { e.preventDefault(); this.pan(0, 120); });
    this.scope.register(["Shift"], "ArrowDown", (e) => { e.preventDefault(); this.pan(0, -120); });
    this.scope.register(["Shift"], "ArrowLeft", (e) => { e.preventDefault(); this.pan(120, 0); });
    this.scope.register(["Shift"], "ArrowRight", (e) => { e.preventDefault(); this.pan(-120, 0); });
    this.scope.register([], "+", (e) => { e.preventDefault(); this.changeZoom(0.2); });
    this.scope.register([], "=", (e) => { e.preventDefault(); this.changeZoom(0.2); });
    this.scope.register([], "-", (e) => { e.preventDefault(); this.changeZoom(-0.2); });
    this.scope.register([], "0", (e) => { e.preventDefault(); this.resetZoom(); });
  }

  /**
   * High-definition Canvas Image Export (PNG) with or without background.
   */
  private exportToImage(transparent: boolean): void {
    try {
      const preEl = this.diagramEl.querySelector("pre.ascii-tree-block");
      if (!preEl) {
        new Notice("No se pudo obtener el contenido del árbol para exportar.");
        return;
      }

      // Extract lines text
      const rawText = preEl.textContent || "";
      const lines = rawText.split("\n");
      if (lines.length === 0) return;

      // Measure dimensions
      const padding = 32;
      const fontSize = 15;
      const lineHeight = Math.round(fontSize * 1.45);
      const font = `${fontSize}px "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace`;

      // Measure longest line using dummy canvas
      const testCanvas = document.createElement("canvas");
      const testCtx = testCanvas.getContext("2d");
      if (!testCtx) return;
      testCtx.font = font;

      let maxLineWidth = 0;
      for (const line of lines) {
        const metrics = testCtx.measureText(line);
        if (metrics.width > maxLineWidth) {
          maxLineWidth = metrics.width;
        }
      }

      const totalWidth = Math.ceil(maxLineWidth + padding * 2);
      const totalHeight = Math.ceil(lines.length * lineHeight + padding * 2);

      // Create retina 2x canvas
      const scaleDpr = 2;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = totalWidth * scaleDpr;
      exportCanvas.height = totalHeight * scaleDpr;

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scaleDpr, scaleDpr);

      // Background
      if (!transparent) {
        const bgColor = getComputedStyle(document.body).getPropertyValue("--background-primary").trim() || "#1e1e1e";
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, totalWidth, totalHeight);
      } else {
        ctx.clearRect(0, 0, totalWidth, totalHeight);
      }

      // Text settings
      const textColor = getComputedStyle(document.body).getPropertyValue("--text-normal").trim() || "#dcddde";
      ctx.fillStyle = textColor;
      ctx.font = font;
      ctx.textBaseline = "top";

      // Draw lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const y = padding + i * lineHeight;
        ctx.fillText(line, padding, y);
      }

      // Download PNG
      exportCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const modeTag = this.currentMode || "tree";
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `ascii-tree-${modeTag}-${dateStr}${transparent ? "-trans" : ""}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        new Notice(this.t("fullscreenExportSuccess"));
      }, "image/png");
    } catch (err) {
      console.error("[ASCII Tree EX] Error exporting tree image:", err);
      new Notice("Error al exportar imagen: " + String(err));
    }
  }
}
