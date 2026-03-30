// Pin questions: show correct zones immediately in assignment mode with instant feedback
if (question.type === 'pin' && rrNow && rrNow.graded !== false) {
  highlightAnswerItems(rrNow.correct, state);
}
