// Practice mode: randomised questions, instant checking, explanations, local progress.
import { h, rich, toast } from '../dom.js';
import { makeQuestion, checkNumeric, TOPICS } from '../../engine/practice.js';
import { fmtSf } from '../../engine/numbers.js';
import { getAll, recordPractice, clearStore } from '../store.js';

export function renderPractice(view) {
  const topic = h('select', { id: 'pr-topic' }, h('option', { value: 'mixed' }, 'Mixed (all topics)'), TOPICS.map((t) => h('option', { value: t.id }, t.label)));
  const diff = h('select', { id: 'pr-diff' }, h('option', { value: 'easy' }, 'Easy'), h('option', { value: 'medium' }, 'Medium'), h('option', { value: 'hard' }, 'Hard'));
  const card = h('div', { class: 'card', 'aria-live': 'polite' });
  const progress = h('div');
  let session = { done: 0, right: 0 };
  const score = h('p', { class: 'small muted' });

  const next = () => {
    const q = makeQuestion(topic.value, diff.value);
    card.replaceChildren();
    card.append(h('div', { class: 'btn-row', style: { justifyContent: 'space-between', marginBottom: '8px' } }, h('span', { class: 'tag' }, q.topicLabel), h('span', { class: 'tag gray' }, q.difficulty)));
    card.append(rich('p', q.prompt, { style: { fontSize: '1.08rem' } }));
    const feedback = h('div');
    let answered = false;
    const finish = async (ok, yourText) => {
      answered = true;
      session.done++;
      if (ok) session.right++;
      score.textContent = `This session: ${session.right} of ${session.done} correct`;
      feedback.replaceChildren(h('div', { class: `feedback ${ok ? 'good' : 'bad'}` },
        h('b', {}, ok ? 'Correct. ' : 'Not quite. '),
        !ok && q.type === 'numeric' ? rich('span', `You entered ${yourText}; the answer is ${fmtSf(q.answer, 3)} ${q.unit}. `) : null,
        !ok && q.type === 'mcq' ? h('span', {}, `The answer is: ${q.choices[q.answer]}. `) : null,
        rich('div', q.explanation, { style: { marginTop: '6px' } })));
      try { await recordPractice(q.topic, ok); drawProgress(); } catch { toast('Progress could not be saved on this device.'); }
      nextBtn.focus();
    };
    if (q.type === 'mcq') {
      const letters = 'ABCD';
      const buttons = q.choices.map((c, i) => h('button', { type: 'button', class: 'choice', onclick: () => {
        if (answered) return;
        buttons.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('correct'); });
        if (i !== q.answer) buttons[i].classList.add('wrong');
        finish(i === q.answer);
      } }, h('span', { class: 'letter' }, letters[i]), h('span', {}, c)));
      card.append(...buttons);
    } else {
      const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Your answer', 'aria-label': `Your answer in ${q.unit}` });
      const form = h('form', { onsubmit: (e) => {
        e.preventDefault();
        if (answered) return;
        const r = checkNumeric(q, inp.value);
        if (r.invalid) { toast('Enter a number (scientific notation like 3.01e23 is fine).'); return; }
        inp.disabled = true;
        finish(r.ok, inp.value);
      } }, h('div', { class: 'with-unit' }, inp, h('span', { class: 'tag gray', style: { alignSelf: 'center' } }, q.unit)), h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Check answer')));
      card.append(form, h('p', { class: 'small muted', style: { marginTop: '6px' } }, 'Answers within 1 % of the exact value are accepted, so rounding to 3 significant figures is fine.'));
    }
    const nextBtn = h('button', { class: 'btn btn-secondary', type: 'button', onclick: next }, 'Next question');
    card.append(feedback, h('div', { class: 'btn-row', style: { marginTop: '12px' } }, nextBtn));
  };

  const drawProgress = async () => {
    let rows = [];
    try { rows = await getAll('practice'); } catch { /* storage unavailable */ }
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    progress.replaceChildren(h('div', { class: 'grid grid-2' }, TOPICS.map((t) => {
      const r = by[t.id];
      const pct = r && r.attempted ? Math.round((r.correct / r.attempted) * 100) : 0;
      return h('div', { class: 'card', style: { padding: '12px' } }, h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } }, h('b', {}, t.label), h('span', { class: 'small muted' }, r ? `${r.correct}/${r.attempted} · best streak ${r.best}` : 'not started')),
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `${t.label} accuracy` }, h('span', { style: { width: `${pct}%` } })));
    })));
  };

  [topic, diff].forEach((s) => s.addEventListener('change', next));
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Practice mode'), h('p', {}, 'Random questions from every module. Numbers are generated fresh each time and answers are calculated by the same engine as the calculators.'))),
    h('div', { class: 'calc' },
      h('div', { class: 'card inputs' },
        h('div', { class: 'field' }, h('label', { for: 'pr-topic' }, 'Topic'), topic),
        h('div', { class: 'field' }, h('label', { for: 'pr-diff' }, 'Difficulty'), diff),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: next }, 'New question'), score),
      card),
    h('div', { class: 'section-title' }, h('h2', {}, 'Your progress'), h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: async () => { if (confirm('Reset all practice progress on this device?')) { await clearStore('practice'); drawProgress(); toast('Practice progress reset'); } } }, 'Reset progress')),
    progress);
  next();
  drawProgress();
}
