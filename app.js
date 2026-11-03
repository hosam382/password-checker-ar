// ربط الصفحة بالفاحص في checker.js. كل شي يصير هنا داخل المتصفح:
// ما فيه أي اتصال بالإنترنت، وكلمة المرور ما تنحفظ في أي مكان.
import { analyze, generatePassphrase, WORDS } from './checker.js';

const $ = (id) => document.getElementById(id);
const SEV_AR = { high: 'خطير', medium: 'ضعف', low: 'ملاحظة', good: 'ميزة' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const isVisible = () => $('pw').type === 'text';
const mask = (s) => '•'.repeat([...s].length);
const fmtBits = (b) => String(b >= 10 ? Math.round(b) : Math.round(b * 10) / 10);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderBits(r) {
  const p = $('bits');
  p.replaceChildren();
  if (!r) { p.textContent = 'القوة تتحسب وأنت تكتب'; return; }
  p.append('تقديرنا: ', el('b', '', `حوالي ${fmtBits(r.entropyBits)} بت`));
  if (r.naiveBits - r.entropyBits >= 3) {
    p.append(`. لو حسبناها حرف حرف بدون ما ننتبه للأنماط كانت بتطلع ${fmtBits(r.naiveBits)} بت، والفرق هذا هو اللي يستغله المخترق.`);
  } else p.append('.');
}

function renderParts(r) {
  const list = $('parts');
  list.replaceChildren();
  const show = isVisible();
  for (const part of r.parts) {
    const li = el('li', part.kind === 'bruteforce' ? 'rand' : part.kind === 'separator' ? 'sep' : '');
    li.append(el('bdi', 'tok', show ? part.token : mask(part.token)));
    let kind = part.ar;
    if (show && part.word && part.word !== part.token.toLowerCase()) kind += ` = ${part.word}`;
    li.append(el('span', 'kind', kind), el('span', 'cost', `${fmtBits(part.bits)} بت`));
    list.append(li);
  }
}

function renderFindings(r) {
  const list = $('findings');
  list.replaceChildren();
  const show = isVisible();
  for (const f of r.findings) {
    const li = el('li');
    li.dataset.sev = f.severity;
    const text = el('span', '', f.ar);
    if (show && f.match) {
      const m = f.word && f.word !== f.match.toLowerCase() ? `${f.match} = ${f.word}` : f.match;
      text.append(el('bdi', 'm', m));
    }
    li.append(el('span', 'sev', SEV_AR[f.severity]), text);
    list.append(li);
  }
  $('tips').replaceChildren(...r.tips.map((t) => el('li', '', t)));
}

let liveTimer;
function render() {
  const pw = $('pw').value;
  const empty = !pw;
  const r = empty ? null : analyze(pw);

  $('meter').dataset.score = empty ? '-1' : String(r.score);
  $('label').textContent = empty ? 'اكتب عشان نفحص' : r.label;
  $('label').classList.toggle('empty', empty);
  if (empty) delete $('label').dataset.score;
  else $('label').dataset.score = String(r.score);
  renderBits(r);
  $('tOnline').textContent = empty ? '—' : r.crackTimes.online;
  $('tOffline').textContent = empty ? '—' : r.crackTimes.offline;

  for (const id of ['seeCard', 'findCard', 'tipsCard']) $(id).hidden = empty;
  if (!empty) { renderParts(r); renderFindings(r); }

  // قارئ الشاشة: نعلن النتيجة بعد ما توقف عن الكتابة، مو مع كل حرف
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    $('live').textContent = empty ? '' : `القوة: ${r.label}. التخمين أونلاين: ${r.crackTimes.online}. التخمين أوفلاين: ${r.crackTimes.offline}.`;
  }, 700);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}

function generate() {
  const phrase = generatePassphrase(Number($('words').value));
  const r = analyze(phrase);
  $('phrase').textContent = phrase;
  $('phrase').classList.remove('empty');
  $('phraseInfo').textContent = `${r.label}: حوالي ${fmtBits(r.entropyBits)} بت، وتخمينها أوفلاين ياخذ ${r.crackTimes.offline}.`;
  $('genActions').hidden = false;
}

function fillExample(id, pw) {
  const r = analyze(pw);
  $(id).dataset.score = String(r.score);
  $(id).textContent = `${r.label}. التخمين أوفلاين: ${r.crackTimes.offline}.`;
}

$('pw').value = '';
$('pw').addEventListener('input', render);
$('toggle').addEventListener('click', () => {
  const show = $('pw').type === 'password';
  $('pw').type = show ? 'text' : 'password';
  $('toggle').setAttribute('aria-pressed', String(show));
  $('toggleText').textContent = show ? 'إخفاء' : 'إظهار';
  render();
});
$('gen').addEventListener('click', generate);
$('words').addEventListener('change', () => { if (!$('phrase').classList.contains('empty')) generate(); });
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('phrase').textContent);
    toast('انسخت العبارة');
  } catch {
    toast('ما قدرت أنسخ، حددها وانسخها بنفسك');
  }
});
$('tryIt').addEventListener('click', () => {
  $('pw').value = $('phrase').textContent;
  render();
  $('pw').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  $('pw').focus({ preventScroll: true });
});

$('nWords').textContent = $('nWords2').textContent = String(WORDS.length);
$('perWord').textContent = Math.log2(WORDS.length).toFixed(1);
fillExample('exA', 'Ahmed@2007');
fillExample('exB', 'fresh-onion-Horse-door-market96-ocean');
render();
