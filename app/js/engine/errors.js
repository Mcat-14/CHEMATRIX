// Shared error type and HTML-safe text helpers for the engine.
// The engine never touches the DOM. Strings it returns may contain a small,
// fixed set of HTML tags (<sub>, <sup>, <b>, <i>, <span>) built ONLY through the
// helpers below, which escape every piece of dynamic text first.

export class ChemError extends Error {
  /** @param {string} message user-facing explanation (plain text) */
  constructor(message, field = null) {
    super(message);
    this.name = 'ChemError';
    this.field = field; // optional input field the problem relates to
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Variable with subscript, e.g. v('P','1') -> P<sub>1</sub> */
export function v(sym, sub = '') {
  return esc(sym) + (sub ? `<sub>${esc(sub)}</sub>` : '');
}

/**
 * Render a chemical formula as HTML: digits after an element/bracket become
 * subscripts, hydrate dots render as a middle dot, charges render as superscript.
 */
export function formulaHtml(formula) {
  let s = String(formula).trim();
  let charge = '';
  const m = s.match(/\^?([0-9]*[+-])$/);
  if (m && (m[0].startsWith('^') || /[A-Za-z)\]]/.test(s.slice(0, -m[0].length).slice(-1) || ''))) {
    charge = m[1];
    s = s.slice(0, -m[0].length);
  }
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[0-9]/.test(ch)) {
      const prev = s[i - 1];
      // digits that follow a letter or closing bracket are subscripts;
      // digits at the start or after a hydrate dot are coefficients
      if (prev && /[A-Za-z)\]]/.test(prev)) {
        let j = i;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        out += `<sub>${s.slice(i, j)}</sub>`;
        i = j - 1;
        continue;
      }
      out += ch;
    } else if (ch === '*' || ch === '·' || ch === '.') {
      out += '·';
    } else {
      out += esc(ch);
    }
  }
  if (charge) out += `<sup>${esc(charge)}</sup>`;
  return out;
}
