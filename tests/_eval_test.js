function normalizeTextAnswer(text) { return String(text||'').toLowerCase().replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ').replace(/\s+/g, ' ').trim(); }
function evaluate(question, answer) {
  if (!question) return { correct: false };
  if (['mcq','tf','audio'].includes(question.type)) {
    const selected = Number(answer);
    if (!Number.isFinite(selected)) return { correct: false };
    const ci = (question.answers || []).findIndex(a => !!a.correct);
    return { correct: selected === ci };
  }
  return { correct: false };
}
function isAssignmentTeacherGradedQuestion(question) {
  if (!question) return false;
  return question.type === 'open' || question.type === 'image_open' || question.type === 'speaking';
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
  return { answeredCount, correctCount, pendingTeacherGradeCount, autoGradedCount, teacherGradedCount, autoScore: Math.round(autoScore), accuracy: gradedCount > 0 ? Math.round((correctCount / gradedCount) * 1000) / 100 : null, totalQuestions: Number(quizQuestions.length || 0) };
}

// Test 1: scores correct MCQ answers
const assignment = { quiz: { questions: [
  { type: 'mcq', points: 1000, answers: [{ text: 'A', correct: false }, { text: 'B', correct: true }] },
  { type: 'mcq', points: 1000, answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }] },
]}};
const attempt = { answersByQ: { 0: { answer: 1 }, 1: { answer: 0 } } };
const m = evaluateAssignmentAttempt(assignment, attempt);
console.log('autoScore:', m.autoScore, '(expected 2000)');
console.log('correctCount:', m.correctCount, '(expected 2)');
console.log('accuracy:', m.accuracy, '(expected 100)');
