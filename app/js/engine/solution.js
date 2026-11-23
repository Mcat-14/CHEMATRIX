// A common, structured solution format shared by every solver, so the UI can
// display the same 9 parts for every calculator: given, unknown, formula,
// definitions, conversions, substitution, calculation, answer, interpretation.
import { fmtWork, enteredText } from './numbers.js';
import { esc } from './errors.js';

export class Solution {
  constructor(tool, title) {
    this.tool = tool;
    this.title = title;
    this.given = [];       // { symbol (html), label, display (html) }
    this.unknown = null;   // { symbol (html), label }
    this.formula = null;   // html
    this.rearranged = null;// html
    this.definitions = []; // { symbol (html), meaning, unit }
    this.conversions = []; // html lines
    this.substitution = null; // html
    this.steps = [];       // { title, html } calculation steps
    this.answers = [];     // { label, symbol, value, unit (html), unitText, ruleSf, primary }
    this.interpretation = null; // html
    this.assumptions = []; // plain text
    this.warnings = [];    // plain text
    this.tables = [];      // { caption, head: [], rows: [[]] } (html cells)
    this.chart = null;     // optional chart spec for the UI
  }
  give(symbol, label, value, unitHtml = '') {
    this.given.push({ symbol, label, display: `${typeof value === 'number' ? (enteredText(value) !== undefined ? esc(enteredText(value)) : fmtWork(value)) : value}${unitHtml ? ' ' + unitHtml : ''}` });
    return this;
  }
  find(symbol, label) { this.unknown = { symbol, label }; return this; }
  define(symbol, meaning, unit = '') { this.definitions.push({ symbol, meaning, unit }); return this; }
  convert(html) { this.conversions.push(html); return this; }
  step(title, html) { this.steps.push({ title, html }); return this; }
  answer(label, symbol, value, unit, ruleSf, unitText = null, extra = {}) {
    this.answers.push({ label, symbol, value, unit, unitText: unitText ?? unit.replace(/<[^>]+>/g, ''), ruleSf, primary: this.answers.length === 0, ...extra });
    return this;
  }
  assume(text) { if (!this.assumptions.includes(text)) this.assumptions.push(text); return this; }
  warn(text) { if (!this.warnings.includes(text)) this.warnings.push(text); return this; }
  table(caption, head, rows) { this.tables.push({ caption, head, rows }); return this; }
}

/** Sig-fig rule for multiplication/division: the fewest sig figs among measured inputs. */
export function minSf(...ms) {
  const list = ms.filter((m) => m && m.sf != null).map((m) => m.sf);
  return list.length ? Math.min(...list) : 3;
}
export function anyAmbiguous(...ms) {
  return ms.some((m) => m && m.ambiguous);
}
export const AMBIGUOUS_NOTE = 'A value with trailing zeros and no decimal point (for example 100) has ambiguous significant figures. The zeros were counted as significant. If they are only placeholders, write the value in scientific notation (for example 1e2 for one significant figure).';
