// Reaction classifier for the five reaction types taught in introductory chemistry.
// It reports a type only when the structural pattern is matched, explains the
// evidence, and says so plainly when a reaction does not fit any supported type.
import { parseEquation } from './equation.js';
import { splitIonic } from './ions.js';

function isElementSpecies(sp) {
  return sp.counts.size === 1 && sp.charge === 0;
}
function single(sp) { return [...sp.counts.keys()][0]; }
function isO2(sp) { return sp.counts.size === 1 && sp.counts.get('O') === 2; }
function isFormula(sp, f) {
  const want = { CO2: [['C', 1], ['O', 2]], H2O: [['H', 2], ['O', 1]], CO: [['C', 1], ['O', 1]] }[f];
  return sp.counts.size === want.length && want.every(([e, n]) => sp.counts.get(e) === n);
}

/**
 * @returns {{ type: string|null, label: string, confidence: 'definite'|'likely'|'none', reasons: string[], also: string[] }}
 */
export function classifyReaction(input) {
  const eq = typeof input === 'string' ? parseEquation(input) : input;
  const R = eq.reactants, P = eq.products;
  const reasons = [];
  const also = [];

  // 1. Combustion: fuel + O2 -> CO2 + H2O (complete) or CO / C (incomplete)
  const o2 = R.find(isO2);
  if (o2 && R.length === 2) {
    const fuel = R.find((s) => s !== o2);
    const fuelEls = [...fuel.counts.keys()];
    const isOrganic = fuel.counts.has('C') && fuel.counts.has('H') && fuelEls.every((e) => ['C', 'H', 'O', 'N', 'S'].includes(e));
    const hasCO2 = P.some((s) => isFormula(s, 'CO2'));
    const hasH2O = P.some((s) => isFormula(s, 'H2O'));
    const hasCO = P.some((s) => isFormula(s, 'CO'));
    if (isOrganic && hasH2O && (hasCO2 || hasCO)) {
      reasons.push(`${fuel.formula} contains carbon and hydrogen and reacts with oxygen gas (O₂).`);
      reasons.push(hasCO2 ? 'The products include carbon dioxide and water, the products of complete combustion.' : 'The products include carbon monoxide and water, which indicates incomplete combustion (limited oxygen).');
      return { type: 'combustion', label: hasCO2 && !hasCO ? 'Combustion (complete)' : 'Combustion (incomplete)', confidence: 'definite', reasons, also };
    }
    if (isElementSpecies(fuel) && P.length === 1) {
      also.push('Combustion (in the broad sense): an element burning in oxygen to form an oxide.');
    }
  }

  // 2. Synthesis: two or more reactants -> one product
  if (R.length >= 2 && P.length === 1) {
    reasons.push(`${R.length} reactants combine to form a single product, ${P[0].formula}.`);
    reasons.push('General pattern: A + B → AB.');
    return { type: 'synthesis', label: 'Synthesis (combination)', confidence: 'definite', reasons, also };
  }

  // 3. Decomposition: one reactant -> two or more products
  if (R.length === 1 && P.length >= 2) {
    reasons.push(`A single reactant, ${R[0].formula}, breaks down into ${P.length} products.`);
    reasons.push('General pattern: AB → A + B.');
    return { type: 'decomposition', label: 'Decomposition', confidence: 'definite', reasons, also };
  }

  // 4. Single displacement: element + compound -> element + compound
  if (R.length === 2 && P.length === 2) {
    const rEl = R.filter(isElementSpecies), pEl = P.filter(isElementSpecies);
    if (rEl.length === 1 && pEl.length === 1) {
      const a = single(rEl[0]), b = single(pEl[0]);
      if (a !== b) {
        reasons.push(`The free element ${a} (${rEl[0].formula}) takes the place of ${b} in the compound, releasing ${pEl[0].formula} as a free element.`);
        reasons.push('General pattern: A + BC → AC + B.');
        return { type: 'single-displacement', label: 'Single displacement (single replacement)', confidence: 'definite', reasons, also };
      }
    }
    // 5. Double displacement: AB + CD -> AD + CB (ions exchange partners)
    if (rEl.length === 0 && pEl.length === 0) {
      const ri = R.map((s) => splitIonic(s.formula));
      const pi = P.map((s) => splitIonic(s.formula));
      if (ri.every(Boolean) && pi.every(Boolean)) {
        const rc = new Set(ri.map((x) => x.cation.f)), ra = new Set(ri.map((x) => x.anion.f));
        const pc = new Set(pi.map((x) => x.cation.f)), pa = new Set(pi.map((x) => x.anion.f));
        const sameIons = [...rc].every((c) => pc.has(c)) && [...ra].every((a) => pa.has(a)) && rc.size === 2 && ra.size === 2;
        const swapped = sameIons && pi.every((p) => !ri.some((r) => r.cation.f === p.cation.f && r.anion.f === p.anion.f));
        if (swapped) {
          reasons.push(`The cations (${[...rc].join(', ')}) and anions (${[...ra].map((x) => x).join(', ')}) exchange partners.`);
          const water = P.some((s) => isFormula(s, 'H2O'));
          if (water && ri.some((x) => x.cation.f === 'H') && ri.some((x) => x.anion.f === 'OH')) {
            reasons.push('An acid reacts with a hydroxide base to form a salt and water, so this is also a neutralisation reaction.');
          }
          reasons.push('General pattern: AB + CD → AD + CB.');
          return { type: 'double-displacement', label: 'Double displacement (metathesis)', confidence: 'definite', reasons, also };
        }
      }
    }
  }

  // carbonate + acid gives three products (salt + water + CO2): a double displacement followed by decomposition
  if (R.length === 2 && P.length === 3 && P.some((s) => isFormula(s, 'CO2')) && P.some((s) => isFormula(s, 'H2O'))) {
    const ri = R.map((s) => splitIonic(s.formula));
    if (ri.every(Boolean) && ri.some((x) => x.anion.f === 'CO3' || x.anion.f === 'HCO3') && ri.some((x) => x.cation.f === 'H')) {
      reasons.push('An acid exchanges ions with a carbonate (double displacement); the carbonic acid formed (H₂CO₃) immediately decomposes into water and carbon dioxide.');
      return { type: 'double-displacement', label: 'Double displacement (followed by decomposition of H₂CO₃)', confidence: 'likely', reasons, also };
    }
  }

  reasons.push('The equation does not match the pattern of synthesis, decomposition, single displacement, double displacement or combustion.');
  reasons.push('It may be a redox, acid–base, or multi-step reaction that needs a more detailed analysis than these five categories allow.');
  return { type: null, label: 'Not one of the five supported types', confidence: 'none', reasons, also };
}

export const REACTION_TYPES = [
  { id: 'synthesis', label: 'Synthesis', pattern: 'A + B → AB', example: '2Na + Cl2 → 2NaCl' },
  { id: 'decomposition', label: 'Decomposition', pattern: 'AB → A + B', example: '2H2O2 → 2H2O + O2' },
  { id: 'single-displacement', label: 'Single displacement', pattern: 'A + BC → AC + B', example: 'Zn + CuSO4 → ZnSO4 + Cu' },
  { id: 'double-displacement', label: 'Double displacement', pattern: 'AB + CD → AD + CB', example: 'AgNO3 + NaCl → AgCl + NaNO3' },
  { id: 'combustion', label: 'Combustion', pattern: 'CxHy + O2 → CO2 + H2O', example: 'CH4 + 2O2 → CO2 + 2H2O' },
];

