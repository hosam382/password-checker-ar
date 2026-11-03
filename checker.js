// فاحص قوة كلمة المرور: كل منطق الفحص هنا.
// الدوال "نقية": ما تلمس الصفحة ولا ترسل شي لأي مكان، فسهل نختبرها (checker.test.js).
//
// الفكرة باختصار (نفس فكرة مكتبة zxcvbn لكن أبسط):
// 1) ندوّر على كل الأنماط المعروفة داخل كلمة المرور: كلمات مشهورة، أسماء، تواريخ، تسلسلات...
// 2) كل نمط له "تكلفة" بالبت = لوغاريتم عدد المحاولات اللي يحتاجها المخترق عشان يوصله.
// 3) نختار أرخص طريقة نقسم فيها الكلمة (برمجة ديناميكية)، والحروف اللي ما لها نمط نحسبها عشوائية.
// النتيجة تقدير متحفظ: نفترض إن المخترق ذكي ويعرف الحيل.

import { COMMON_PASSWORDS, WORDS, NAMES, ARABIC_WORDS } from './lists.js';

export { WORDS };
export const LABELS = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
export const RATES = { online: 100, offline: 1e10 };
// حدود الدرجات بالبت: أقل من 25 = 0، أقل من 36 = 1، أقل من 50 = 2، أقل من 60 = 3، وإلا 4
export const THRESHOLDS = [25, 36, 50, 60];

const log2 = Math.log2;
const NAME_BITS = log2(2000); // نفترض المخترق عنده قائمة ألفين اسم شائع
const WORD_BITS = log2(WORDS.length);
const ARABIC_WORD_BITS = log2(2000);
const GUESSABLE_WORD_BITS = 17; // اسم أو كلمة غير موجودة عندنا لكن جنبها سنة: نفترض قائمة 130 ألف
const MOBILE_BITS = 20; // نظرياً 26 بت، لكن الأرقام منتشرة في التسريبات فنكون متحفظين
const EMAIL_DOMAIN_BITS = 6;
const SEPARATOR_BITS = log2(10);

const COMMON_RANK = new Map(COMMON_PASSWORDS.map((p, i) => [p, i + 1]));
const WORD_SET = new Set(WORDS);
const NAME_SET = new Set(NAMES);

// ---------------------------------------------------------------- الكيبورد العربي (Arabic 101)

// كل زر إنجليزي ووش يطلع منه لو كانت لغة الكيبورد عربي
export const EN_TO_AR = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح', '[': 'ج', ']': 'د',
  a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م', ';': 'ك', "'": 'ط',
  z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة', ',': 'و', '.': 'ز', '/': 'ظ', '`': 'ذ',
};
// مع Shift: الهمزات واللام ألف (الباقي حركات نتجاهلها)
const EN_TO_AR_SHIFT = { H: 'أ', Y: 'إ', N: 'آ', G: 'لأ', T: 'لإ', B: 'لآ', '~': 'ّ' };

const AR_TO_EN = {};
for (const [en, ar] of Object.entries(EN_TO_AR)) if (ar.length === 1) AR_TO_EN[ar] = en;
Object.assign(AR_TO_EN, { 'أ': 'h', 'إ': 'y', 'آ': 'n' });

const AR_LETTER = /[ء-ي]/;
const AR_DROP = /[ً-ْـ]/; // التشكيل والتطويل
const AR_NORM = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };

// نوحّد الكتابة: الهمزات على الألف تصير ألف، التاء المربوطة هاء، الألف المقصورة ياء
export function normalizeArabic(s) {
  let out = '';
  for (const c of s) if (!AR_DROP.test(c)) out += AR_NORM[c] ?? c;
  return out;
}
const ARABIC_SET = [...new Set(ARABIC_WORDS.map(normalizeArabic))];

// يحوّل اللي انكتب بالإنجليزي إلى الحروف العربية اللي على نفس الأزرار
export function decodeArabicKeyboard(text, { shift = true } = {}) {
  return decodeEnToAr(text, shift).str;
}

// كل حرف ناتج نعرف من أي مكان في كلمة المرور الأصلية جا (os = البداية، oe = النهاية)
function decodeEnToAr(pw, shift) {
  let str = '';
  const os = [];
  const oe = [];
  for (let i = 0; i < pw.length; i++) {
    const c = pw[i];
    let ar = (shift && EN_TO_AR_SHIFT[c]) || EN_TO_AR[c.toLowerCase()];
    if (ar === undefined) ar = c;
    for (const a of ar) {
      if (AR_DROP.test(a)) continue;
      str += AR_NORM[a] ?? a;
      os.push(i);
      oe.push(i + 1);
    }
  }
  return { str, os, oe };
}

// العكس: حروف عربية انكتبت والمقصود كلمة إنجليزية (مثل حشسسصخقي = password)
function decodeArToEn(pw, ligatureAsB) {
  let str = '';
  const os = [];
  const oe = [];
  for (let i = 0; i < pw.length; i++) {
    if (ligatureAsB && pw[i] === 'ل' && pw[i + 1] === 'ا') {
      str += 'b'; os.push(i); oe.push(i + 2); i++;
      continue;
    }
    str += AR_TO_EN[pw[i]] ?? pw[i].toLowerCase();
    os.push(i);
    oe.push(i + 1);
  }
  return { str, os, oe };
}

// ---------------------------------------------------------------- أدوات صغيرة

function charClass(c) {
  if (/[a-z]/.test(c)) return 'lower';
  if (/[A-Z]/.test(c)) return 'upper';
  if (/[0-9]/.test(c)) return 'digit';
  if (AR_LETTER.test(c)) return 'arabic';
  if (/[\x20-\x7E]/.test(c)) return 'symbol';
  return 'other';
}
const CLASS_SIZE = { lower: 26, upper: 26, digit: 10, symbol: 33, arabic: 36, other: 100 };

export function charClasses(pw) {
  const set = new Set();
  for (const c of pw) set.add(charClass(c));
  return set;
}

function poolSize(pw) {
  let n = 0;
  for (const k of charClasses(pw)) n += CLASS_SIZE[k];
  return Math.max(n, 2);
}

function binom(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// كم بت تضيف الحروف الكبيرة: أول حرف كبير أو الكل كبير = بت واحد، والخلط العشوائي أكثر
function caseBits(orig) {
  const letters = orig.replace(/[^A-Za-z]/g, '');
  if (!/[A-Z]/.test(letters) || letters === letters.toLowerCase()) return 0;
  if (letters === letters.toUpperCase()) return 1;
  if (/^[A-Z][^A-Z]*$/.test(letters)) return 1;
  // MyDogMax: كل كلمة تبدأ بحرف كبير، نمط معروف
  if (/^([A-Z][a-z]+)+$/.test(letters)) return 1 + log2(letters.match(/[A-Z]/g).length);
  const up = (letters.match(/[A-Z]/g) || []).length;
  const low = letters.length - up;
  let sum = 0;
  for (let i = 1; i <= Math.min(up, low); i++) sum += binom(letters.length, i);
  return log2(Math.max(sum, 2));
}

const LEET = { '@': 'a', '4': 'a', '3': 'e', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };
function leetVariants(lower) {
  if (!/[@4301!$57+89]/.test(lower)) return [];
  const out = new Set();
  for (const one of ['i', 'l']) {
    let s = '';
    for (const c of lower) s += c === '1' ? one : (LEET[c] ?? c);
    if (s !== lower) out.add(s);
  }
  return [...out];
}

const isLatinLetter = (c) => c !== undefined && /[a-z]/i.test(c);

// ---------------------------------------------------------------- كاشفات الأنماط
// كل كاشف يرجع قائمة: { i, j, kind, bits, token, ...تفاصيل } حيث [i, j) مكانها في كلمة المرور

function dictionaryMatches(pw, v, via) {
  const out = [];
  const s = v.str;
  const n = s.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 3; b <= Math.min(n, a + 20); b++) {
      const sub = s.slice(a, b);
      const rank = COMMON_RANK.get(sub);
      const isWord = WORD_SET.has(sub);
      const isName = NAME_SET.has(sub);
      if (!rank && !isWord && !isName) continue;
      // الكلمات من 3 حروف بس لو كانت لحالها (مو جزء من كلمة أطول)
      if (sub.length === 3 && /[a-z]/.test(sub) && (isLatinLetter(s[a - 1]) || isLatinLetter(s[b]))) continue;
      const i = v.os[a];
      const j = v.oe[b - 1];
      const orig = pw.slice(i, j);
      let subs = 0;
      if (via === 'leet') {
        for (let k = 0; k < orig.length; k++) if (orig[k].toLowerCase() !== sub[k]) subs++;
        const letters = (orig.match(/[a-z]/gi) || []).length;
        if (subs === 0 || letters < 2) continue;
      }
      const extra = via === 'ar' ? 0 : caseBits(orig) + subs;
      const base = { i, j, token: orig, word: sub, via, leet: subs > 0 };
      if (rank) out.push({ ...base, kind: 'common', bits: Math.max(1, log2(rank + 1)) + extra, rank });
      if (isWord) out.push({ ...base, kind: 'word', bits: WORD_BITS + extra });
      if (isName) out.push({ ...base, kind: 'name', bits: NAME_BITS + extra });
    }
  }
  return out;
}

// قاموسنا صغير، فأي مقطع حروف "ينقرأ" مثل كلمة نعامله ككلمة من قاموس كبير (تقدير متحفظ).
// ينقرأ = فيه حروف علة بنسبة طبيعية، وما فيه 4 حروف ساكنة ورا بعض
function looksLikeWord(s) {
  const v = (s.match(/[aeiouy]/g) || []).length / s.length;
  return v >= 0.25 && v <= 0.7 && !/[^aeiouy]{4,}/.test(s) && !/[aeiouy]{4,}/.test(s) && !/(.)\1\1/.test(s);
}

function wordLikeMatches(pw, v, via) {
  const out = [];
  const re = /[a-z]{4,}/g;
  for (let m; (m = re.exec(v.str));) {
    const s = m[0];
    if (!looksLikeWord(s)) continue;
    const i = v.os[m.index];
    const j = v.oe[m.index + s.length - 1];
    const orig = pw.slice(i, j);
    let subs = 0;
    if (via === 'leet') {
      // التبديل لازم يكون داخل الكلمة (Tr0ub4dor)، مو رمز في طرفها
      if (!isLatinLetter(orig[0]) || !isLatinLetter(orig[orig.length - 1])) continue;
      for (let k = 0; k < orig.length; k++) if (orig[k].toLowerCase() !== s[k]) subs++;
      if (subs === 0 || subs > Math.max(1, Math.floor(s.length / 3))) continue;
    }
    const bits = Math.min(s.length * log2(26), 5 + 2.5 * s.length) + caseBits(orig) + subs;
    out.push({ i, j, kind: 'word-like', bits, token: orig, leet: subs > 0, via });
  }
  return out;
}

// كلمات عربية: سواء انكتبت بالعربي، أو انكتبت والكيبورد إنجليزي (hgsghl = السلام)
function arabicMatches(pw) {
  const out = [];
  for (const shift of [true, false]) {
    const v = decodeEnToAr(pw, shift);
    const s = v.str;
    for (const w of ARABIC_SET) {
      let from = 0;
      for (;;) {
        const a = s.indexOf(w, from);
        if (a < 0) break;
        from = a + 1;
        const b = a + w.length;
        // كلمة من 3 حروف لازم تكون لحالها، عشان ما نطلّع كلمات بالصدفة من حروف عشوائية
        if (w.length <= 3 && (AR_LETTER.test(s[a - 1] ?? '') || AR_LETTER.test(s[b] ?? ''))) continue;
        const i = v.os[a];
        const j = v.oe[b - 1];
        const orig = pw.slice(i, j);
        const arabicChars = [...orig].filter((c) => AR_LETTER.test(c)).length;
        let kind;
        if (arabicChars === 0) kind = 'arabic-keyboard';
        else if (arabicChars === orig.length) kind = 'arabic-word';
        else continue;
        out.push({ i, j, kind, bits: ARABIC_WORD_BITS + (kind === 'arabic-keyboard' ? caseBits(orig) : 0), token: orig, word: w });
      }
    }
  }
  return out;
}

// تسلسلات: abc، 1234، 9876، وكمان 2468 و 13579
function sequenceMatches(pw) {
  const out = [];
  let i = 0;
  while (i < pw.length - 2) {
    const cls = charClass(pw[i]);
    const d = pw.charCodeAt(i + 1) - pw.charCodeAt(i);
    if (!['lower', 'upper', 'digit'].includes(cls) || ![1, -1, 2, -2].includes(d) || charClass(pw[i + 1]) !== cls) { i++; continue; }
    let j = i + 1;
    while (j + 1 < pw.length && pw.charCodeAt(j + 1) - pw.charCodeAt(j) === d && charClass(pw[j + 1]) === cls) j++;
    const len = j - i + 1;
    if (len >= 3 && (Math.abs(d) === 1 || len >= 4)) {
      const start = pw[i].toLowerCase();
      const base = 'az019'.includes(start) ? 4 : cls === 'digit' ? 10 : 26;
      const bits = log2(base * len * (d < 0 ? 2 : 1) * (Math.abs(d) === 2 ? 2 : 1));
      out.push({ i, j: j + 1, kind: 'sequence', bits, token: pw.slice(i, j + 1) });
    }
    i = j;
  }
  return out;
}

// صفوف الكيبورد وأعمدته: qwerty، asdf، 1qaz، !@#$
const KEYBOARD_PATHS = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '!@#$%^&*()',
  '1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik,9ol.0p;/', 'qazwsxedcrfvtgbyhnujmikolp',
  '1q2w3e4r5t6y7u8i9o0p', 'q1w2e3r4t5y6u7i8o9p0',
];
const KEYBOARD_BITS_BASE = log2(KEYBOARD_PATHS.length * 30 * 2);

function keyboardMatches(pw, v, via) {
  const out = [];
  const s = v.str;
  for (let a = 0; a < s.length; a++) {
    let best = 0;
    for (let b = a + 4; b <= s.length; b++) {
      const sub = s.slice(a, b);
      const rev = [...sub].reverse().join('');
      if (KEYBOARD_PATHS.some((p) => p.includes(sub) || p.includes(rev))) best = b;
      else break;
    }
    if (!best) continue;
    const i = v.os[a];
    const j = v.oe[best - 1];
    const orig = pw.slice(i, j);
    if (/^\d+$/.test(orig)) continue; // الأرقام المتسلسلة يمسكها كاشف التسلسلات
    out.push({ i, j, kind: 'keyboard', bits: KEYBOARD_BITS_BASE + log2(best - a) + (via === 'ar' ? 0 : caseBits(orig)), token: orig, via });
  }
  return out;
}

// تكرار: aaaa، 1111، أو مقطع يتكرر مثل 123123 و abab
function repeatMatches(pw, estimate) {
  const out = [];
  const chars = [...pw].length === pw.length; // نتعامل مع النصوص العادية بس
  if (!chars) return out;
  for (let i = 0; i < pw.length; i++) {
    let j = i + 1;
    while (j < pw.length && pw[j] === pw[i]) j++;
    if (j - i >= 3) out.push({ i, j, kind: 'repeat', bits: log2(CLASS_SIZE[charClass(pw[i])] * (j - i)), token: pw.slice(i, j) });
    for (let L = 2; L <= 16 && i + 2 * L <= pw.length; L++) {
      const block = pw.slice(i, i + L);
      if (new Set(block).size === 1) continue;
      let count = 1;
      while (pw.slice(i + count * L, i + (count + 1) * L) === block) count++;
      if (count >= 2) out.push({ i, j: i + count * L, kind: 'repeat', bits: estimate(block) + log2(count), token: pw.slice(i, i + count * L) });
    }
  }
  return out;
}

const GREG_YEAR = '(?:19[5-9]\\d|20[0-2]\\d|203[0-5])';
const HIJRI_YEAR = '(?:13[89]\\d|14[0-5]\\d|1460)';
const YEAR_RE = new RegExp(`^(${GREG_YEAR}|${HIJRI_YEAR})$`);

function yearKind(y) {
  return new RegExp(`^${HIJRI_YEAR}$`).test(y) ? 'hijri-year' : 'year';
}

function validDM(d, m) {
  return d >= 1 && d <= 31 && m >= 1 && m <= 12;
}

// سنوات (ميلادية 1950-2035 وهجرية 1380-1460) وتواريخ مثل 15/08 و 15082007
function dateMatches(pw) {
  const out = [];
  for (let i = 0; i + 4 <= pw.length; i++) {
    const y = pw.slice(i, i + 4);
    if (YEAR_RE.test(y)) out.push({ i, j: i + 4, kind: yearKind(y), bits: log2(86), token: y });
  }
  // تاريخ بفواصل: 15/8 أو 15-08-2007 أو 15.8.07
  const dmy = /(?<!\d)(\d{1,2})([-/._ ])(\d{1,2})(?:\2(\d{4}|\d{2}))?(?!\d)/g;
  for (let m; (m = dmy.exec(pw));) {
    dmy.lastIndex = m.index + 1;
    const [all, a, , b, y] = m;
    if (!validDM(+a, +b) && !validDM(+b, +a)) continue;
    if (y && y.length === 4 && !YEAR_RE.test(y)) continue;
    const bits = log2(366) + (y ? log2(y.length === 4 ? 86 : 100) : 0);
    out.push({ i: m.index, j: m.index + all.length, kind: 'date', bits, token: all });
  }
  // وبالعكس: 2007-08-15
  const ymd = /(?<!\d)(\d{4})([-/._ ])(\d{1,2})\2(\d{1,2})(?!\d)/g;
  for (let m; (m = ymd.exec(pw));) {
    ymd.lastIndex = m.index + 1;
    const [all, y, , a, b] = m;
    if (!YEAR_RE.test(y) || (!validDM(+b, +a) && !validDM(+a, +b))) continue;
    out.push({ i: m.index, j: m.index + all.length, kind: 'date', bits: log2(366) + log2(86), token: all });
  }
  // تاريخ أرقام بس: 1508 أو 150807 أو 15082007 أو 20070815
  const digitRuns = /\d{4,}/g;
  for (let m; (m = digitRuns.exec(pw));) {
    const run = m[0];
    for (let a = 0; a < run.length; a++) {
      for (const L of [4, 6, 8]) {
        if (a + L > run.length) continue;
        const t = run.slice(a, a + L);
        let ok = false;
        if (L === 4) ok = validDM(+t.slice(0, 2), +t.slice(2)) || validDM(+t.slice(2), +t.slice(0, 2));
        if (L === 6) ok = validDM(+t.slice(0, 2), +t.slice(2, 4)) || validDM(+t.slice(4), +t.slice(2, 4));
        if (L === 8) ok = (YEAR_RE.test(t.slice(4)) && (validDM(+t.slice(0, 2), +t.slice(2, 4)) || validDM(+t.slice(2, 4), +t.slice(0, 2))))
          || (YEAR_RE.test(t.slice(0, 4)) && validDM(+t.slice(6), +t.slice(4, 6)));
        if (!ok) continue;
        const bits = log2(366) + (L === 4 ? 0 : L === 6 ? log2(100) : log2(86));
        out.push({ i: m.index + a, j: m.index + a + L, kind: 'date', bits, token: t });
      }
    }
  }
  return out;
}

// أرقام الجوال السعودية: 05XXXXXXXX أو 9665XXXXXXXX (مع + أو 00 أو بدونها)
function mobileMatches(pw) {
  const out = [];
  const re = /(?:\+|00)?9665\d{8}|05\d{8}/g;
  for (let m; (m = re.exec(pw));) {
    out.push({ i: m.index, j: m.index + m[0].length, kind: 'mobile', bits: MOBILE_BITS, token: m[0] });
    re.lastIndex = m.index + 1;
  }
  return out;
}

const EMAIL_DOMAINS = 'gmail|hotmail|outlook|yahoo|icloud|live|msn|aol|protonmail|proton|ymail';
function emailMatches(pw) {
  const out = [];
  const re = new RegExp(`@(?:${EMAIL_DOMAINS})(?:\\.(?:com|net|org|sa|me|co))*|(?:${EMAIL_DOMAINS})\\.(?:com|net|org|sa|me|co)`, 'gi');
  for (let m; (m = re.exec(pw));) out.push({ i: m.index, j: m.index + m[0].length, kind: 'email', bits: EMAIL_DOMAIN_BITS, token: m[0] });
  return out;
}

const NAME_YEAR_RE = new RegExp(`([A-Za-z\\u0621-\\u064A]{3,})[^A-Za-z0-9\\u0621-\\u064A]?(${GREG_YEAR}|${HIJRI_YEAR})(?!\\d)|(?<!\\d)(${GREG_YEAR}|${HIJRI_YEAR})[^A-Za-z0-9\\u0621-\\u064A]?([A-Za-z\\u0621-\\u064A]{3,})`);

// "اسم + سنة" مثل ahmed2007: حتى لو الاسم مو عندنا، المخترق عنده قوائم ضخمة
function nameYearMatches(pw) {
  const m = NAME_YEAR_RE.exec(pw);
  if (!m) return [];
  const word = m[1] ?? m[4];
  const at = m[1] ? m.index : m.index + m[0].length - word.length;
  const bits = Math.min(GUESSABLE_WORD_BITS, word.length * log2(poolSize(word)));
  return [{ i: at, j: at + word.length, kind: 'guessable-word', bits, token: word }];
}

// ---------------------------------------------------------------- التقسيم الأرخص

const memo = new Map();

function segment(pw) {
  if (memo.has(pw)) return memo.get(pw);
  const n = pw.length;
  const charBits = log2(poolSize(pw));
  const lower = pw.toLowerCase();
  const identity = { str: lower, os: [...Array(n).keys()], oe: [...Array(n).keys()].map((k) => k + 1) };

  const leets = leetVariants(lower).map((s) => ({ ...identity, str: s }));
  const matches = [
    ...dictionaryMatches(pw, identity, 'plain'),
    ...leets.flatMap((v) => dictionaryMatches(pw, v, 'leet')),
    ...wordLikeMatches(pw, identity, 'plain'),
    ...leets.flatMap((v) => wordLikeMatches(pw, v, 'leet')),
    ...keyboardMatches(pw, identity, 'plain'),
    ...arabicMatches(pw),
    ...sequenceMatches(pw),
    ...repeatMatches(pw, (b) => segment(b).bits),
    ...dateMatches(pw),
    ...mobileMatches(pw),
    ...emailMatches(pw),
    ...nameYearMatches(pw),
  ];
  if (AR_LETTER.test(pw)) {
    for (const lig of [false, true]) {
      const v = decodeArToEn(pw, lig);
      const found = [...dictionaryMatches(pw, v, 'ar'), ...keyboardMatches(pw, v, 'ar')]
        .filter((m) => [...m.token].every((c) => AR_LETTER.test(c)));
      matches.push(...found);
    }
  }

  const byEnd = Array.from({ length: n + 1 }, () => []);
  for (const m of matches) if (m.j > m.i && m.j <= n) byEnd[m.j].push(m);

  const best = new Array(n + 1).fill(Infinity);
  const back = new Array(n + 1);
  best[0] = 0;
  for (let k = 1; k <= n; k++) {
    best[k] = best[k - 1] + charBits;
    back[k] = { i: k - 1, j: k, kind: 'bruteforce', bits: charBits, token: pw[k - 1] };
    for (const m of byEnd[k]) {
      const c = best[m.i] + m.bits;
      if (c < best[k] - 1e-9) { best[k] = c; back[k] = m; }
    }
  }

  const parts = [];
  for (let k = n; k > 0; k = back[k].i) parts.unshift(back[k]);
  // نجمع الحروف العشوائية المتتالية في قطعة وحدة
  const merged = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.kind === 'bruteforce' && p.kind === 'bruteforce') {
      last.j = p.j; last.bits += p.bits; last.token += p.token;
    } else merged.push({ ...p });
  }
  const result = { bits: best[n], parts: merged };
  if (memo.size > 500) memo.clear();
  memo.set(pw, result);
  return result;
}

// عبارة مرور: كلمات بينها نفس الفاصل. الفاصل نحسبه مرة وحدة بس، مو مع كل كلمة
function passphraseSegment(pw) {
  let best = null;
  const seps = new Set([...pw].filter((c) => !/[A-Za-z0-9ء-ي]/.test(c)));
  for (const sep of seps) {
    const tokens = pw.split(sep);
    if (tokens.length < 3 || tokens.some((t) => !t || !/[A-Za-zء-ي]/.test(t))) continue;
    let bits = SEPARATOR_BITS;
    const parts = [];
    let at = 0;
    tokens.forEach((t, k) => {
      if (k > 0) {
        parts.push({ i: at, j: at + 1, kind: 'separator', bits: k === 1 ? SEPARATOR_BITS : 0, token: sep });
        at += 1;
      }
      const s = segment(t);
      bits += s.bits;
      for (const p of s.parts) parts.push({ ...p, i: p.i + at, j: p.j + at });
      at += t.length;
    });
    if (!best || bits < best.bits) best = { bits, parts, words: tokens.length, sep };
  }
  return best;
}

// ---------------------------------------------------------------- الوقت بالعربي

const UNITS = [
  { s: 31557600, one: 'سنة', two: 'سنتين', few: 'سنوات' },
  { s: 2629800, one: 'شهر', two: 'شهرين', few: 'أشهر' },
  { s: 86400, one: 'يوم', two: 'يومين', few: 'أيام' },
  { s: 3600, one: 'ساعة', two: 'ساعتين', few: 'ساعات' },
  { s: 60, one: 'دقيقة', two: 'دقيقتين', few: 'دقائق' },
  { s: 1, one: 'ثانية', two: 'ثانيتين', few: 'ثوانٍ' },
];

function countAr(n, u) {
  if (n === 1) return u.one;
  if (n === 2) return u.two;
  if (n <= 10) return `${n} ${u.few}`;
  return `${n.toLocaleString('en-US')} ${u.one}`;
}

export function arDuration(sec) {
  if (!(sec >= 1)) return 'أقل من ثانية';
  const years = sec / 31557600;
  if (years >= 1.4e10) return 'أطول من عمر الكون';
  if (years >= 1e9) return 'أكثر من مليار سنة';
  if (years >= 1e6) return 'أكثر من مليون سنة';
  for (const u of UNITS) {
    if (sec >= u.s) return countAr(Math.floor(sec / u.s), u);
  }
  return 'أقل من ثانية';
}

export function crackTimes(bits) {
  const guesses = 2 ** bits;
  return {
    online: arDuration(guesses / RATES.online),
    offline: arDuration(guesses / RATES.offline),
  };
}

export function scoreFromBits(bits) {
  let s = 0;
  while (s < THRESHOLDS.length && bits >= THRESHOLDS[s]) s++;
  return s;
}

// ---------------------------------------------------------------- الملاحظات

export const KIND_AR = {
  common: 'كلمة مرور مشهورة', word: 'كلمة من القاموس', 'word-like': 'يشبه كلمة', name: 'اسم شائع', 'guessable-word': 'اسم أو كلمة',
  'arabic-keyboard': 'عربي بكيبورد إنجليزي', 'arabic-word': 'كلمة عربية', 'english-on-arabic': 'إنجليزي بكيبورد عربي',
  keyboard: 'صف كيبورد', sequence: 'تسلسل', repeat: 'تكرار', year: 'سنة', 'hijri-year': 'سنة هجرية',
  date: 'تاريخ', mobile: 'رقم جوال', email: 'إيميل', bruteforce: 'عشوائي', separator: 'فاصل',
};

const TEXT = {
  empty: 'اكتب كلمة مرور تجريبية عشان نفحصها.',
  common: 'هذي من أشهر كلمات المرور في العالم. موجودة في قوائم التسريبات، وأول شي يجربه أي برنامج تخمين، فتنكسر في ثواني.',
  'common-core': 'أساسها كلمة مرور مشهورة، والأرقام أو الرموز اللي في آخرها ما تفرق كثير. برامج التخمين تضيف أرقام ورموز لآخر الكلمات المشهورة تلقائياً.',
  'common-part': 'فيها كلمة مرور مشهورة كجزء منها. هالجزء ينخمّن فوراً، فكأنه مو موجود.',
  'too-short': 'أقل من 8 خانات. عدد الاحتمالات صغير، والكمبيوتر يجربها كلها بسرعة مهما كانت الحروف.',
  short: 'أقل من 12 خانة. كل خانة زيادة تضرب عدد الاحتمالات، فالطول أهم شي في القوة.',
  'digits-only': 'أرقام بس. كل خانة لها 10 احتمالات فقط، فحتى الطويلة منها تنكسر بسرعة.',
  'one-class': 'كلها من نوع واحد (حروف صغيرة بس مثلاً). هذا يقلل الاحتمالات لكل خانة.',
  word: 'فيها كلمة إنجليزية معروفة. الكلمات تنخمّن من القاموس بسرعة أكبر بكثير من الحروف العشوائية.',
  'word-like': 'فيها مقطع حروف يشبه كلمة حقيقية. الكلمات (حتى لو فيها حرف كبير أو رقم بدل حرف) تنخمّن من القواميس أسرع بكثير من الحروف العشوائية.',
  name: 'فيها اسم شائع. الأسماء أول القوائم اللي يجربها المخترق، خصوصاً لو كان اسمك أو اسم أحد قريب منك.',
  leet: 'تبديل الحروف برموز (@ بدل a، و 0 بدل o) حيلة معروفة، وبرامج التخمين تجربها تلقائياً.',
  'arabic-keyboard': 'تكتب كلمة عربية والكيبورد إنجليزي؟ المخترقين يعرفون هالحيلة. قوائم التخمين فيها كلمات وأسماء عربية مكتوبة بالأزرار الإنجليزية.',
  'arabic-word': 'فيها كلمة أو اسم عربي معروف. الكلمات العربية موجودة في قوائم التخمين مثل الإنجليزية بالضبط.',
  'english-on-arabic': 'كلمة إنجليزية انكتبت والكيبورد عربي. نفس الحيلة بالعكس، والمخترقين يجربونها بعد.',
  keyboard: 'فيها صف أو عمود من الكيبورد (مثل qwerty أو asdf أو 1qaz). سهلة على الأصابع، وسهلة على المخترق بعد.',
  sequence: 'فيها تسلسل (مثل abc أو 1234 أو 9876). التسلسلات من أول الأنماط اللي تنجرب.',
  repeat: 'فيها تكرار (مثل aaaa أو 1111 أو 123123). التكرار ما يضيف صعوبة تقريباً.',
  year: 'فيها سنة. سنة ميلادك أو تخرجك من أول الأشياء اللي تنجرب، وكثير ناس يعرفونها عنك.',
  'hijri-year': 'فيها سنة هجرية. السنوات الهجرية عددها قليل، وتنجرب بسهولة مثل الميلادية.',
  date: 'فيها تاريخ (مثل يوم وشهر). تواريخ الميلاد والمناسبات سهلة التخمين، خصوصاً لمن يعرفك أو يشوف حساباتك.',
  mobile: 'فيها رقم جوال سعودي. رقمك يعرفه ناس كثير، وموجود في تسريبات بيانات. لا تحطه في كلمة المرور.',
  email: 'فيها إيميل أو جزء منه. الإيميل معلومة معروفة عنك ومو سر.',
  'name-year': 'النمط "اسم أو كلمة + سنة" (مثل ahmed2007) من أشهر الأنماط في العالم، وأول شي يجربه أي أحد يعرفك.',
  passphrase: 'عبارة مرور من عدة كلمات. قوتها تجي من عدد الكلمات وعشوائيتها، مو من صعوبة كل كلمة.',
  long: 'طويلة. الطول أهم عامل في قوة كلمة المرور.',
  mixed: 'فيها أنواع مختلفة من الحروف والأرقام والرموز، وهذا يكبّر عدد الاحتمالات.',
};

const SEVERITY = {
  empty: 'low', common: 'high', 'common-core': 'high', 'common-part': 'high', 'too-short': 'high', short: 'medium',
  'digits-only': 'high', 'one-class': 'medium', word: 'medium', 'word-like': 'medium', name: 'medium', leet: 'medium',
  'arabic-keyboard': 'high', 'arabic-word': 'medium', 'english-on-arabic': 'high', keyboard: 'medium',
  sequence: 'medium', repeat: 'medium', year: 'medium', 'hijri-year': 'medium', date: 'medium', mobile: 'high',
  email: 'high', 'name-year': 'high', passphrase: 'good', long: 'good', mixed: 'good',
};

const finding = (id, extra = {}) => ({ id, severity: SEVERITY[id], ar: TEXT[id], ...extra });

const TIPS = {
  length: 'طوّلها: 12 خانة على الأقل، والأفضل 16 أو أكثر. الطول يفرق أكثر من الرموز.',
  personal: 'شيل أي معلومة شخصية: اسمك، ميلادك، جوالك، إيميلك. هذي أول شي يجربه أي أحد يعرفك.',
  patterns: 'ابعد عن الأنماط: التسلسلات، صفوف الكيبورد، التكرار، والكلمات المشهورة.',
  arabic: 'كتابة كلمة عربية بالحروف الإنجليزية ما تخفيها. لو تبيها عربي، استخدم عدة كلمات عشوائية مو كلمة وحدة معروفة.',
  passphrase: 'جرّب عبارة مرور: 5 كلمات عشوائية بينها رمز. أسهل في الحفظ وأصعب بكثير في التخمين.',
  reuse: 'لا تستخدم نفس كلمة المرور في أكثر من موقع. لو تسرّب موقع واحد، تنفتح باقي حساباتك.',
  twofa: 'فعّل التحقق بخطوتين (2FA) في حساباتك المهمة، فحتى لو عرفوا كلمة المرور ما يقدرون يدخلون.',
  manager: 'مدير كلمات المرور يولّد لك كلمات قوية ويحفظها، فما تحتاج تحفظها كلها.',
};

// ---------------------------------------------------------------- الدالة الرئيسية

export function analyze(password) {
  const pw = String(password ?? '');
  if (!pw) {
    return {
      score: 0, label: LABELS[0], entropyBits: 0, naiveBits: 0,
      crackTimes: crackTimes(0), findings: [finding('empty')], tips: [], parts: [],
    };
  }

  const length = [...pw].length;
  const classes = charClasses(pw);
  const naiveBits = length * log2(poolSize(pw));

  let { bits, parts } = segment(pw);
  let phrase = null;
  const pp = passphraseSegment(pw);
  if (pp && pp.bits < bits) { bits = pp.bits; parts = pp.parts; phrase = pp; }

  // المقارنة مع القائمة المشهورة: بدون فرق بين الحروف الكبيرة والصغيرة، وبعد شيل الأرقام والرموز من الآخر
  const lower = pw.toLowerCase();
  const core = lower.replace(/[^a-zء-ي]+$/, '');
  const coreCandidates = [lower, ...leetVariants(lower)];
  const wholeRank = coreCandidates.map((c) => COMMON_RANK.get(c)).find(Boolean);
  const coreRank = core.length >= 3 && core !== lower
    ? [core, ...leetVariants(core)].map((c) => COMMON_RANK.get(c)).find(Boolean)
    : undefined;
  if (wholeRank) bits = Math.min(bits, log2(wholeRank + 1) + caseBits(pw));
  // كلمة مشهورة تغطي كلمة المرور كلها (مثلاً password مكتوبة والكيبورد عربي)
  const whole = wholeRank || (parts.length === 1 && parts[0].kind === 'common');

  const findings = [];
  const kinds = new Set(parts.map((p) => p.kind));
  const add = (id, extra) => { if (!findings.some((f) => f.id === id)) findings.push(finding(id, extra)); };

  if (whole) add('common');
  else if (coreRank) add('common-core', { match: core });
  else if (kinds.has('common')) add('common-part', { match: parts.find((p) => p.kind === 'common').token });

  if (length < 8) add('too-short');
  else if (length < 12) add('short');
  if (classes.size === 1 && classes.has('digit')) add('digits-only');
  else if (classes.size === 1 && length < 16 && !phrase) add('one-class');

  const pick = (kind) => parts.filter((p) => p.kind === kind);
  if (!whole && !coreRank && NAME_YEAR_RE.test(pw)) add('name-year');
  if (mobileMatches(pw).length) add('mobile');
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(pw) || emailMatches(pw).length) add('email');
  for (const p of pick('arabic-keyboard')) add('arabic-keyboard', { match: p.token, word: p.word });
  for (const p of pick('arabic-word')) add('arabic-word', { match: p.token, word: p.word });
  if (parts.some((p) => p.via === 'ar')) add('english-on-arabic', { match: parts.find((p) => p.via === 'ar').token });
  if (parts.some((p) => p.leet)) add('leet');
  for (const k of ['date', 'year', 'hijri-year', 'sequence', 'keyboard', 'repeat']) {
    const p = pick(k)[0];
    if (p) add(k, { match: p.token });
  }
  // الكلمات المشهورة غالباً هي نفسها أنماط: 123456 تسلسل، qwerty صف كيبورد، 111111 تكرار
  for (const p of pick('common')) {
    const t = p.via === 'ar' ? p.word : p.token.toLowerCase();
    if (sequenceMatches(t).some((m) => m.i === 0 && m.j === t.length)) add('sequence', { match: p.token });
    if (keyboardMatches(t, { str: t, os: [...t].map((_, k) => k), oe: [...t].map((_, k) => k + 1) }, 'plain').some((m) => m.i === 0 && m.j === t.length)) add('keyboard', { match: p.token });
    if (/^(.)\1+$/.test(t)) add('repeat', { match: p.token });
  }
  const wordsUsed = parts.filter((p) => p.kind === 'word' && p.via !== 'ar').length;
  if (phrase && phrase.words >= 4) add('passphrase', { words: phrase.words });
  else if (wordsUsed) add('word', { match: pick('word')[0].token });
  else if (pick('word-like').length) add('word-like', { match: pick('word-like')[0].token });
  if (pick('name').length && !findings.some((f) => f.id === 'name-year')) add('name', { match: pick('name')[0].token });

  let score = scoreFromBits(bits);
  if (whole) score = 0;
  else if (coreRank) score = Math.min(score, 1);
  if (length < 8) score = Math.min(score, 1);

  if (length >= 16 && score >= 3) add('long');
  if (classes.size >= 3 && score >= 3) add('mixed');

  const ids = new Set(findings.map((f) => f.id));
  const has = (...xs) => xs.some((x) => ids.has(x));
  const tips = [];
  if (has('too-short', 'short')) tips.push(TIPS.length);
  if (has('mobile', 'year', 'hijri-year', 'date', 'name-year', 'email', 'name')) tips.push(TIPS.personal);
  if (has('arabic-keyboard', 'arabic-word')) tips.push(TIPS.arabic);
  if (has('common', 'common-core', 'common-part', 'sequence', 'keyboard', 'repeat', 'leet', 'english-on-arabic', 'word', 'word-like')) tips.push(TIPS.patterns);
  if (score <= 2 && !phrase) tips.push(TIPS.passphrase);
  tips.push(TIPS.reuse, TIPS.twofa, TIPS.manager);

  return {
    score,
    label: LABELS[score],
    entropyBits: Math.round(bits * 10) / 10,
    naiveBits: Math.round(naiveBits * 10) / 10,
    crackTimes: crackTimes(bits),
    findings,
    tips: tips.slice(0, 4),
    parts: parts.map((p) => ({
      token: p.token, kind: p.kind, word: p.word, bits: Math.round(p.bits * 10) / 10,
      ar: p.via === 'ar' ? KIND_AR['english-on-arabic'] : KIND_AR[p.kind],
    })),
  };
}

// ---------------------------------------------------------------- مولّد عبارات المرور

export const SEPARATORS = ['-', '_', '=', '*', '~', '#', '&', '%'];

// رقم عشوائي من 0 إلى n-1 بعشوائية تشفيرية، بدون ميلان (نرمي القيم اللي تسبب ميلان)
export function secureRandomInt(n) {
  const max = 2 ** 32;
  const limit = max - (max % n);
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

const clampWords = (w) => Math.min(8, Math.max(3, Math.floor(Number(w) || 4)));

// عبارة مرور: كلمات عشوائية + كلمة وحدة أول حرفها كبير + رقمين في كلمة وحدة + فاصل.
// randomInt(n) ترجع رقم من 0 إلى n-1. في الاختبارات نمرر دالة ثابتة عشان النتيجة تكون معروفة.
export function generatePassphrase(words = 4, randomInt = secureRandomInt) {
  const n = clampWords(words);
  const list = [];
  for (let k = 0; k < n; k++) list.push(WORDS[randomInt(WORDS.length)]);
  const sep = SEPARATORS[randomInt(SEPARATORS.length)];
  const capAt = randomInt(n);
  list[capAt] = list[capAt][0].toUpperCase() + list[capAt].slice(1);
  const numAt = randomInt(n);
  list[numAt] += String(randomInt(100)).padStart(2, '0');
  return list.join(sep);
}

// القوة الحقيقية للعبارة لو المخترق يعرف طريقتنا بالضبط (القائمة والفواصل وكل شي)
export function passphraseEntropy(words = 4) {
  const n = clampWords(words);
  return n * log2(WORDS.length) + log2(SEPARATORS.length) + 2 * log2(n) + log2(100);
}
