// شغّلها بـ: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  analyze, generatePassphrase, passphraseEntropy, decodeArabicKeyboard, normalizeArabic,
  arDuration, crackTimes, scoreFromBits, LABELS, WORDS, SEPARATORS,
} from './checker.js';
import { COMMON_PASSWORDS } from './lists.js';

const ids = (pw) => analyze(pw).findings.map((f) => f.id);

// مولّد أرقام ثابت للاختبارات: نفس البذرة = نفس النتيجة دايماً
function seeded(seed) {
  let s = seed;
  return (n) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s % n;
  };
}

test('كلمات المرور المشهورة تاخذ 0 أو 1', () => {
  for (const pw of ['123456', 'password', 'qwerty', 'Aa123456', 'iloveyou', 'admin', '000000', '1q2w3e4r', 'qwertyuiop', '123123', 'abc123']) {
    const r = analyze(pw);
    assert.ok(r.score <= 1, `${pw} أخذت ${r.score}`);
    assert.ok(ids(pw).includes('common'), `${pw} لازم تنكشف كمشهورة`);
  }
});

test('المقارنة بدون فرق بين الكبير والصغير، وبعد شيل الأرقام والرموز من الآخر', () => {
  assert.equal(analyze('PASSWORD').score, 0);
  assert.ok(ids('PASSWORD').includes('common'));
  for (const pw of ['password2024!', 'Qwerty123456!!', 'Iloveyou99', 'Dragon#1']) {
    const r = analyze(pw);
    assert.ok(r.score <= 1, `${pw} أخذت ${r.score}`);
    assert.ok(ids(pw).includes('common-core'), `${pw}: ${ids(pw)}`);
  }
  // تبديل الحروف برموز ما يخدع الفاحص
  assert.ok(analyze('P@ssw0rd').score <= 1);
});

test('عبارة مرور طويلة وعشوائية تاخذ 4', () => {
  const pp = generatePassphrase(6, seeded(42));
  const r = analyze(pp);
  assert.equal(r.score, 4, `${pp} أخذت ${r.score} (${r.entropyBits} بت)`);
  assert.equal(r.label, 'قوية جداً');
  assert.ok(ids(pp).includes('passphrase'));
  assert.equal(analyze('x7#Lq9!vR2@mK8$wZ').score, 4);
});

test('تقدير الفاحص للعبارة المولّدة قريب من قوتها الحقيقية', () => {
  for (const n of [4, 5, 6]) {
    const pp = generatePassphrase(n, seeded(n));
    const diff = Math.abs(analyze(pp).entropyBits - passphraseEntropy(n));
    assert.ok(diff < 4, `${pp}: فرق ${diff}`);
  }
});

test('كشف التسلسلات', () => {
  for (const pw of ['xabcdefx', 'kk1234!', 'zz9876q', 'mmZYXWm']) assert.ok(ids(pw).includes('sequence'), `${pw}: ${ids(pw)}`);
});

test('كشف صفوف الكيبورد', () => {
  for (const pw of ['Tdfghj#83', 'xyzpoiuy7', '9zxcv!!M']) assert.ok(ids(pw).includes('keyboard'), `${pw}: ${ids(pw)}`);
});

test('كشف التكرار', () => {
  for (const pw of ['aaaa1111', 'xx!!!!!!q', 'lol-lol-lol', 'k77777k']) assert.ok(ids(pw).includes('repeat'), `${pw}: ${ids(pw)}`);
});

test('كشف السنوات والتواريخ', () => {
  assert.ok(ids('Sara2007').includes('year'));
  assert.ok(ids('Sara2007').includes('name-year'));
  assert.ok(ids('faisal1445').includes('hijri-year'));
  for (const pw of ['15/08/2006', 'x1508x', 'born15-8', '2007.08.15']) assert.ok(ids(pw).includes('date'), `${pw}: ${ids(pw)}`);
  // 1949 و 2036 برا المدى
  assert.ok(!ids('qq1949qq').includes('year'));
});

test('كشف أرقام الجوال السعودية', () => {
  for (const pw of ['0551234567', '966501112233', '+966551234567', 'my0567778899!']) {
    assert.ok(ids(pw).includes('mobile'), `${pw}: ${ids(pw)}`);
    assert.equal(analyze(pw).findings.find((f) => f.id === 'mobile').severity, 'high');
  }
  assert.ok(!ids('0155123456').includes('mobile'));
});

test('خريطة الكيبورد العربي: hgsghl = السلام', () => {
  assert.equal(decodeArabicKeyboard('hgsghl'), 'السلام');
  assert.equal(decodeArabicKeyboard('hgsbl'), 'السلام'); // b = لا (حرفين)
  assert.equal(decodeArabicKeyboard('lpl]'), 'محمد');
  assert.equal(decodeArabicKeyboard('uf]hggi'), 'عبدالله');
  assert.equal(decodeArabicKeyboard("hgvdhq"), 'الرياض');
  assert.equal(decodeArabicKeyboard('[]i'), 'جده');
  assert.equal(decodeArabicKeyboard('l;i'), 'مكه');
  assert.equal(decodeArabicKeyboard('Hpl]'), 'احمد'); // Shift+H = أ
  assert.equal(normalizeArabic('مكة'), 'مكه');
});

test('كلمة عربية مكتوبة والكيبورد إنجليزي تنكشف', () => {
  for (const [pw, word] of [['hgsghl', 'السلام'], ['hgsbl', 'السلام'], ['lpl]2007', 'محمد'], ['Hgsghl!', 'السلام'], ['hgvdhq1445', 'الرياض']]) {
    const f = analyze(pw).findings.find((x) => x.id === 'arabic-keyboard');
    assert.ok(f, `${pw}: ${ids(pw)}`);
    assert.equal(f.word, word);
    assert.match(f.ar, /المخترقين يعرفون هالحيلة/);
  }
  assert.ok(analyze('hgsghl').score <= 1);
  // كلمة عربية مكتوبة بالعربي، وكلمة إنجليزية مكتوبة والكيبورد عربي
  assert.ok(ids('السلام123').includes('arabic-word'));
  assert.ok(ids('حشسسصخقي').includes('english-on-arabic'));
  // حروف عشوائية ما تطلع كلمات عربية بالغلط
  assert.ok(!ids('x7#Lq9!vR2@mK8$wZ').includes('arabic-keyboard'));
});

test('كشف الإيميل و"اسم + سنة"', () => {
  assert.ok(ids('ahmed@gmail.com').includes('email'));
  assert.ok(ids('Nawaf.Gmail.com').includes('email'));
  assert.ok(ids('zainab2007').includes('name-year'));
  assert.ok(ids('2007zainab').includes('name-year'));
  assert.ok(analyze('Ahmed@2007').score <= 1);
});

test('الطول وأنواع الحروف', () => {
  assert.ok(ids('k9Gq2').includes('too-short'));
  assert.ok(analyze('k9Gq2#x').score <= 1);
  assert.ok(ids('k9Gq2#xP4').includes('short'));
  assert.ok(ids('83920174').includes('digits-only'));
  const empty = analyze('');
  assert.equal(empty.score, 0);
  assert.deepEqual(empty.findings.map((f) => f.id), ['empty']);
});

test('شكل النتيجة', () => {
  const r = analyze('Tr0ub4dor&3');
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 4);
  assert.equal(r.label, LABELS[r.score]);
  assert.equal(typeof r.entropyBits, 'number');
  assert.ok(r.entropyBits <= r.naiveBits);
  assert.equal(typeof r.crackTimes.online, 'string');
  assert.equal(typeof r.crackTimes.offline, 'string');
  for (const f of r.findings) {
    assert.equal(typeof f.id, 'string');
    assert.ok(['high', 'medium', 'low', 'good'].includes(f.severity));
    assert.ok(f.ar.length > 10);
  }
  assert.ok(r.tips.length >= 1 && r.tips.length <= 4);
  assert.equal(r.parts.map((p) => p.token).join(''), 'Tr0ub4dor&3');
});

test('الوقت بالعربي', () => {
  assert.equal(arDuration(0.2), 'أقل من ثانية');
  assert.equal(arDuration(1), 'ثانية');
  assert.equal(arDuration(2), 'ثانيتين');
  assert.equal(arDuration(5), '5 ثوانٍ');
  assert.equal(arDuration(45), '45 ثانية');
  assert.equal(arDuration(3 * 3600), '3 ساعات');
  assert.equal(arDuration(2 * 86400), 'يومين');
  assert.equal(arDuration(3702 * 31557600), '3,702 سنة');
  assert.equal(arDuration(2e6 * 31557600), 'أكثر من مليون سنة');
  assert.equal(arDuration(Infinity), 'أطول من عمر الكون');
  // 30 بت: أونلاين 100 بالثانية = 2^30/100 ثانية تقريباً 124 يوم
  assert.equal(crackTimes(30).online, '4 أشهر');
  assert.equal(crackTimes(30).offline, 'أقل من ثانية');
});

test('حدود الدرجات', () => {
  assert.deepEqual([0, 24.9, 25, 35.9, 36, 49.9, 50, 59.9, 60, 120].map(scoreFromBits), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('المولّد يستخدم مولّد الأرقام اللي نعطيه بالضبط', () => {
  // نعطيه أرقام محددة ونعرف وش لازم يطلع
  const queue = [0, 1, 2, 3, 0, 1, 2, 7];
  const rng = (n) => {
    const v = queue.shift();
    assert.ok(v < n);
    return v;
  };
  const pp = generatePassphrase(4, rng);
  // كلمات 0,1,2,3 ثم الفاصل 0، الحرف الكبير في الكلمة 1، الرقم في الكلمة 2 وقيمته 07
  const w = WORDS;
  assert.equal(pp, [w[0], w[1][0].toUpperCase() + w[1].slice(1), w[2] + '07', w[3]].join(SEPARATORS[0]));
  assert.equal(queue.length, 0);
  // نفس البذرة = نفس العبارة، وبذرة ثانية = عبارة ثانية
  assert.equal(generatePassphrase(5, seeded(9)), generatePassphrase(5, seeded(9)));
  assert.notEqual(generatePassphrase(5, seeded(9)), generatePassphrase(5, seeded(10)));
  assert.equal(generatePassphrase(5, seeded(1)).split(/[-_=*~#&%]/).length, 5);
});

test('المولّد الافتراضي يشتغل بعشوائية crypto', () => {
  const a = generatePassphrase();
  const b = generatePassphrase();
  assert.equal(a.split(/[-_=*~#&%]/).length, 4);
  assert.notEqual(a, b);
});

test('القوائم سليمة', () => {
  assert.ok(WORDS.length >= 290, `${WORDS.length} كلمة بس`);
  assert.equal(new Set(WORDS).size, WORDS.length, 'كلمات مكررة');
  for (const w of WORDS) assert.match(w, /^[a-z]{4,7}$/);
  assert.ok(COMMON_PASSWORDS.length >= 150);
  assert.equal(new Set(COMMON_PASSWORDS).size, COMMON_PASSWORDS.length);
  assert.deepEqual(WORDS.filter((w) => COMMON_PASSWORDS.includes(w)), []);
});

test('الكود ما يرسل ولا يحفظ كلمة المرور', () => {
  for (const file of ['checker.js', 'app.js', 'lists.js']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
      assert.ok(!src.includes(bad), `${file} فيه ${bad}`);
    }
  }
  const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.ok(!/https?:\/\/(?!github\.com|hosam382\.github\.io)/.test(html.replace(/<meta[^>]+og:[^>]+>/g, '')), 'رابط خارجي غير متوقع');
});
