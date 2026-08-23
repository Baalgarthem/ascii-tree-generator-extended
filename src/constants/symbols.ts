export const STYLES: Record<string, any> = {
  classic:   { branch: "├", last: "└", dash: "─", stem: "│" },
  rounded:   { branch: "├", last: "╰", dash: "─", stem: "│" },
  heavy:     { branch: "┣", last: "┗", dash: "━", stem: "┃" },
  double:    { branch: "╠", last: "╚", dash: "═", stem: "║" },
  dotted:    { branch: "├", last: "└", dash: "─", stem: "┊" },
  slim:      { branch: "├", last: "└", dash: "╌", stem: "╎" },
  asciiplus: { branch: "+", last: "+", dash: "-", stem: "|" },
  arrows:    { branch: "╞", last: "╘", dash: "═", stem: "│" }
};

export const ORGANIGRAM_SYMBOLS: Record<string, any> = {
  classic:   { dash: "─", stem: "│", topCorner: "┌", topRightCorner: "┐", topT: "┬", bottomT: "┴", cross: "┼" },
  rounded:   { dash: "─", stem: "│", topCorner: "╭", topRightCorner: "╮", topT: "┬", bottomT: "┴", cross: "┼" },
  heavy:     { dash: "━", stem: "┃", topCorner: "┏", topRightCorner: "┓", topT: "┳", bottomT: "┻", cross: "╋" },
  double:    { dash: "═", stem: "║", topCorner: "╔", topRightCorner: "╗", topT: "╦", bottomT: "╩", cross: "╬" },
  dotted:    { dash: "─", stem: "┊", topCorner: "┌", topRightCorner: "┐", topT: "┬", bottomT: "┴", cross: "┼" },
  slim:      { dash: "╌", stem: "╎", topCorner: "┌", topRightCorner: "┐", topT: "┬", bottomT: "┴", cross: "┼" },
  asciiplus: { dash: "-", stem: "|", topCorner: "+", topRightCorner: "+", topT: "+", bottomT: "+", cross: "+" },
  arrows:    { dash: "═", stem: "│", topCorner: "┌", topRightCorner: "┐", topT: "╦", bottomT: "╩", cross: "╬" }
};

export const SYNOPTIC_SYMBOLS: Record<string, any> = {
  classic:   { dash: "─", stem: "│", topCorner: "┌", bottomCorner: "└", cusp: "├" },
  rounded:   { dash: "─", stem: "│", topCorner: "╭", bottomCorner: "╰", cusp: "├" },
  heavy:     { dash: "━", stem: "┃", topCorner: "┏", bottomCorner: "┗", cusp: "┣" },
  double:    { dash: "═", stem: "║", topCorner: "╔", bottomCorner: "╚", cusp: "╠" },
  dotted:    { dash: "─", stem: "┊", topCorner: "┌", bottomCorner: "└", cusp: "├" },
  slim:      { dash: "╌", stem: "╎", topCorner: "┌", bottomCorner: "└", cusp: "├" },
  asciiplus: { dash: "-", stem: "|", topCorner: "+", bottomCorner: "+", cusp: "+" },
  arrows:    { dash: "═", stem: "│", topCorner: "┌", bottomCorner: "└", cusp: "╞" }
};
