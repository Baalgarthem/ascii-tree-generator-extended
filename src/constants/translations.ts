export const TRANSLATIONS = {
  es: {
    // Language setting
    langSettingName: "Idioma / Language",
    langSettingDesc: "Idioma de la interfaz de configuración.",
    langEs: "Español",
    langEn: "English",

    // Information section
    sectionBlockTypes: "Tipos de Bloques Disponibles",
    blockTypesDesc: "Todos los tipos de diagramas están habilitados por defecto. Puedes declararlos directamente en tus notas usando las cercas de código correspondientes:",
    infoTree:  "```tree — Árbol por defecto (lista con conectores ├── y └──)",
    infoTreeV: "```tree-v — Organigrama vertical Top-Down (diagrama en cajas centradas)",
    infoTreeK: "```tree-k — Cuadro sinóptico (diagrama por llaves centradas)",
    ghostTreeNotice: "✦ Nota pedagogica: La etiqueta ```tree genera siempre un árbol ASCII de lista tradicional por defecto. Para utilizar diagramas alternativos, debes declararlos explícitamente como ```tree-v o ```tree-k.",
    emptyBlockPlaceholder: "✦ Ingresa un título o elementos para generar el diagrama...",

    // Sections
    sectionAppearance: "Apariencia del Árbol",
    sectionTitle:      "Línea de Título",
    sectionHover:      "Efectos al Pasar el Cursor",

    // Tree style
    treeStyleName: "Estilo de ramas",
    treeStyleDesc: "Elige el estilo visual de los conectores del árbol. Los cambios se aplican de inmediato.",
    styleClassic:   "Clásico      (├──, └──, │)",
    styleRounded:   "Redondeado   (├──, ╰──, │)",
    styleHeavy:     "Grueso       (┣━━, ┗━━, ┃)",
    styleDouble:    "Doble Línea  (╠══, ╚══, ║)",
    styleDotted:    "Punteado     (├──, └──, ┊)",
    styleSlim:      "Fino Dashed  (├╌╌, └╌╌, ╎)",
    styleAsciiplus: "ASCII Plus   (+--,  +--,  |)",
    styleArrows:    "Flechas      (╞══, ╘══, │)",

    // Connector dashes
    dashCountName: "Número de guiones",
    dashCountDesc: "Cuántos caracteres de guión siguen a cada símbolo de rama.",

    // Auto-slash
    autoSlashName: "Añadir / a carpetas",
    autoSlashDesc: "Agrega una barra diagonal a los elementos que tienen hijos.",

    // Title format
    titleFormatName:   "Formatear primera línea como título",
    titleFormatDesc:   "Aplica mayor tamaño de fuente y espaciado configurable a la primera línea del bloque.",
    titleSpacingName:  "Espaciado inferior del título (px)",
    titleSpacingDesc:  "Espacio entre la línea de título y el primer elemento del árbol. 0 = casi juntos.",

    // Hover
    hoverEnableName:  "Activar efecto al pasar el cursor",
    hoverEnableDesc:  "Resalta enlaces nativos de Obsidian y de Virtual Linker al pasar el cursor.",
    hoverStyleName:   "Estilo del hover",
    hoverStyleDesc:   "Efecto visual aplicado a los enlaces al pasar el cursor. Cambios inmediatos.",
    hoverBold:      "✦ Negrita — texto en negrita",
    hoverBorder:    "⬜ Borde — recuadro de contorno",
    hoverUnderline: "― Subrayado — subrayado animado",
    hoverHighlight: "🖊 Marcador — fondo de marcador de texto",
    hoverGlow:      "✦ Iluminación — resplandor suave",
    hoverPill:      "💊 Pastilla — fondo de color sólido",
    hoverNeon:      "⚡ Neón — brillo neón",
    hoverGhost:     "👻 Fantasma — marco punteado sutil",
    hoverBoldglow:  "✨ Negrita + Brillo — combinado",

    // Code block actions
    nextStyleTooltip: "Cambiar diseño (tree → tree-v → tree-k)",
    sortTreeTooltip: "Ordenar alfabéticamente (alternar A-Z / Z-A)",
    sortTreeTooltipAsc: "Ordenar alfabéticamente (A-Z)",
    sortTreeTooltipDesc: "Ordenar alfabéticamente (Z-A)",
  },
  en: {
    // Language setting
    langSettingName: "Idioma / Language",
    langSettingDesc: "Settings interface language.",
    langEs: "Español",
    langEn: "English",

    // Information section
    sectionBlockTypes: "Available Diagram Block Types",
    blockTypesDesc: "All diagram block types are enabled by default. Declare them directly in your notes using these code block tags:",
    infoTree:  "```tree — Default tree (list with ├── and └── connectors)",
    infoTreeV: "```tree-v — Vertical Top-Down Organigram (centered box chart)",
    infoTreeK: "```tree-k — Synoptic Diagram (centered key brace chart)",
    ghostTreeNotice: "✦ Notice: The ```tree tag always renders a traditional list ASCII tree by default. For alternative diagrams, explicitly declare ```tree-v or ```tree-k.",
    emptyBlockPlaceholder: "✦ Enter a title or tree elements to generate diagram...",

    // Sections
    sectionAppearance: "Tree Appearance",
    sectionTitle:      "Title Line",
    sectionHover:      "Link Hover Effects",

    // Tree style
    treeStyleName: "Tree branch style",
    treeStyleDesc: "Choose the visual style for branch connectors. Changes apply immediately to all rendered trees.",
    styleClassic:   "Classic      (├──, └──, │)",
    styleRounded:   "Rounded      (├──, ╰──, │)",
    styleHeavy:     "Heavy        (┣━━, ┗━━, ┃)",
    styleDouble:    "Double Line  (╠══, ╚══, ║)",
    styleDotted:    "Dotted Stem  (├──, └──, ┊)",
    styleSlim:      "Slim Dashed  (├╌╌, └╌╌, ╎)",
    styleAsciiplus: "ASCII Plus   (+--,  +--,  |)",
    styleArrows:    "Arrows       (╞══, ╘══, │)",

    // Connector dashes
    dashCountName: "Connector dashes",
    dashCountDesc: "Sets how many dash/connector characters follow each branch symbol.",

    // Auto-slash
    autoSlashName: "Auto-append / to folders",
    autoSlashDesc: "Automatically add a trailing slash to items that have children.",

    // Title format
    titleFormatName:  "Format first line as title",
    titleFormatDesc:  "Style the first line with larger text and configurable bottom spacing.",
    titleSpacingName: "Title bottom spacing (px)",
    titleSpacingDesc: "Space between the title line and the first tree element. 0 = almost touching.",

    // Hover
    hoverEnableName:  "Enable link hover effect",
    hoverEnableDesc:  "Highlight native Obsidian links and Virtual Linker links on mouse hover.",
    hoverStyleName:   "Link hover style",
    hoverStyleDesc:   "Visual effect applied to links on mouse hover. Changes apply instantly.",
    hoverBold:      "✦ Bold — bold text",
    hoverBorder:    "⬜ Border — outline box",
    hoverUnderline: "― Underline — animated underline",
    hoverHighlight: "🖊 Highlight — text marker background",
    hoverGlow:      "✦ Glow — soft glow",
    hoverPill:      "💊 Pill — solid color background",
    hoverNeon:      "⚡ Neon — neon glow",
    hoverGhost:     "👻 Ghost — subtle dashed frame",
    hoverBoldglow:  "✨ Bold + Glow — combined",

    // Code block actions
    nextStyleTooltip: "Change layout (tree → tree-v → tree-k)",
    sortTreeTooltip: "Sort alphabetically (toggle A-Z / Z-A)",
    sortTreeTooltipAsc: "Sort alphabetically (A-Z)",
    sortTreeTooltipDesc: "Sort alphabetically (Z-A)",
  }
};
