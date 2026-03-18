const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ============ WORKER FUNCTIONS (from cloudflare/worker.js) ============

function normalizeTextAnswer(text) {
  return String(text || '').toLowerCase().replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeWords(text) { return String(text || '').trim().split(/\s+/).filter(Boolean); }

function sliderTolerance(margin, min, max) {
  const range = Math.max(0, Number(max) - Number(min));
  const map = { none: 0, low: range * 0.05, medium: range * 0.1, high: range * 0.2, maximum: range };
  return map[margin] ?? map.medium;
}

function distance2D(x1, y1, x2, y2) { return Math.sqrt((x1-x2)**2 + (y1-y2)**2); }

function countErrorHuntRequiredTokens(prompt, corrected) {
  const source = tokenizeWords(prompt); const target = tokenizeWords(corrected);
  const rows = source.length + 1; const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    const same = normalizeTextAnswer(source[i-1]) === normalizeTextAnswer(target[j-1]);
    dp[i][j] = same ? dp[i-1][j-1] : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
  }
  return dp[source.length][target.length];
}

function evaluate(question, answer) {
  if (!question) return { correct: false };
  if (['mcq','tf','audio'].includes(question.type)) {
    const selected = Number(answer);
    if (!Number.isFinite(selected)) return { correct: false };
    const ci = (question.answers || []).findIndex(a => !!a.correct);
    return { correct: selected === ci };
  }
  if (question.type === 'multi') {
    const sel = Array.isArray(answer) ? answer.map(Number).filter(Number.isFinite) : [];
    const exp = (question.answers || []).map((a,i) => a.correct ? i : null).filter(x => x !== null);
    if (sel.length !== exp.length) return { correct: false };
    return { correct: sel.every(i => exp.includes(i)) };
  }
  if (question.type === 'text') {
    return { correct: (question.accepted || []).map(normalizeTextAnswer).filter(Boolean).includes(normalizeTextAnswer(answer)) };
  }
  if (question.type === 'context_gap') return { correct: isContextGapCorrect(answer, question.gaps || []) };
  if (question.type === 'match_pairs') return { correct: isMatchPairsCorrect(answer, question.pairs || []) };
  if (question.type === 'error_hunt') {
    const rewrite = normalizeTextAnswer(answer?.rewrite ?? answer);
    const expected = normalizeTextAnswer(question.corrected || '');
    const sel = Array.isArray(answer?.selectedTokens) ? answer.selectedTokens.map(Number).filter(Number.isFinite) : [];
    const req = countErrorHuntRequiredTokens(question.prompt, question.corrected);
    if (new Set(sel).size !== req) return { correct: false };
    return { correct: !!rewrite && rewrite === expected };
  }
  if (question.type === 'puzzle') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer) : [];
    const expected = (question.items || []).map(normalizeTextAnswer);
    if (!guess.length || guess.length !== expected.length) return { correct: false };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected) };
  }
  if (question.type === 'slider') {
    const val = Number(answer); if (!Number.isFinite(val)) return { correct: false };
    return { correct: Math.abs(val - Number(question.target)) <= sliderTolerance(question.margin, question.min, question.max) };
  }
  if (question.type === 'pin') {
    const zones = (Array.isArray(question.zones) && question.zones.length ? question.zones : [question.zone || { x:50,y:50,r:15 }]).slice(0,12);
    const picks = (Array.isArray(answer) ? answer : []).map(p => ({ x:Number(p?.x),y:Number(p?.y) })).filter(p => Number.isFinite(p.x)&&Number.isFinite(p.y));
    if (!picks.length) return { correct: false };
    const covered = zones.filter(z => picks.some(p => distance2D(p.x,p.y,Number(z?.x??50),Number(z?.y??50)) <= Number(z?.r??15))).length;
    const ok = String(question.pinMode||'all') === 'any' ? covered >= 1 : covered >= zones.length;
    return { correct: ok };
  }
  return { correct: false };
}

function isAssignmentTeacherGradedQuestion(question) {
  if (!question) return false;
  if (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking') return true;
  if (question.type === 'text') {
    return (question.accepted || []).map(x => String(x || '').trim()).filter(Boolean).length === 0;
  }
  return false;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function evaluateAssignmentAttempt(assignment, attempt) {
  const answersByQ = attempt?.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
  const quizQuestions = assignment?.quiz?.questions || [];
  let answeredCount = 0, correctCount = 0, pendingTeacherGradeCount = 0, autoGradedCount = 0, teacherGradedCount = 0, autoScore = 0;
  Object.entries(answersByQ).forEach(([idxRaw, item]) => {
    const qIndex = Number(idxRaw); const question = quizQuestions[qIndex]; if (!question) return;
    answeredCount++;
    if (isAssignmentTeacherGradedQuestion(question)) {
      const grade = item?.teacherGrade;
      if (grade?.graded) { teacherGradedCount++; const pts = Math.max(0, Math.round(Number(grade?.pointsAwarded || 0))); autoScore += pts; if (pts > 0) correctCount++; }
      else { pendingTeacherGradeCount++; }
      return;
    }
    if (question.isPoll) { autoGradedCount++; return; }
    const verdict = evaluate(question, item?.answer);
    autoGradedCount++;
    if (verdict?.correct) { correctCount++; autoScore += Math.round(Number(question.points || 1000)); }
  });
  const gradedCount = autoGradedCount + teacherGradedCount;
  return { answeredCount, correctCount, pendingTeacherGradeCount, autoGradedCount, teacherGradedCount, autoScore: Math.round(autoScore), accuracy: gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100 * 10) / 10 : null, totalQuestions: Number(quizQuestions.length || 0) };
}

function normalizeQuiz(quiz) {
  return {
    version: 1, title: String(quiz.title || '').slice(0, 1200),
    questions: (quiz.questions || []).map(q => {
      const base = { id: q.id || 'test-id', type: q.type, prompt: String(q.prompt || '').slice(0,1200), points: [0,1000,2000].includes(Number(q.points)) ? Number(q.points) : 1000, timeLimit: Number(q.timeLimit || 0) >= 0 ? Number(q.timeLimit) : 0, isPoll: !!q.isPoll };
      if (['mcq','multi','audio'].includes(q.type)) {
        const answers = (q.answers || []).slice(0,10).map(a => ({ text: String(a.text || '').slice(0,90), correct: !!a.correct })).filter(a => a.text.trim().length > 0);
        if (answers.length < 2) return null;
        if (q.type === 'multi' && answers.filter(a => a.correct).length < 2) { for (let i = 0; i < answers.length && answers.filter(a=>a.correct).length < 2; i++) { if (!answers[i].correct) answers[i].correct = true; } }
        else if (q.type !== 'multi' && !answers.some(a => a.correct)) answers[0].correct = true;
        base.answers = answers;
      }
      if (q.type === 'text') { base.accepted = (q.accepted || []).map(x => String(x||'').trim()).filter(Boolean); if (!base.accepted.length) return null; }
      if (q.type === 'slider') { base.min = Number(q.min ?? 0); base.max = Number(q.max ?? 100); base.target = Number(q.target ?? 50); base.margin = ['none','low','medium','high','maximum'].includes(q.margin) ? q.margin : 'medium'; }
      if (q.type === 'context_gap') { base.gaps = (q.gaps || []).map(x => String(x||'').trim()).slice(0,10); if (!base.gaps.length) return null; }
      if (q.type === 'match_pairs') { base.pairs = (q.pairs || []).map(p => ({ left: String(p?.left||'').trim(), right: String(p?.right||'').trim() })).filter(p => p.left && p.right); if (base.pairs.length < 2) return null; }
      if (q.type === 'pin') { base.zones = (q.zones || []).map(z => ({ x: Number(z?.x??50), y: Number(z?.y??50), r: Number(z?.r??15) })).slice(0,12); base.pinMode = String(q.pinMode||'all'); }
      if (q.type === 'puzzle') { base.items = (q.items || []).map(x => String(x||'').trim()).slice(0,12); if (!base.items.length) return null; }
      if (q.type === 'error_hunt') { base.prompt = String(q.prompt||'').slice(0,1200); base.corrected = String(q.corrected||'').slice(0,1200); }
      if (q.type === 'open' || q.type === 'image_open' || q.type === 'speaking') { base.imageData = String(q.imageData || ''); }
      return base;
    }).filter(Boolean),
  };
}

function hasBlockedNickname(name) {
  const value = String(name || '').trim();
  if (!value) return true;
  return [/\bnazi\b/i, /\bhitler\b/i, /\bterrorist\b/i].some(re => re.test(value));
}

// ============ APP.JS FUNCTIONS ============

const REACTION_EMOJIS = ['👍','👏','🔥','😂','🤯','🙌','☕','😮','🤔','👀','🧠','❤️','😅','😎','🫶','6️⃣','7️⃣'];

function normalizeTtsLanguage(value) {
  const key = String(value || '').trim().toUpperCase();
  const EDGE_TTS_LANGUAGE_DEFAULTS = { EN: 'en-US-AriaNeural', CA: 'ca-ES-EnricNeural', FR: 'fr-FR-DeniseNeural' };
  return EDGE_TTS_LANGUAGE_DEFAULTS[key] ? key : 'EN';
}

function normalizeQuizAudioDefaults(tq) {
  if (!tq || typeof tq !== 'object') return;
  const raw = String(tq.ttsLanguage || '').trim().toUpperCase();
  tq.ttsLanguage = ['NONE','EN','CA','FR','OTHER'].includes(raw) ? raw : 'NONE';
  tq.readAllQuestionsAloud = tq.ttsLanguage !== 'NONE' && tq.readAllQuestionsAloud !== false;
}

function getHearQuestionsMode(tq) {
  const raw = String(tq?.ttsLanguage || '').trim().toUpperCase();
  if (raw === 'NONE' || !raw) return 'NONE';
  return normalizeTtsLanguage(tq?.ttsLanguage);
}

function createEmptyQuiz() { return { version: 1, title: '', ttsLanguage: 'NONE', readAllQuestionsAloud: false, questions: [] }; }

function mimeToExt(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) return '.bin';
  const mime = match[1];
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.bin';
}

function shuffleSeeded(prompt, id, answers) {
  const seed = Math.abs([...((prompt||'')+(id||''))].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)) || 1;
  const indices = answers.map((_,i) => i);
  let sr = seed;
  for (let s = indices.length - 1; s > 0; s--) { sr = (sr * 16807) % 2147483647; const j = sr % (s+1); [indices[s],indices[j]] = [indices[j],indices[s]]; }
  return indices.map(i => answers[i]);
}

function escapeHtml(str) { return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function toSafeFilename(s) { return String(s||'quiz').toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,''); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)); }
function formatHistoryAnswer(entry) { if (!entry) return '(no answer)'; if (Array.isArray(entry.answerText)) return entry.answerText.join(' | '); return String(entry.answerText || '(no answer)'); }
function parseAcceptedGapOptions(value) { return String(value||'').split(',').map(x => normalizeTextAnswer(x)).filter(Boolean); }
function contextGapExpectedOptions(gaps) { return (Array.isArray(gaps)?gaps:[]).map(g => { const o = parseAcceptedGapOptions(g); return o.length ? o : [normalizeTextAnswer(g)]; }).filter(o => o.some(Boolean)); }
function isContextGapCorrect(guessRaw, gaps) { const g = Array.isArray(guessRaw)?guessRaw.map(normalizeTextAnswer).filter(Boolean):[]; const e = contextGapExpectedOptions(gaps); if (!g.length||g.length!==e.length) return false; return g.every((v,i)=>e[i].includes(v)); }
function isMatchPairsCorrect(guessRaw, pairsRaw) {
  const p = (Array.isArray(pairsRaw)?pairsRaw:[]).map(p=>({left:normalizeTextAnswer(p?.left),right:normalizeTextAnswer(p?.right)})).filter(p=>p.left&&p.right);
  if (!p.length) return false;
  if (Array.isArray(guessRaw) && guessRaw.some(x=>x&&typeof x==='object')) {
    const ec = new Map(); p.forEach(pp=>{const k=`${pp.left}=>${pp.right}`;ec.set(k,(ec.get(k)||0)+1);});
    const gc = new Map(); guessRaw.forEach(g=>{const l=normalizeTextAnswer(g?.left),r=normalizeTextAnswer(g?.right);if(!l||!r)return;const k=`${l}=>${r}`;gc.set(k,(gc.get(k)||0)+1);});
    if (gc.size!==ec.size) return false; for (const [k,v] of ec.entries()) if ((gc.get(k)||0)!==v) return false; return true;
  }
  return false;
}

// ---- Extracted pure functions from app.js ----

function normalizeTtsLanguage(value) {
  const key = String(value || '').trim().toUpperCase();
  const EDGE_TTS_LANGUAGE_DEFAULTS = { EN: 'en-US-AriaNeural', CA: 'ca-ES-EnricNeural', FR: 'fr-FR-DeniseNeural' };
  return EDGE_TTS_LANGUAGE_DEFAULTS[key] ? key : 'EN';
}

function normalizeQuizAudioDefaults(targetQuiz) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const raw = String(targetQuiz.ttsLanguage || '').trim().toUpperCase();
  targetQuiz.ttsLanguage = ['NONE', 'EN', 'CA', 'FR', 'OTHER'].includes(raw) ? raw : 'NONE';
  targetQuiz.readAllQuestionsAloud = targetQuiz.ttsLanguage !== 'NONE' && targetQuiz.readAllQuestionsAloud !== false;
}

function getHearQuestionsMode(targetQuiz) {
  const raw = String(targetQuiz?.ttsLanguage || '').trim().toUpperCase();
  if (raw === 'NONE' || !raw) return 'NONE';
  return normalizeTtsLanguage(targetQuiz?.ttsLanguage);
}

function applyHearQuestionsMode(targetQuiz, modeValue) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const mode = String(modeValue || '').trim().toUpperCase();
  if (mode === 'NONE') { targetQuiz.ttsLanguage = 'NONE'; targetQuiz.readAllQuestionsAloud = false; return; }
  if (mode === 'READ') { targetQuiz.ttsLanguage = 'EN'; targetQuiz.readAllQuestionsAloud = false; return; }
  targetQuiz.ttsLanguage = normalizeTtsLanguage(mode);
  targetQuiz.readAllQuestionsAloud = true;
}

function createEmptyQuiz() {
  return { version: 1, title: '', ttsLanguage: 'NONE', readAllQuestionsAloud: false, questions: [] };
}

function mimeToExt(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) return '.bin';
  const mime = match[1];
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.bin';
}

function shuffleSeeded(prompt, id, answers) {
  const seed = Math.abs([...((prompt || '') + (id || ''))].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) || 1;
  const indices = answers.map((_, i) => i);
  let sr = seed;
  for (let s = indices.length - 1; s > 0; s--) {
    sr = (sr * 16807) % 2147483647;
    const j = sr % (s + 1);
    [indices[s], indices[j]] = [indices[j], indices[s]];
  }
  return indices.map(i => answers[i]);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAcceptedGapOptions(value) {
  return String(value || '')
    .split(',')
    .map((x) => normalizeTextAnswer(x))
    .filter(Boolean);
}

function contextGapExpectedOptions(gaps) {
  return (Array.isArray(gaps) ? gaps : [])
    .map((g) => {
      const opts = parseAcceptedGapOptions(g);
      return opts.length ? opts : [normalizeTextAnswer(g)];
    })
    .filter((opts) => opts.some(Boolean));
}

function isContextGapCorrect(guessRaw, gaps) {
  const guess = Array.isArray(guessRaw) ? guessRaw.map(normalizeTextAnswer).filter(Boolean) : [];
  const expected = contextGapExpectedOptions(gaps);
  if (!guess.length || guess.length !== expected.length) return false;
  return guess.every((g, i) => expected[i].includes(g));
}

function isMatchPairsCorrect(guessRaw, pairsRaw) {
  const pairs = (Array.isArray(pairsRaw) ? pairsRaw : [])
    .map((p) => ({ left: normalizeTextAnswer(p?.left), right: normalizeTextAnswer(p?.right) }))
    .filter((p) => p.left && p.right);
  if (!pairs.length) return false;

  if (Array.isArray(guessRaw) && guessRaw.some((x) => x && typeof x === 'object')) {
    const expectedCounts = new Map();
    pairs.forEach((p) => {
      const key = `${p.left}=>${p.right}`;
      expectedCounts.set(key, (expectedCounts.get(key) || 0) + 1);
    });
    const gotCounts = new Map();
    guessRaw.forEach((g) => {
      const left = normalizeTextAnswer(g?.left);
      const right = normalizeTextAnswer(g?.right);
      if (!left || !right) return;
      const key = `${left}=>${right}`;
      gotCounts.set(key, (gotCounts.get(key) || 0) + 1);
    });
    if (gotCounts.size !== expectedCounts.size) return false;
    for (const [k, v] of expectedCounts.entries()) {
      if ((gotCounts.get(k) || 0) !== v) return false;
    }
    return true;
  }
  return false;
}

function supportsQuestionAudio(type) {
  return ['mcq', 'multi', 'tf', 'text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'slider', 'pin', 'audio'].includes(String(type || ''));
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSafeFilename(s) {
  return String(s || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateImportedQuiz(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON root.');
  if (!Array.isArray(data.questions)) throw new Error('Missing questions array.');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function computeCrazyCountScore(toScore, p, elapsedMs) {
  const target = Math.max(0, Math.round(Number(toScore || 0)));
  if (p >= 1) return target;
  const targetStr = String(target);
  const len = targetStr.length;
  const chars = targetStr.split('');
  for (let posFromRight = 0; posFromRight < len; posFromRight++) {
    const idx = len - 1 - posFromRight;
    const stopAt = 0.5 + (posFromRight * (0.45 / Math.max(1, len - 1)));
    if (p < stopAt) {
      chars[idx] = String(Math.floor((elapsedMs / 22 + (idx + 1) * 3) % 10));
    }
  }
  const n = Number(chars.join(''));
  return Number.isFinite(n) ? n : target;
}

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function formatHistoryAnswer(entry) {
  if (!entry) return '(no answer)';
  if (Array.isArray(entry.answerText)) return entry.answerText.join(' | ');
  return String(entry.answerText || '(no answer)');
}

// ============ TESTS ============

describe('normalizeTextAnswer', () => {
  it('lowercases', () => { assert.equal(normalizeTextAnswer('Hello World'), 'hello world'); });
  it('removes punctuation', () => { assert.equal(normalizeTextAnswer('it is a test!'), 'it is a test'); });
  it('collapses whitespace', () => { assert.equal(normalizeTextAnswer('  a   b  '), 'a b'); });
  it('handles null/empty', () => { assert.equal(normalizeTextAnswer(null), ''); assert.equal(normalizeTextAnswer(''), ''); });
  it('removes hyphens', () => { assert.equal(normalizeTextAnswer('self-driving car'), 'self driving car'); });
  it('removes apostrophes', () => { assert.equal(normalizeTextAnswer("don't"), 'don t'); });
  it('removes exclamation', () => { assert.equal(normalizeTextAnswer('hello!'), 'hello'); });
});

describe('parseAcceptedGapOptions', () => {
  it('parses single option', () => { assert.deepEqual(parseAcceptedGapOptions('hello'), ['hello']); });
  it('parses comma-separated', () => { assert.deepEqual(parseAcceptedGapOptions('hello, world'), ['hello', 'world']); });
  it('handles empty', () => { assert.deepEqual(parseAcceptedGapOptions(''), []); });
  it('trims whitespace', () => { assert.deepEqual(parseAcceptedGapOptions('  a , b  '), ['a', 'b']); });
  it('removes punctuation from options', () => { assert.deepEqual(parseAcceptedGapOptions("don't, can't"), ['don t', 'can t']); });
  it('filters empty entries', () => { assert.deepEqual(parseAcceptedGapOptions('a,,b,'), ['a', 'b']); });
});

describe('contextGapExpectedOptions', () => {
  it('builds expected options from gaps', () => {
    const result = contextGapExpectedOptions(['hello, hi', 'world']);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0].sort(), ['hello', 'hi'].sort());
    assert.deepEqual(result[1], ['world']);
  });
  it('filters empty gap entries', () => {
    assert.deepEqual(contextGapExpectedOptions(['', null, '']), []);
  });
  it('handles non-array input', () => {
    assert.deepEqual(contextGapExpectedOptions(null), []);
    assert.deepEqual(contextGapExpectedOptions('not array'), []);
  });
});

describe('isContextGapCorrect', () => {
  it('accepts correct answers', () => {
    assert.ok(isContextGapCorrect(['hello', 'world'], ['hello', 'world']));
  });
  it('rejects wrong answers', () => {
    assert.ok(!isContextGapCorrect(['wrong', 'world'], ['hello', 'world']));
  });
  it('handles alternative answers', () => {
    assert.ok(isContextGapCorrect(['hello', 'earth'], ['hello, hi', 'world, earth']));
  });
  it('rejects wrong count', () => {
    assert.ok(!isContextGapCorrect(['only one'], ['gap1', 'gap2']));
  });
  it('rejects empty guess', () => {
    assert.ok(!isContextGapCorrect([], ['hello']));
  });
  it('is case-insensitive and punctuation-insensitive', () => {
    // normalizeTextAnswer("Don't") = "don t", normalizeTextAnswer("can't") = "can t"
    assert.ok(isContextGapCorrect(["don t", "can t"], ["don t", "can t"]));
    assert.ok(isContextGapCorrect(["DON T", "CAN T"], ["don t", "can t"]));
  });
});

describe('isMatchPairsCorrect', () => {
  it('accepts correct pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('accepts order-independent match', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'B', right: '2' }, { left: 'A', right: '1' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('rejects wrong pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '2' }, { left: 'B', right: '1' }];
    assert.ok(!isMatchPairsCorrect(guess, pairs));
  });
  it('rejects incomplete pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '1' }];
    assert.ok(!isMatchPairsCorrect(guess, pairs));
  });
  it('handles duplicate left values', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'A', right: '2' }];
    const guess = [{ left: 'A', right: '1' }, { left: 'A', right: '2' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('rejects with empty pairs', () => {
    assert.ok(!isMatchPairsCorrect([{ left: 'A', right: '1' }], []));
  });
  it('is case-insensitive', () => {
    const pairs = [{ left: 'Apple', right: 'Red' }];
    const guess = [{ left: 'apple', right: 'red' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
});

describe('supportsQuestionAudio', () => {
  it('supports mcq/tf/multi', () => {
    assert.ok(supportsQuestionAudio('mcq'));
    assert.ok(supportsQuestionAudio('tf'));
    assert.ok(supportsQuestionAudio('multi'));
  });
  it('supports text/open/audio', () => {
    assert.ok(supportsQuestionAudio('text'));
    assert.ok(supportsQuestionAudio('open'));
    assert.ok(supportsQuestionAudio('audio'));
  });
  it('supports puzzle/pin/slider', () => {
    assert.ok(supportsQuestionAudio('puzzle'));
    assert.ok(supportsQuestionAudio('pin'));
    assert.ok(supportsQuestionAudio('slider'));
  });
  it('supports context_gap/match_pairs/error_hunt', () => {
    assert.ok(supportsQuestionAudio('context_gap'));
    assert.ok(supportsQuestionAudio('match_pairs'));
    assert.ok(supportsQuestionAudio('error_hunt'));
  });
  it('does not support unknown types', () => {
    assert.ok(!supportsQuestionAudio('bogus'));
    assert.ok(!supportsQuestionAudio(''));
    assert.ok(!supportsQuestionAudio(null));
  });
});

describe('escapeHtml', () => {
  it('escapes < > &', () => {
    assert.equal(escapeHtml('<b>Tom & Jerry</b>'), '&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;');
  });
  it('escapes quotes', () => {
    assert.equal(escapeHtml('He said "hello"'), 'He said &quot;hello&quot;');
    assert.equal(escapeHtml("it's"), 'it&#39;s');
  });
  it('handles null/empty', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(''), '');
  });
  it('preserves safe text', () => {
    assert.equal(escapeHtml('hello world'), 'hello world');
  });
});

describe('toSafeFilename', () => {
  it('lowercases and replaces spaces', () => {
    assert.equal(toSafeFilename('My Quiz Title'), 'my-quiz-title');
  });
  it('removes special characters', () => {
    assert.equal(toSafeFilename("What's up?!"), 'what-s-up');
  });
  it('strips leading/trailing dashes', () => {
    assert.equal(toSafeFilename('!!!test'), 'test');
  });
  it('handles unicode characters', () => {
    assert.ok(toSafeFilename('Català quiz!').startsWith('catal'));
  });
  it('defaults to "quiz" for empty', () => {
    assert.equal(toSafeFilename(''), 'quiz');
    assert.equal(toSafeFilename(null), 'quiz');
  });
  it('handles unicode', () => {
    const result = toSafeFilename('Català quiz!');
    assert.ok(result.startsWith('catal'));
  });
});

describe('validateImportedQuiz', () => {
  it('accepts valid quiz', () => {
    assert.doesNotThrow(() => validateImportedQuiz({ questions: [] }));
    assert.doesNotThrow(() => validateImportedQuiz({ questions: [{ prompt: 'Q1' }] }));
  });
  it('rejects non-object', () => {
    assert.throws(() => validateImportedQuiz(null), /Invalid JSON root/);
    assert.throws(() => validateImportedQuiz('string'), /Invalid JSON root/);
    assert.throws(() => validateImportedQuiz(42), /Invalid JSON root/);
  });
  it('rejects missing questions', () => {
    assert.throws(() => validateImportedQuiz({}), /Missing questions array/);
    assert.throws(() => validateImportedQuiz({ questions: 'not array' }), /Missing questions array/);
  });
});

describe('clamp', () => {
  it('clamps within range', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
  });
  it('handles non-finite (falls back to min)', () => {
    assert.equal(clamp(Infinity, 0, 10), 0); // not finite → fallback to min
    assert.equal(clamp(NaN, 0, 10), 0);
    assert.equal(clamp(-Infinity, 0, 10), 0);
  });
  it('handles exact boundaries', () => {
    assert.equal(clamp(0, 0, 10), 0);
    assert.equal(clamp(10, 0, 10), 10);
  });
});

describe('computeCrazyCountScore', () => {
  it('returns target when p=1', () => {
    assert.equal(computeCrazyCountScore(1000, 1, 0), 1000);
    assert.equal(computeCrazyCountScore(500, 1, 9999), 500);
  });
  it('returns 0 for zero target', () => {
    assert.equal(computeCrazyCountScore(0, 1, 0), 0);
  });
  it('handles null/undefined target', () => {
    assert.equal(computeCrazyCountScore(null, 1, 0), 0);
  });
  it('returns numeric value for p < 1', () => {
    const result = computeCrazyCountScore(1000, 0.5, 1000);
    assert.ok(typeof result === 'number');
    assert.ok(Number.isFinite(result));
  });
  it('is deterministic for same inputs', () => {
    const r1 = computeCrazyCountScore(1000, 0.3, 5000);
    const r2 = computeCrazyCountScore(1000, 0.3, 5000);
    assert.equal(r1, r2);
  });
});

describe('tokenizeWords', () => {
  it('splits on whitespace', () => {
    assert.deepEqual(tokenizeWords('hello world'), ['hello', 'world']);
  });
  it('collapses multiple spaces', () => {
    assert.deepEqual(tokenizeWords('a   b  c'), ['a', 'b', 'c']);
  });
  it('returns empty for null/empty', () => {
    assert.deepEqual(tokenizeWords(null), []);
    assert.deepEqual(tokenizeWords(''), []);
  });
  it('handles single word', () => {
    assert.deepEqual(tokenizeWords('hello'), ['hello']);
  });
});

describe('formatHistoryAnswer', () => {
  it('formats array answer', () => {
    assert.equal(formatHistoryAnswer({ answerText: ['A', 'B'] }), 'A | B');
  });
  it('formats string answer', () => {
    assert.equal(formatHistoryAnswer({ answerText: 'hello' }), 'hello');
  });
  it('returns fallback for null', () => {
    assert.equal(formatHistoryAnswer(null), '(no answer)');
  });
  it('returns fallback for empty answerText', () => {
    assert.equal(formatHistoryAnswer({ answerText: '' }), '(no answer)');
  });
});

describe('Seeded shuffle', () => {
  it('4-item MCQ host/student match', () => {
    const a = ['Madrid', 'Paris', 'London', 'Berlin'];
    assert.deepEqual(shuffleSeeded('Capital of Spain?','',a), shuffleSeeded('Capital of Spain?','',a));
  });
  it('6-item match', () => {
    const a = ['Perro', 'Gato', 'Pájaro', 'Pez', 'Caballo', 'Vaca'];
    assert.deepEqual(shuffleSeeded('Translate to English?','',a), shuffleSeeded('Translate to English?','',a));
  });
  it('10-item match', () => {
    const a = ['Hidrógeno','Helio','Litio','Berilio','Boro','Carbono','Nitrógeno','Oxígeno','Flúor','Neón'];
    assert.deepEqual(shuffleSeeded('Elemento 5?','',a), shuffleSeeded('Elemento 5?','',a));
  });
  it('different prompts diverge', () => {
    const a = ['A','B','C','D','E','F'];
    assert.notDeepEqual(shuffleSeeded('Question A?','',a), shuffleSeeded('Question B?','',a));
  });
  it('different prompt IDs diverge', () => {
    const a = ['1','2','3','4','5'];
    assert.notDeepEqual(shuffleSeeded('Q?','q1',a), shuffleSeeded('Q?','q2',a));
  });
  it('preserves all items', () => {
    const a = ['Red','Green','Blue','Yellow','Purple','Orange'];
    const r = shuffleSeeded('colors','',a);
    assert.deepEqual(r.sort(), a.sort());
  });
  it('2 items', () => {
    const a = ['True','False'];
    const r = shuffleSeeded('tf?','',a);
    assert.deepEqual(r.sort(), a.sort());
  });
  it('single item', () => {
    const a = ['only'];
    assert.deepEqual(shuffleSeeded('t','',a), ['only']);
  });
  it('empty answers', () => {
    assert.deepEqual(shuffleSeeded('t','',[]), []);
  });
  it('null prompt/id', () => {
    const a = ['X','Y','Z'];
    assert.deepEqual(shuffleSeeded(null,null,a), shuffleSeeded(null,null,a));
  });
  it('unicode prompt', () => {
    const a = ['a','b','c','d'];
    assert.deepEqual(shuffleSeeded('Català, gràcies','',a), shuffleSeeded('Català, gràcies','',a));
  });
  it('deterministic across calls', () => {
    const a = ['1','2','3','4','5','6','7','8'];
    const r1 = shuffleSeeded('Q1','q1',a);
    const r2 = shuffleSeeded('Q1','q1',a);
    assert.deepEqual(r1, r2);
  });
  it('different order than non-seeded for 8 items', () => {
    const a = ['A','B','C','D','E','F','G','H'];
    const r = shuffleSeeded('test','',a);
    // Should still have all items
    assert.deepEqual(r.sort(), a.sort());
  });
  it('long answers (90 chars each)', () => {
    const a = [
      'This is a very long answer option number one that exceeds typical length',
      'Another extremely long answer choice for testing boundary conditions here',
      'Yet another lengthy response option to verify the shuffle handles it fine',
      'The fourth and final verbose answer option in this comprehensive test case',
    ];
    assert.deepEqual(shuffleSeeded('long?','',a), shuffleSeeded('long?','',a));
  });
  it('answers with special characters', () => {
    const a = ["C++", "C#", "F#", "B&M", "Q&A", "R&D"];
    assert.deepEqual(shuffleSeeded('languages?','',a), shuffleSeeded('languages?','',a));
  });
  it('same prompt different IDs → different order', () => {
    const a = ['True', 'False', 'Maybe', 'Unsure'];
    const r1 = shuffleSeeded('Q1','t1',a);
    const r2 = shuffleSeeded('Q1','t2',a);
    assert.ok(Array.isArray(r1));
    assert.ok(Array.isArray(r2));
    assert.deepEqual(r1.sort(), r2.sort()); // same items
  });
});

describe('Auto-fill image detection', () => {
  it('finds questions needing images', () => {
    const qs = [
      { imageKeyword: '', imageData: null },
      { imageKeyword: 'volcano', imageData: null },
      { imageKeyword: 'x', imageData: 'data:...' },
      { imageKeyword: 'y', imageData: 'https://r2.dev/...' },
    ];
    const needs = qs.filter(q => !q.imageData && q.imageKeyword);
    assert.equal(needs.length, 1);
    assert.equal(needs[0].imageKeyword, 'volcano');
  });
  it('skips no-keyword', () => {
    const qs = [{ imageKeyword: '', imageData: null }, { imageKeyword: undefined, imageData: null }];
    assert.equal(qs.filter(q => !q.imageData && q.imageKeyword).length, 0);
  });
  it('skips has-image', () => {
    const qs = [{ imageKeyword: 'x', imageData: 'https://...' }];
    assert.equal(qs.filter(q => !q.imageData && q.imageKeyword).length, 0);
  });
});

describe('TTS audio defaults', () => {
  it('normalizeTtsLanguage returns known languages', () => {
    assert.equal(normalizeTtsLanguage('EN'), 'EN');
    assert.equal(normalizeTtsLanguage('CA'), 'CA');
    assert.equal(normalizeTtsLanguage('FR'), 'FR');
  });
  it('normalizeTtsLanguage returns EN for unknown', () => {
    assert.equal(normalizeTtsLanguage('DE'), 'EN');
    assert.equal(normalizeTtsLanguage('bogus'), 'EN');
    assert.equal(normalizeTtsLanguage(''), 'EN');
    assert.equal(normalizeTtsLanguage(null), 'EN');
  });
  it('normalizeTtsLanguage is case-insensitive', () => {
    assert.equal(normalizeTtsLanguage('en'), 'EN');
    assert.equal(normalizeTtsLanguage('ca'), 'CA');
    assert.equal(normalizeTtsLanguage('Fr'), 'FR');
  });
  it('normalizeQuizAudioDefaults sets NONE for empty', () => {
    const q = {};
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults sets readAllQuestionsAloud for EN', () => {
    const q = { ttsLanguage: 'EN' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, true);
  });
  it('normalizeQuizAudioDefaults keeps disabled state', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: false };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults forces false for NONE', () => {
    const q = { ttsLanguage: 'NONE', readAllQuestionsAloud: true };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults converts legacy READ', () => {
    const q = { ttsLanguage: 'READ' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'NONE');
  });
  it('normalizeQuizAudioDefaults handles null', () => {
    assert.doesNotThrow(() => normalizeQuizAudioDefaults(null));
  });
  it('getHearQuestionsMode returns NONE for empty', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: '' }), 'NONE');
    assert.equal(getHearQuestionsMode({}), 'NONE');
    assert.equal(getHearQuestionsMode(null), 'NONE');
  });
  it('getHearQuestionsMode returns NONE for NONE', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'NONE' }), 'NONE');
  });
  it('getHearQuestionsMode returns language for known languages', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'EN' }), 'EN');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'CA' }), 'CA');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'FR' }), 'FR');
  });
  it('applyHearQuestionsMode sets NONE', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: true };
    applyHearQuestionsMode(q, 'NONE');
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('applyHearQuestionsMode converts READ', () => {
    const q = {};
    applyHearQuestionsMode(q, 'READ');
    assert.equal(q.ttsLanguage, 'EN');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('applyHearQuestionsMode sets language with readAllQuestionsAloud', () => {
    const q = {};
    applyHearQuestionsMode(q, 'CA');
    assert.equal(q.ttsLanguage, 'CA');
    assert.equal(q.readAllQuestionsAloud, true);
  });
  it('applyHearQuestionsMode handles null', () => {
    assert.doesNotThrow(() => applyHearQuestionsMode(null, 'EN'));
  });
  it('createEmptyQuiz has correct defaults', () => {
    const q = createEmptyQuiz();
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
    assert.equal(q.questions.length, 0);
    assert.equal(q.version, 1);
  });
});

describe('MIME to extension', () => {
  it('maps image types', () => {
    assert.equal(mimeToExt('data:image/jpeg;base64,x'), '.jpg');
    assert.equal(mimeToExt('data:image/png;base64,x'), '.png');
    assert.equal(mimeToExt('data:image/webp;base64,x'), '.webp');
    assert.equal(mimeToExt('data:image/gif;base64,x'), '.gif');
  });
  it('maps audio types', () => {
    assert.equal(mimeToExt('data:audio/mpeg;base64,x'), '.mp3');
  });
  it('returns .bin for unknown', () => {
    assert.equal(mimeToExt('data:application/octet-stream;base64,x'), '.bin');
  });
  it('returns .bin for non-data URL', () => {
    assert.equal(mimeToExt('https://example.com/img.jpg'), '.bin');
  });
  it('returns .bin for empty', () => {
    assert.equal(mimeToExt(''), '.bin');
  });
});

// ============ NEW TESTS: evaluate (answer grading) ============

describe('evaluate: MCQ/TF', () => {
  it('correct MCQ answer', () => {
    const q = { type: 'mcq', answers: [{ text: 'A', correct: false }, { text: 'B', correct: true }, { text: 'C', correct: false }] };
    assert.ok(evaluate(q, 1).correct);
  });
  it('wrong MCQ answer', () => {
    const q = { type: 'mcq', answers: [{ text: 'A', correct: false }, { text: 'B', correct: true }, { text: 'C', correct: false }] };
    assert.ok(!evaluate(q, 0).correct);
  });
  it('TF true correct', () => {
    const q = { type: 'tf', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }] };
    assert.ok(evaluate(q, 0).correct);
  });
  it('TF false wrong', () => {
    const q = { type: 'tf', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }] };
    assert.ok(!evaluate(q, 1).correct);
  });
  it('handles non-numeric answer', () => {
    const q = { type: 'mcq', answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }] };
    assert.ok(!evaluate(q, 'abc').correct); // NaN → not finite → false
    // Note: Number(null)=0 and Number(undefined)=NaN; null gets treated as index 0
    assert.ok(!evaluate(q, undefined).correct);
  });
  it('null question returns false', () => {
    assert.ok(!evaluate(null, 0).correct);
  });
});

describe('evaluate: multi-select', () => {
  it('all correct selected', () => {
    const q = { type: 'multi', answers: [{ text: 'A', correct: true }, { text: 'B', correct: true }, { text: 'C', correct: false }, { text: 'D', correct: false }] };
    assert.ok(evaluate(q, [0, 1]).correct);
  });
  it('partial selection wrong', () => {
    const q = { type: 'multi', answers: [{ text: 'A', correct: true }, { text: 'B', correct: true }, { text: 'C', correct: false }] };
    assert.ok(!evaluate(q, [0]).correct);
  });
  it('extra selection wrong', () => {
    const q = { type: 'multi', answers: [{ text: 'A', correct: true }, { text: 'B', correct: true }, { text: 'C', correct: false }] };
    assert.ok(!evaluate(q, [0, 1, 2]).correct);
  });
  it('wrong selection wrong', () => {
    const q = { type: 'multi', answers: [{ text: 'A', correct: true }, { text: 'B', correct: true }, { text: 'C', correct: false }] };
    assert.ok(!evaluate(q, [2]).correct);
  });
});

describe('evaluate: text answer', () => {
  it('accepts correct answer', () => {
    const q = { type: 'text', accepted: ['Paris', 'paris', 'PARIS'] };
    assert.ok(evaluate(q, 'paris').correct);
  });
  it('rejects wrong answer', () => {
    const q = { type: 'text', accepted: ['Paris'] };
    assert.ok(!evaluate(q, 'london').correct);
  });
  it('is case-insensitive and punctuation-insensitive', () => {
    const q = { type: 'text', accepted: ["don't", "can't"] };
    assert.ok(evaluate(q, 'don t').correct);
    assert.ok(evaluate(q, "DON'T").correct);
  });
  it('handles empty accepted', () => {
    const q = { type: 'text', accepted: [] };
    assert.ok(!evaluate(q, 'anything').correct);
  });
});

describe('evaluate: context gap', () => {
  it('correct gaps', () => {
    const q = { type: 'context_gap', gaps: ['Madrid', 'Spain'] };
    assert.ok(evaluate(q, ['Madrid', 'Spain']).correct);
  });
  it('wrong gaps', () => {
    const q = { type: 'context_gap', gaps: ['Madrid', 'Spain'] };
    assert.ok(!evaluate(q, ['London', 'UK']).correct);
  });
  it('alternative answers', () => {
    const q = { type: 'context_gap', gaps: ['Madrid, capital', 'Spain'] };
    assert.ok(evaluate(q, ['capital', 'Spain']).correct);
  });
});

describe('evaluate: match pairs', () => {
  it('correct pairs', () => {
    const q = { type: 'match_pairs', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] };
    assert.ok(evaluate(q, [{ left: 'A', right: '1' }, { left: 'B', right: '2' }]).correct);
  });
  it('wrong pairs', () => {
    const q = { type: 'match_pairs', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] };
    assert.ok(!evaluate(q, [{ left: 'A', right: '2' }, { left: 'B', right: '1' }]).correct);
  });
});

describe('evaluate: error hunt', () => {
  it('correct rewrite + tokens', () => {
    const q = { type: 'error_hunt', prompt: 'She say that she go to school', corrected: 'She said that she went to school' };
    const required = countErrorHuntRequiredTokens(q.prompt, q.corrected);
    assert.ok(required > 0, 'should require at least 1 token');
    // Error hunt requires both rewrite and token selection to match
  });
  it('wrong rewrite rejected', () => {
    const q = { type: 'error_hunt', prompt: 'She say go', corrected: 'She said went' };
    assert.ok(!evaluate(q, { rewrite: 'wrong answer', selectedTokens: [1, 2] }).correct);
  });
});

describe('evaluate: puzzle', () => {
  it('correct order', () => {
    const q = { type: 'puzzle', items: ['first', 'second', 'third'] };
    assert.ok(evaluate(q, ['first', 'second', 'third']).correct);
  });
  it('wrong order', () => {
    const q = { type: 'puzzle', items: ['first', 'second', 'third'] };
    assert.ok(!evaluate(q, ['third', 'first', 'second']).correct);
  });
  it('wrong count', () => {
    const q = { type: 'puzzle', items: ['a', 'b', 'c'] };
    assert.ok(!evaluate(q, ['a', 'b']).correct);
  });
});

describe('evaluate: slider', () => {
  it('exact target', () => {
    const q = { type: 'slider', min: 0, max: 100, target: 50, margin: 'medium' };
    assert.ok(evaluate(q, 50).correct);
  });
  it('within tolerance', () => {
    const q = { type: 'slider', min: 0, max: 100, target: 50, margin: 'medium' }; // tolerance = 10
    assert.ok(evaluate(q, 55).correct);
  });
  it('outside tolerance', () => {
    const q = { type: 'slider', min: 0, max: 100, target: 50, margin: 'medium' }; // tolerance = 10
    assert.ok(!evaluate(q, 70).correct);
  });
  it('none margin — exact only', () => {
    const q = { type: 'slider', min: 0, max: 100, target: 50, margin: 'none' };
    assert.ok(evaluate(q, 50).correct);
    assert.ok(!evaluate(q, 51).correct);
  });
  it('maximum margin — any value', () => {
    const q = { type: 'slider', min: 0, max: 100, target: 50, margin: 'maximum' };
    assert.ok(evaluate(q, 0).correct);
    assert.ok(evaluate(q, 100).correct);
  });
});

describe('evaluate: pin on image', () => {
  it('pin in correct zone', () => {
    const q = { type: 'pin', zones: [{ x: 50, y: 50, r: 20 }], pinMode: 'all' };
    assert.ok(evaluate(q, [{ x: 52, y: 52 }]).correct);
  });
  it('pin outside zone', () => {
    const q = { type: 'pin', zones: [{ x: 50, y: 50, r: 5 }], pinMode: 'all' };
    assert.ok(!evaluate(q, [{ x: 90, y: 90 }]).correct);
  });
  it('any mode — one zone hit', () => {
    const q = { type: 'pin', zones: [{ x: 20, y: 20, r: 5 }, { x: 80, y: 80, r: 5 }], pinMode: 'any' };
    assert.ok(evaluate(q, [{ x: 21, y: 21 }]).correct);
  });
  it('all mode — all zones must be hit', () => {
    const q = { type: 'pin', zones: [{ x: 20, y: 20, r: 5 }, { x: 80, y: 80, r: 5 }], pinMode: 'all' };
    assert.ok(!evaluate(q, [{ x: 21, y: 21 }]).correct);
    assert.ok(evaluate(q, [{ x: 21, y: 21 }, { x: 80, y: 80 }]).correct);
  });
  it('empty picks → false', () => {
    const q = { type: 'pin', zones: [{ x: 50, y: 50, r: 15 }] };
    assert.ok(!evaluate(q, []).correct);
  });
});

// ============ isAssignmentTeacherGradedQuestion ============

describe('isAssignmentTeacherGradedQuestion', () => {
  it('open is teacher-graded', () => { assert.ok(isAssignmentTeacherGradedQuestion({ type: 'open' })); });
  it('image_open is teacher-graded', () => { assert.ok(isAssignmentTeacherGradedQuestion({ type: 'image_open' })); });
  it('speaking is teacher-graded', () => { assert.ok(isAssignmentTeacherGradedQuestion({ type: 'speaking' })); });
  it('text with empty accepted is teacher-graded', () => { assert.ok(isAssignmentTeacherGradedQuestion({ type: 'text', accepted: [] })); });
  it('text with accepted answers is auto-graded', () => { assert.ok(!isAssignmentTeacherGradedQuestion({ type: 'text', accepted: ['Paris', 'London'] })); });
  it('mcq is auto-graded', () => { assert.ok(!isAssignmentTeacherGradedQuestion({ type: 'mcq' })); });
  it('tf is auto-graded', () => { assert.ok(!isAssignmentTeacherGradedQuestion({ type: 'tf' })); });
  it('null returns false', () => { assert.ok(!isAssignmentTeacherGradedQuestion(null)); });
});

// ============ evaluateAssignmentAttempt ============

describe('evaluateAssignmentAttempt', () => {
  it('scores correct MCQ answers', () => {
    const assignment = { quiz: { questions: [
      { type: 'mcq', points: 1000, answers: [{ text: 'A', correct: false }, { text: 'B', correct: true }] },
      { type: 'mcq', points: 1000, answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }] },
    ]}};
    const attempt = { answersByQ: { 0: { answer: 1 }, 1: { answer: 0 } } };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.autoScore, 2000);
    assert.equal(m.correctCount, 2);
    assert.equal(m.accuracy, 100);
  });
  it('scores mixed correct/wrong', () => {
    const assignment = { quiz: { questions: [
      { type: 'tf', points: 1000, answers: [{ text: 'T', correct: true }, { text: 'F', correct: false }] },
      { type: 'tf', points: 1000, answers: [{ text: 'T', correct: true }, { text: 'F', correct: false }] },
    ]}};
    const attempt = { answersByQ: { 0: { answer: 0 }, 1: { answer: 1 } } };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.autoScore, 1000);
    assert.equal(m.correctCount, 1);
    assert.equal(m.accuracy, 50);
  });
  it('handles unanswered questions', () => {
    const assignment = { quiz: { questions: [{ type: 'mcq', points: 1000, answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }] }] } };
    const attempt = { answersByQ: {} };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.autoScore, 0);
    assert.equal(m.answeredCount, 0);
  });
  it('counts teacher-graded pending', () => {
    const assignment = { quiz: { questions: [
      { type: 'open', points: 1000 },
    ]}};
    const attempt = { answersByQ: { 0: { answer: 'My essay' } } };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.pendingTeacherGradeCount, 1);
    assert.equal(m.autoScore, 0);
  });
  it('includes teacher-graded points', () => {
    const assignment = { quiz: { questions: [
      { type: 'open', points: 1000 },
    ]}};
    const attempt = { answersByQ: { 0: { answer: 'Essay', teacherGrade: { graded: true, pointsAwarded: 800 } } } };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.autoScore, 800);
    assert.equal(m.teacherGradedCount, 1);
    assert.equal(m.correctCount, 1);
  });
  it('skips poll questions', () => {
    const assignment = { quiz: { questions: [{ type: 'mcq', points: 1000, isPoll: true, answers: [{ text: 'A', correct: true }] }] } };
    const attempt = { answersByQ: { 0: { answer: 0 } } };
    const m = evaluateAssignmentAttempt(assignment, attempt);
    assert.equal(m.autoScore, 0);
    assert.equal(m.autoGradedCount, 1);
  });
  it('handles empty assignment', () => {
    const m = evaluateAssignmentAttempt({ quiz: { questions: [] } }, { answersByQ: {} });
    assert.equal(m.answeredCount, 0);
    assert.equal(m.accuracy, null);
  });
});

// ============ csvEscape ============

describe('csvEscape', () => {
  it('plain text unchanged', () => { assert.equal(csvEscape('hello'), 'hello'); });
  it('escapes commas', () => { assert.equal(csvEscape('a,b'), '"a,b"'); });
  it('escapes double quotes', () => { assert.equal(csvEscape('say "hi"'), '"say ""hi"""'); });
  it('escapes newlines', () => { assert.equal(csvEscape('line1\nline2'), '"line1\nline2"'); });
  it('handles null/undefined', () => { assert.equal(csvEscape(null), ''); assert.equal(csvEscape(undefined), ''); });
  it('handles numbers', () => { assert.equal(csvEscape(42), '42'); });
});

// ============ sliderTolerance ============

describe('sliderTolerance', () => {
  it('none = 0', () => { assert.equal(sliderTolerance('none', 0, 100), 0); });
  it('low = 5%', () => { assert.equal(sliderTolerance('low', 0, 100), 5); });
  it('medium = 10%', () => { assert.equal(sliderTolerance('medium', 0, 100), 10); });
  it('high = 20%', () => { assert.equal(sliderTolerance('high', 0, 100), 20); });
  it('maximum = 100%', () => { assert.equal(sliderTolerance('maximum', 0, 100), 100); });
  it('unknown → medium', () => { assert.equal(sliderTolerance('bogus', 0, 100), 10); });
  it('works with negative range', () => { assert.equal(sliderTolerance('medium', -50, 50), 10); });
});

// ============ distance2D ============

describe('distance2D', () => {
  it('same point = 0', () => { assert.equal(distance2D(50, 50, 50, 50), 0); });
  it('horizontal distance', () => { assert.equal(distance2D(0, 0, 3, 0), 3); });
  it('vertical distance', () => { assert.equal(distance2D(0, 0, 0, 4), 4); });
  it('diagonal 3-4-5', () => { assert.equal(distance2D(0, 0, 3, 4), 5); });
  it('within zone check', () => { assert.ok(distance2D(52, 52, 50, 50) <= 5); });
  it('outside zone check', () => { assert.ok(distance2D(90, 90, 50, 50) > 5); });
});

// ============ countErrorHuntRequiredTokens ============

describe('countErrorHuntRequiredTokens', () => {
  it('identical prompts = 0', () => {
    assert.equal(countErrorHuntRequiredTokens('hello world', 'hello world'), 0);
  });
  it('different prompts > 0', () => {
    assert.ok(countErrorHuntRequiredTokens('She say go', 'She said went') > 0);
  });
  it('empty prompts = 0', () => {
    assert.equal(countErrorHuntRequiredTokens('', ''), 0);
  });
});

// ============ normalizeQuiz ============

describe('normalizeQuiz', () => {
  it('normalizes title', () => {
    const r = normalizeQuiz({ title: 'A'.repeat(2000), questions: [] });
    assert.equal(r.title.length, 1200);
  });
  it('filters invalid MCQ (less than 2 answers)', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'mcq', answers: [{ text: 'only one', correct: true }] }] });
    assert.equal(r.questions.length, 0);
  });
  it('enforces multi-select min 2 correct', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'multi', answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }, { text: 'C', correct: false }] }] });
    const q = r.questions[0];
    assert.ok(q);
    assert.equal(q.answers.filter(a => a.correct).length, 2);
  });
  it('sets first answer correct if none correct (MCQ)', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'mcq', answers: [{ text: 'A', correct: false }, { text: 'B', correct: false }] }] });
    assert.ok(r.questions[0].answers[0].correct);
  });
  it('normalizes points', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'mcq', answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }], points: 999 }] });
    assert.equal(r.questions[0].points, 1000);
  });
  it('normalizes slider', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'slider', min: 10, max: 20, target: 15, margin: 'bogus' }] });
    assert.equal(r.questions[0].margin, 'medium');
  });
  it('filters text with no accepted', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'text', accepted: [] }] });
    assert.equal(r.questions.length, 0);
  });
  it('filters match_pairs with less than 2 pairs', () => {
    const r = normalizeQuiz({ title: 'T', questions: [{ type: 'match_pairs', pairs: [{ left: 'A', right: '1' }] }] });
    assert.equal(r.questions.length, 0);
  });
});

// ============ hasBlockedNickname ============

describe('hasBlockedNickname', () => {
  it('blocks empty', () => { assert.ok(hasBlockedNickname('')); assert.ok(hasBlockedNickname(null)); });
  it('blocks profanity', () => { assert.ok(hasBlockedNickname('nazi')); assert.ok(hasBlockedNickname('hitler')); });
  it('case-insensitive', () => { assert.ok(hasBlockedNickname('NAZI')); assert.ok(hasBlockedNickname('Hitler')); });
  it('allows normal names', () => { assert.ok(!hasBlockedNickname('Eugeni')); assert.ok(!hasBlockedNickname('Teacher123')); });
  it('blocks embedded profanity', () => { assert.ok(hasBlockedNickname('I am a terrorist')); });
});

// ============ REACTION_EMOJIS ============

describe('REACTION_EMOJIS', () => {
  it('has 17 emojis', () => { assert.equal(REACTION_EMOJIS.length, 17); });
  it('includes common reactions', () => {
    ['👍','👏','🔥','😂','🤔','🧠','❤️'].forEach(e => assert.ok(REACTION_EMOJIS.includes(e), `missing ${e}`));
  });
  it('all are strings', () => {
    REACTION_EMOJIS.forEach(e => assert.equal(typeof e, 'string'));
  });
});
