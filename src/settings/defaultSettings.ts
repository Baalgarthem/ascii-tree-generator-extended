export interface AsciiTreeSettings {
  language: string;
  enableTreeV: boolean;
  centerTreeV: boolean;
  enableTreeK: boolean;
  centerTreeK: boolean;
  dashCount: number;
  autoAppendSlash: boolean;
  treeStyle: string;
  enableLinkHover: boolean;
  linkHoverStyle: string;
  enableTitleFormat: boolean;
  titleFontSize: string;
  titleSpacing: number;
  fullscreenNavButtons: "always" | "mobile" | "never";
  fullscreenZoomButtons: "always" | "mobile" | "never";
  enableOverflowPulse: boolean;
  overflowPulseColor: string;
}

export const DEFAULT_SETTINGS: AsciiTreeSettings = {
  language: "es",
  enableTreeV: true,
  centerTreeV: true,
  enableTreeK: true,
  centerTreeK: true,
  dashCount: 2,
  autoAppendSlash: false,
  treeStyle: "classic",
  enableLinkHover: true,
  linkHoverStyle: "bold",
  enableTitleFormat: true,
  titleFontSize: "1.15em",
  titleSpacing: 12,
  fullscreenNavButtons: "always",
  fullscreenZoomButtons: "always",
  enableOverflowPulse: true,
  overflowPulseColor: "#e5a50a"
};
