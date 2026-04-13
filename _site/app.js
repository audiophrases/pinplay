const STORAGE_KEY = 'pinplay.quiz.v1';
const STORAGE_LIBRARY_KEY = 'pinplay.quiz.library.v1';
const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CREATE_UNLOCK_KEY = 'pinplay.create.unlocked.v1';
const DRIVE_PUBLISH_ENDPOINT = '/api/drive/publish';

const TEMPLATE_ALL_13_TYPES = {
  "version": 3,
  "title": "AI Quiz Reference",
  "ttsLanguage": "EN",
  "language": "en-US-AriaNeural",
  "readAllQuestionsAloud": true,
  "questions": [
    {
      "id": "q1-mcq",
      "type": "mcq",
      "prompt": "What animal is this?",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "What animal is this?",
      "ttsLanguage": "EN",
      "imageKeyword": "cat face",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "answers": [
        { "text": "Cat", "correct": true },
        { "text": "Dog", "correct": false },
        { "text": "Bird", "correct": false }
      ]
    },
    {
      "id": "q2-multi",
      "type": "multi",
      "prompt": "Select all fruits shown.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Select all fruits shown.",
      "ttsLanguage": "EN",
      "imageKeyword": "basket of fruit",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "answers": [
        { "text": "Apple", "correct": true },
        { "text": "Carrot", "correct": false },
        { "text": "Banana", "correct": true },
        { "text": "Broccoli", "correct": false }
      ]
    },
    {
      "id": "q3-tf",
      "type": "tf",
      "prompt": "True or False: This is a mountain.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Is this a mountain?",
      "ttsLanguage": "EN",
      "imageKeyword": "snowy mountain peak",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "answers": [
        { "text": "True", "correct": true },
        { "text": "False", "correct": false }
      ]
    },
    {
      "id": "q4-text",
      "type": "text",
      "prompt": "Name the color of the car.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "What color is this car?",
      "ttsLanguage": "FR",
      "language": "fr-FR-DeniseNeural",
      "imageKeyword": "red sports car",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "accepted": ["red", "crimson", "scarlet"]
    },
    {
      "id": "q5-context",
      "type": "context_gap",
      "prompt": "I went to the ____ and bought some ____.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "I went to the blank and bought some blank.",
      "ttsLanguage": "EN",
      "imageKeyword": "supermarket aisle",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "gaps": ["market", "apples"]
    },
    {
      "id": "q6-match",
      "type": "match_pairs",
      "prompt": "Match the animals to their sounds.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Match these animals with their sounds.",
      "ttsLanguage": "CA",
      "language": "ca-ES-JoanaNeural",
      "imageKeyword": "farm animals group",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "pairs": [
        { "left": "Dog", "right": "Bark" },
        { "left": "Cat", "right": "Meow" },
        { "left": "Cow", "right": "Moo" }
      ]
    },
    {
      "id": "q7-error",
      "type": "error_hunt",
      "prompt": "He go to school every days.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "He go to school every days.",
      "ttsLanguage": "EN",
      "imageKeyword": "boy going to school",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "corrected": "He goes to school every day.",
      "correctedVariants": ["He goes to school every day."]
    },
    {
      "id": "q8-open",
      "type": "open",
      "prompt": "Describe the weather in one sentence.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Please describe the weather you see.",
      "ttsLanguage": "OTHER",
      "language": "ja-JP-NanamiNeural",
      "imageKeyword": "sunny blue sky",
      "imageData": ""
    },
    {
      "id": "q9-speaking",
      "type": "speaking",
      "prompt": "Say a sentence about this picture.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Tell me something about this image.",
      "ttsLanguage": "EN",
      "imageKeyword": "robot waving",
      "imageData": ""
    },
    {
      "id": "q10-puzzle",
      "type": "puzzle",
      "prompt": "Reorder the words to form a sentence.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Reorder these words.",
      "ttsLanguage": "EN",
      "imageKeyword": "cat on a mat",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "items": ["The", "cat", "sat", "on", "the", "mat"]
    },
    {
      "id": "q11-slider",
      "type": "slider",
      "prompt": "How many books do you read per year?",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "How many books?",
      "ttsLanguage": "EN",
      "imageKeyword": "stack of books",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "min": 0,
      "max": 50,
      "target": 12,
      "margin": "low",
      "unit": "books"
    },
    {
      "id": "q12-pin",
      "type": "pin",
      "prompt": "Tap both joysticks.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Where are the joysticks on this controller?",
      "ttsLanguage": "EN",
      "imageKeyword": "game controller top view",
      "videoKeyword": "",
      "videoProviderPreference": "",
      "imageData": "",
      "zones": [
        { "x": 57.2, "y": 25.1, "r": 6 },
        { "x": 43.4, "y": 24.8, "r": 6 }
      ],
      "pinMode": "all"
    },
    {
      "id": "q13-voice-record",
      "type": "voice_record",
      "prompt": "Record yourself saying: I can describe this image in one sentence.",
      "points": 1000,
      "timeLimit": 0,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "Please record your voice and say: I can describe this image in one sentence.",
      "ttsLanguage": "OTHER",
      "language": "es-ES-ElviraNeural",
      "imageKeyword": "student speaking into microphone",
      "imageData": ""
    }
  ]
};

const QUESTION_TYPE_CATALOG = [
  { type: 'mcq', label: 'MCQ', inTemplate: true, supportsAudio: true },
  { type: 'multi', label: 'Multi', inTemplate: true, supportsAudio: true },
  { type: 'tf', label: 'T/F', inTemplate: true, supportsAudio: true },
  { type: 'text', label: 'Text', inTemplate: true, supportsAudio: true },
  { type: 'context_gap', label: 'Gap fill', inTemplate: true, supportsAudio: true },
  { type: 'match_pairs', label: 'Match', inTemplate: true, supportsAudio: true },
  { type: 'error_hunt', label: 'Error Hunt', inTemplate: true, supportsAudio: true },
  { type: 'puzzle', label: 'Puzzle', inTemplate: true, supportsAudio: true },
  { type: 'slider', label: 'Slider', inTemplate: true, supportsAudio: true },
  { type: 'pin', label: 'Pin spot', inTemplate: true, supportsAudio: true },
  { type: 'open', label: 'Open', inTemplate: true, supportsAudio: true },
  { type: 'speaking', label: 'Speaking', inTemplate: true, supportsAudio: true },
  { type: 'voice_record', label: 'Voice Record', inTemplate: true, supportsAudio: true }
];

const CANONICAL_QUESTION_TYPES = QUESTION_TYPE_CATALOG.map((item) => item.type);
const TEMPLATE_QUESTION_TYPES = QUESTION_TYPE_CATALOG.filter((item) => item.inTemplate).map((item) => item.type);
const AUDIO_CAPABLE_QUESTION_TYPES = QUESTION_TYPE_CATALOG.filter((item) => item.supportsAudio).map((item) => item.type);

const QUESTION_TYPE_EXPLANATIONS = {
  "mcq": {
    "name": "Multiple Choice (Single)",
    "rules": "Standard question with up to 10 options. Only one correct answer.",
    "constraints": { "maxAnswers": 10, "maxTextLength": 120 },
    "pedagogicalUses": ["Fast checks of core concepts.", "Introduce retrieval with clear distractors."],
    "ttsStrategy": "Use audioText to highlight key words or read a simplified stem.",
    "differentiationTips": ["Offer one obvious distractor for lower confidence learners.", "Use paired near-miss distractors for advanced learners."],
    "commonPitfalls": ["Too many trivial distractors.", "Answer length gives away the correct option."]
  },
  "multi": {
    "name": "Multiple Choice (Select All)",
    "rules": "Up to 10 options. Multiple correct answers possible.",
    "constraints": { "maxAnswers": 10, "maxTextLength": 120 },
    "pedagogicalUses": ["Check nuanced understanding with partial truth options.", "Promote justification and comparison."],
    "ttsStrategy": "audioText can chunk long prompts into shorter listening cues.",
    "differentiationTips": ["Keep 2 correct answers for access; increase to 3+ for challenge."],
    "commonPitfalls": ["Single obvious answer turns this into MCQ.", "Too many options overloads working memory."]
  },
  "tf": {
    "name": "True / False",
    "rules": "Exactly 2 options: True and False.",
    "constraints": { "maxAnswers": 2 },
    "pedagogicalUses": ["Quick confidence check.", "Warm-up before deeper item types."],
    "ttsStrategy": "Use audioText to stress qualifiers like always/never/sometimes.",
    "differentiationTips": ["Start with concrete facts, then move to interpretation statements."],
    "commonPitfalls": ["Overusing absolutes makes answers too easy.", "Binary format can inflate guessing."]
  },
  "text": {
    "name": "Typed Answer",
    "rules": "Students type the answer. Case-insensitive matching.",
    "constraints": { "maxAcceptedVariants": 20, "maxTextLength": 120 },
    "pedagogicalUses": ["Spelling and recall checks.", "Short constructed response without options."],
    "ttsStrategy": "audioText may intentionally differ from prompt for dictation/listening contrast.",
    "differentiationTips": ["Include common variant spellings in accepted.", "Use shorter expected targets for novice learners."],
    "commonPitfalls": ["Too few accepted variants.", "Prompt expects long open-ended writing."]
  },
  "context_gap": {
    "name": "Gap Fill (Fill in Blank)",
    "rules": "Use four underscores (____) in the prompt to mark a gap. The 'gaps' array must contain the correct words in order.",
    "constraints": { "maxGaps": 10, "maxTextLength": 120 },
    "pedagogicalUses": ["Grammar and syntax practice in context.", "Focused vocabulary retrieval in sentences."],
    "ttsStrategy": "audioText can read sentence with pauses where blanks appear.",
    "differentiationTips": ["Use one gap for support; add multi-gap chains for challenge."],
    "commonPitfalls": ["Prompt missing ____ markers.", "Gaps array not matching blank order."]
  },
  "match_pairs": {
    "name": "Match Pairs",
    "rules": "Students match items from the left col to the right col. Define as pairs.",
    "constraints": { "maxPairs": 10, "maxTextLength": 120 },
    "pedagogicalUses": ["Terminology linking (term-definition, symbol-meaning).", "Reinforce associations before transfer tasks."],
    "ttsStrategy": "audioText can announce matching objective, not every pair.",
    "differentiationTips": ["Keep semantic categories distinct for novices.", "Increase similarity between distractor pairs for experts."],
    "commonPitfalls": ["Ambiguous pair mapping.", "Pairs too long for fast scanning."]
  },
  "error_hunt": {
    "name": "Error Hunting",
    "rules": "The prompt is a sentence with errors. Students tap words (tokens) they think are wrong. 'corrected' must be the full fixed sentence.",
    "constraints": { "maxTokens": 40 },
    "pedagogicalUses": ["Editing and proofreading routines.", "Metalinguistic awareness tasks."],
    "ttsStrategy": "audioText can read the incorrect sentence to trigger listening-for-errors.",
    "differentiationTips": ["Start with one error; increase to multi-error sentences."],
    "commonPitfalls": ["corrected sentence missing.", "Too many errors at once obscures learning goal."]
  },
  "puzzle": {
    "name": "Puzzle (Reorder)",
    "rules": "Unordered list of words or items that students must drag into the correct order.",
    "constraints": { "maxItems": 12 },
    "pedagogicalUses": ["Sentence structure and sequencing.", "Process/order understanding."],
    "ttsStrategy": "audioText may preview intended final sentence before reconstruction.",
    "differentiationTips": ["Use fewer chunks with punctuation scaffolds first.", "Remove punctuation cues for advanced challenge."],
    "commonPitfalls": ["Items can form multiple valid sequences unintentionally.", "Too many tiny tokens create noise."]
  },
  "slider": {
    "name": "Numeric Slider",
    "rules": "Numeric target value on a range with a margin of error ('none', 'low', 'medium', 'high', 'maximum').",
    "constraints": { "minValue": -1000000, "maxValue": 1000000 },
    "pedagogicalUses": ["Estimation and number sense.", "Check approximate reasoning quickly."],
    "ttsStrategy": "audioText should include unit and estimate expectation.",
    "differentiationTips": ["Widen margin for emerging learners.", "Tighten margin for mastery checks."],
    "commonPitfalls": ["Target outside min/max.", "Missing or unclear unit context."]
  },
  "pin": {
    "name": "Pin the Spot",
    "rules": "Click on specific areas (zones) of an image. Zones use x, y percentages (0-100) and r (radius).",
    "constraints": { "maxZones": 12 },
    "pedagogicalUses": ["Spatial identification (maps, diagrams, anatomy).", "Visual discrimination practice."],
    "ttsStrategy": "audioText can cue region hints without giving exact coordinates.",
    "differentiationTips": ["Use larger radius and single zone for support.", "Use multi-zone all-mode for challenge."],
    "commonPitfalls": ["Zones off-image bounds.", "imageKeyword too vague for reliable visual target."]
  },
  "open": {
    "name": "Open Answer",
    "rules": "Critical thinking or research task. No auto-grading. Teacher grades manually later.",
    "constraints": { "maxTextLength": 500 },
    "pedagogicalUses": ["Explain reasoning in full sentences.", "Collect evidence of conceptual transfer."],
    "ttsStrategy": "audioText can rephrase prompt in simpler language for accessibility.",
    "differentiationTips": ["Add sentence starters for support.", "Require evidence/citation for advanced responses."],
    "commonPitfalls": ["Prompt too broad for available time.", "No clear grading target."]
  },
  "speaking": {
    "name": "Speaking Task",
    "rules": "Voice-enabled answer. Students record/speak their answer in class. Teacher grades manually.",
    "constraints": { "maxSpeakTime": 60 },
    "pedagogicalUses": ["Oral fluency practice.", "Pronunciation and speaking confidence checks."],
    "ttsStrategy": "audioText can model tone/register expected in student response.",
    "differentiationTips": ["Use short sentence frames for support.", "Add argument or explanation requirements for challenge."],
    "commonPitfalls": ["Task too long for time limit.", "Prompt unclear about expected speaking length."]
  },
  "voice_record": {
    "name": "Voice Recording",
    "rules": "Students record a spoken answer. Teacher grades manually by listening to the playback.",
    "constraints": { "maxDurationSec": 120, "maxSizeMB": 10 },
    "pedagogicalUses": ["Oral fluency and pronunciation practice.", "Extended spoken response for deeper assessment."],
    "ttsStrategy": "audioText can model the expected response register.",
    "differentiationTips": ["Allow shorter recordings for emerging speakers.", "Require longer, structured responses for advanced learners."],
    "commonPitfalls": ["Prompt too open-ended without time guidance.", "No clear rubric for grading."]
  }
};

// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Builder
const quizTitleEl = document.getElementById('quizTitle');
const quizTtsLanguageEl = document.getElementById('quizTtsLanguage');
const questionListEl = document.getElementById('questionList');
const addMcqBtn = document.getElementById('addMcqBtn');
const addMcqAudioBtn = document.getElementById('addMcqAudioBtn');
const addMultiBtn = document.getElementById('addMultiBtn');
const addMultiAudioBtn = document.getElementById('addMultiAudioBtn');
const addTfBtn = document.getElementById('addTfBtn');
const addTfAudioBtn = document.getElementById('addTfAudioBtn');
const addTextBtn = document.getElementById('addTextBtn');
const addTextAudioBtn = document.getElementById('addTextAudioBtn');
const addOpenBtn = document.getElementById('addOpenBtn');
const addSpeakingBtn = document.getElementById('addSpeakingBtn');
const addVoiceRecordBtn = document.getElementById('addVoiceRecordBtn');
const addImageOpenBtn = document.getElementById('addImageOpenBtn');
const addContextGapBtn = document.getElementById('addContextGapBtn');
const addMatchPairsBtn = document.getElementById('addMatchPairsBtn');
const addErrorHuntBtn = document.getElementById('addErrorHuntBtn');
const addPuzzleBtn = document.getElementById('addPuzzleBtn');
const addPuzzleAudioBtn = document.getElementById('addPuzzleAudioBtn');
const addSliderBtn = document.getElementById('addSliderBtn');
const addPinBtn = document.getElementById('addPinBtn');
const saveBtn = document.getElementById('saveBtn');
const openLocalBtn = document.getElementById('openLocalBtn');
const exportBtn = document.getElementById('exportBtn');
const publishDriveBtn = document.getElementById('publishDriveBtn');
const openDriveBtn = document.getElementById('openDriveBtn');
const openCloudBtn = document.getElementById('openCloudBtn');
const saveCloudBtn = document.getElementById('saveCloudBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const builderSectionToggleEl = document.getElementById('builderSectionToggle');
const builderCardBodyEl = document.getElementById('builderCardBody');
const creationPromptToggleEl = document.getElementById('creationPromptToggle');
const creationPromptBodyEl = document.getElementById('creationPromptBody');
const builderSettingsToggleEl = document.getElementById('builderSettingsToggle');
const builderSettingsBodyEl = document.getElementById('builderSettingsBody');
const builderTypesToggleEl = document.getElementById('builderTypesToggle');
const builderTypesBodyEl = document.getElementById('builderTypesBody');
const builderQuestionsToggleEl = document.getElementById('builderQuestionsToggle');
const builderQuestionsBodyEl = document.getElementById('builderQuestionsBody');
const exportPromptBtn = document.getElementById('exportPromptBtn');
const promptStatusEl = document.getElementById('promptStatus');
const liveScreenSectionToggleEl = document.getElementById('liveScreenSectionToggle');
const liveScreenCardBodyEl = document.getElementById('liveScreenCardBody');
const gameControlsSectionToggleEl = document.getElementById('gameControlsSectionToggle');
const gameControlsCardBodyEl = document.getElementById('gameControlsCardBody');
const assignmentSectionToggleEl = document.getElementById('assignmentSectionToggle');
const assignmentSectionBodyEl = document.getElementById('assignmentSectionBody');

// Create-side auth
const createAuthCard = document.getElementById('createAuthCard');
const createWorkspace = document.getElementById('createWorkspace');
const createPasswordEl = document.getElementById('createPassword');
const unlockCreateBtn = document.getElementById('unlockCreateBtn');
const createAuthStatusEl = document.getElementById('createAuthStatus');
const backendStatusEl = document.getElementById('backendStatus');

// Host controls (create side)
const hostCardEl = document.getElementById('hostCard');
const createLiveBtn = document.getElementById('createLiveBtn');
const hostApplyBuilderBtn = document.getElementById('hostApplyBuilderBtn');
const hostRefreshBtn = document.getElementById('hostRefreshBtn');
const hostStartBtn = document.getElementById('hostStartBtn');
const hostPrevBtn = document.getElementById('hostPrevBtn');
const hostNextBtn = document.getElementById('hostNextBtn');
const previewUnifiedBtn = document.getElementById('previewUnifiedBtn');
const previewRerollBtn = document.getElementById('previewRerollBtn');
const previewResimBtn = document.getElementById('previewResimBtn');
const previewJumpInputEl = document.getElementById('previewJumpInput');
const previewJumpBtn = document.getElementById('previewJumpBtn');
const previewExitBtn = document.getElementById('previewExitBtn');
const studentPreviewStackCardEl = document.getElementById('studentPreviewStackCard');
const studentPreviewSummaryEl = document.getElementById('studentPreviewSummary');
const studentPreviewStackEl = document.getElementById('studentPreviewStack');
const hostJoinPinEl = document.getElementById('hostJoinPin');
const hostJoinBtn = document.getElementById('hostJoinBtn');
const assignmentClassEl = document.getElementById('assignmentClass');
const assignmentDueAtEl = document.getElementById('assignmentDueAt');
const assignmentAttemptsEl = document.getElementById('assignmentAttempts');
const assignmentInstantFeedbackBtn = document.getElementById('assignmentInstantFeedbackBtn');
const createAssignmentBtn = document.getElementById('createAssignmentBtn');
const refreshAssignmentsBtn = document.getElementById('refreshAssignmentsBtn');
const assignmentSelfCheckBtn = document.getElementById('assignmentSelfCheckBtn');
const assignmentStatusEl = document.getElementById('assignmentStatus');
const assignmentListEl = document.getElementById('assignmentList');
const assignmentResultsSummaryEl = document.getElementById('assignmentResultsSummary');
const assignmentResultsFilterEl = document.getElementById('assignmentResultsFilter');
const assignmentResultsListEl = document.getElementById('assignmentResultsList');
const assignmentGradingSummaryEl = document.getElementById('assignmentGradingSummary');
const assignmentGradingListEl = document.getElementById('assignmentGradingList');
const livePinEl = document.getElementById('livePin');
const livePhaseEl = document.getElementById('livePhase');
const liveProgressEl = document.getElementById('liveProgress');
const liveResponsesEl = document.getElementById('liveResponses');
const liveReactionsEl = document.getElementById('liveReactions');
const hostPlayersEl = document.getElementById('hostPlayers');
const hostAnswerHistoryEl = document.getElementById('hostAnswerHistory');
const hostAttemptsRefreshBtn = document.getElementById('hostAttemptsRefreshBtn');
const hostAttemptsExportBtn = document.getElementById('hostAttemptsExportBtn');
const hostAttemptsClassFilterEl = document.getElementById('hostAttemptsClassFilter');
const hostAttemptsSearchEl = document.getElementById('hostAttemptsSearch');
const hostAttemptsSummaryEl = document.getElementById('hostAttemptsSummary');
const hostAttemptsListEl = document.getElementById('hostAttemptsList');
const hostStatusEl = document.getElementById('hostStatus');
const hostPlayersCountEl = document.getElementById('hostPlayersCount');
const mediaProgressEl = document.getElementById('mediaProgressEl') || createMediaProgressEl();

function createMediaProgressEl() {
  const el = document.createElement('div');
  el.id = 'mediaProgressEl';
  el.className = 'media-progress';
  document.body.appendChild(el);
  return el;
}
const hostQuestionWrap = document.getElementById('hostQuestionWrap');
const hostQuestionPromptEl = document.getElementById('hostQuestionPrompt');
const hostQuestionAnswersEl = document.getElementById('hostQuestionAnswers');
const hostQuestionHintEl = document.getElementById('hostQuestionHint');
const randomNamesToggleEl = document.getElementById('randomNamesToggle');
const hallCardEl = document.getElementById('hallCard');
const hostQuestionCardEl = document.getElementById('hostQuestionCard');
const livePinBigEl = document.getElementById('livePinBig');
const livePinHudEl = document.getElementById('livePinHud');
const hallHintEl = document.getElementById('hallHint');
const hallLobbyPlayersEl = document.getElementById('hallLobbyPlayers');
const projectorFullscreenBtn = document.getElementById('projectorFullscreenBtn');
const projectorTimerEl = document.getElementById('projectorTimer');
const projectorAnswersEl = document.getElementById('projectorAnswers');
const projectorProgressEl = document.getElementById('projectorProgress');
const projectorCorrectEl = document.getElementById('projectorCorrect');
const projectorScoresEl = document.getElementById('projectorScores');
const projectorReactionsEl = document.getElementById('projectorReactions');

// Join controls
const joinPinEl = document.getElementById('joinPin');
const joinNameEl = document.getElementById('joinName');
const joinBtn = document.getElementById('joinBtn');
const joinStatusEl = document.getElementById('joinStatus');
const joinQuestionWrap = document.getElementById('joinQuestionWrap');
const joinProgressEl = document.getElementById('joinProgress');
const joinScoreEl = document.getElementById('joinScore');
const joinPromptEl = document.getElementById('joinPrompt');
const joinAnswersEl = document.getElementById('joinAnswers');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinFeedbackEl = document.getElementById('joinFeedback');

// Solo mode
const pinValueEl = document.getElementById('pinValue');
const studentNameEl = document.getElementById('studentName');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const feedbackEl = document.getElementById('feedback');
const progressEl = document.getElementById('progress');
const scoreEl = document.getElementById('score');
const qPromptEl = document.getElementById('qPrompt');
const answersEl = document.getElementById('answers');
const finalScoreEl = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');

const lobbyCard = document.getElementById('lobbyCard');
const gameCard = document.getElementById('gameCard');
const resultCard = document.getElementById('resultCard');

const shouldAutoloadQuiz = !window.location.pathname.includes('/create/');
let quiz = shouldAutoloadQuiz ? (loadQuiz() || createEmptyQuiz()) : createEmptyQuiz();
normalizeQuizAudioDefaults(quiz);
collapseAllQuestions(quiz);
let soloGame = null;
let pendingScrollQuestionIndex = null;
let dragQuestionIndex = null;
let activeQuestionAudioEl = null;
const edgeTtsBlobUrlCache = new Map();
let previewMode = {
  active: false,
  index: 0,
  showReveal: false,
  score: 0,
  answeredCurrent: false,
  revealedResult: null,
  simStudentCount: 10,
  simProfile: 'balanced',
  simTimingProfile: 'staggered',
  simTextQualityProfile: 'acceptable',
  simEdgeCaseProfile: 'none',
  simNames: [],
  simClassSeed: 0,
  simQuestionSeed: 0,
  simTeacherByQ: {},
  prevPrimaryAudioHost: null,
};
let createSessionPassword = '';
let assignmentResultsCache = null;
let assignmentFeedbackMode = 'instant'; // 'none', 'instant', 'end'


const hostTimerBarFill = ensureTimerProgressBar(hostQuestionCardEl, 'hostTimerBar');

const live = {
  host: {
    pin: null,
    token: null,
    pollTimer: null,
    timerTicker: null,
    timerDeadlineMs: null,
    timerForIndex: null,
    timerStartedAtMs: null,
    timerLimitSec: null,
    timerAnchorAtMs: null,
    timerInitialRemainingMs: null,
    isPrimaryAudioHost: false,
    lastPhase: null,
    lastIndex: null,
    lastResponseCount: 0,
    lastAllAnsweredKey: null,
    lastRevealKey: null,
    lastQuestionRenderKey: null,
    state: null,
    pollViewMode: 'bar',
    rankingMode: false,
    rankingAnimStartAt: 0,
    rankingAnimDurationMs: 3800,
    rankingAnimFrom: {},
    rankingAnimTo: {},
    rankingAnimRafId: null,
    lastScoresByPlayer: {},
    currentAnsweringFx: null,
    currentAnsweringFxKey: null,
    lastAnsweringFxIndex: -1,
    hostVideoPlaying: false,
    seenReactionKeys: new Set(),
    lastHostAudioKey: null,
    pendingAutoAudioTimer: null,
    finalRevealKey: null,
    finalRevealStartedAt: 0,
    finalRevealStagePlayed: {
      third: false,
      second: false,
      drumroll: false,
      winner: false,
    },
    questionIntroKey: null,
    questionIntroStartedAt: 0,
    questionIntroDone: false,
    adaptiveFitRaf: null,
    attemptsCache: null,
    attemptsFetchedAt: 0,
    attemptsLoading: false,
  },
  player: {
    pin: null,
    id: null,
    token: null,
    pollTimer: null,
    renderKey: null,
    submittedForIndex: null,
    currentQuestion: null,
    pinSelection: null,
    pinSelections: [],
    selectedBet: 0, // <-- FIXED: Add missing variable
  },
};

const answeringFxPool = [
  '../music/answering.mp3',
  ...Array.from({ length: 10 }, (_, i) => `../music/answering${i + 2}.mp3`),
].map((src) => createAudio(src, { loop: true, volume: 0.7 }));

const audioFx = {
  hall: createAudio('../music/hall.mp3', { loop: true, volume: 0.35 }),
  answered: createAudio('../music/answered.mp3', { loop: false, volume: 1 }),
  counter: createAudio('../music/counter.mp3', { loop: true, volume: 1 }),
  drumrollwinner: createAudio('../music/drumrollwinner.mp3', { loop: false, volume: 1 }),
  final: createAudio('../music/final.mp3', { loop: false, volume: 1 }),
};

let betSelected = false;
function initBetControl() {
  const betBtn = document.getElementById('betIndicator');
  if (!betBtn) return;
  betBtn.addEventListener('click', () => {
    if (betBtn.disabled) return;
    betSelected = !betSelected;
    betBtn.classList.toggle('selected', betSelected);
    live.player.selectedBet = betSelected ? 3 : 0;
  });
}

function init() {
  setupImageLightbox();
  pingEdgeTtsBridgeWarmup();
  bindTabs();
  bindBuilderEvents();
  bindLiveEvents();
  bindCollapsibleSections();
  bindSoloEvents();
  initBetControl(); // <-- FIXED: Initialize event bindings for bets!
  window.addEventListener('resize', scheduleHostAdaptiveFit);

  renderBuilder();
  refreshLocalPin();

  const savedBackend = loadBackendUrl();
  const initialBackend = normalizeBackendUrl(savedBackend) || DEFAULT_BACKEND_URL;
  if (!normalizeBackendUrl(savedBackend)) {
    saveBackendUrl(initialBackend);
  }

  setupCreateAccess();
}

function pingEdgeTtsBridgeWarmup() {
  // Best-effort wake ping whenever create app is loaded.
  // Use /health (200) instead of / (404), and do a second delayed ping for cold starts.
  const url = 'https://edge-tts-bridge.onrender.com/health';
  const ping = () => {
    try {
      fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => { });
    } catch { }
  };
  ping();
  setTimeout(ping, 3500);
}

function setupCreateAccess() {
  let pendingDeadAcute = false;

  const unlock = async () => {
    try {
      let value = String(createPasswordEl?.value || '');
      if (pendingDeadAcute && value && !value.endsWith('´')) {
        value += '´';
        if (createPasswordEl) createPasswordEl.value = value;
      }
      pendingDeadAcute = false;
      if (!value) {
        setStatus(createAuthStatusEl, 'Enter password', 'bad');
        return;
      }

      if (unlockCreateBtn) unlockCreateBtn.disabled = true;
      setStatus(createAuthStatusEl, 'Checking password…', 'ok');

      await api('/api/create/auth', {
        method: 'POST',
        body: { password: value },
      });

      createSessionPassword = value;
      sessionStorage.setItem(CREATE_UNLOCK_KEY, '1');
      if (createWorkspace) createWorkspace.classList.remove('hidden');
      if (createAuthCard) createAuthCard.classList.add('hidden');
      setStatus(createAuthStatusEl, 'Unlocked ✅', 'ok');
      if (createPasswordEl) createPasswordEl.value = '';
    } catch (err) {
      setStatus(createAuthStatusEl, err?.message || 'Wrong password', 'bad');
    } finally {
      if (unlockCreateBtn) unlockCreateBtn.disabled = false;
    }
  };

  if (sessionStorage.getItem(CREATE_UNLOCK_KEY) === '1') {
    if (createWorkspace) createWorkspace.classList.remove('hidden');
    if (createAuthCard) createAuthCard.classList.add('hidden');
    return;
  }

  if (createWorkspace) createWorkspace.classList.add('hidden');
  if (createAuthCard) createAuthCard.classList.remove('hidden');
  if (unlockCreateBtn) unlockCreateBtn.addEventListener('click', unlock);
  if (createPasswordEl) {
    createPasswordEl.addEventListener('keydown', (e) => {
      if (e.key === 'Dead') {
        pendingDeadAcute = true;
        return;
      }
      if (e.key === 'Enter') {
        if (pendingDeadAcute && createPasswordEl.value && !createPasswordEl.value.endsWith('´')) {
          createPasswordEl.value = `${createPasswordEl.value}´`;
        }
        pendingDeadAcute = false;
        unlock();
      }
    });
    createPasswordEl.addEventListener('input', () => {
      pendingDeadAcute = false;
    });
  }
}

// ---------- Tabs ----------
function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

function getTeacherCollapsibleSectionPairs() {
  return [
    [builderSectionToggleEl, builderCardBodyEl],
    [liveScreenSectionToggleEl, liveScreenCardBodyEl],
    [gameControlsSectionToggleEl, gameControlsCardBodyEl],
    [assignmentSectionToggleEl, assignmentSectionBodyEl],
  ].filter(([triggerEl, bodyEl]) => !!triggerEl && !!bodyEl);
}

function setAllTeacherSectionsCollapsed(collapsed) {
  const pairs = getTeacherCollapsibleSectionPairs();
  pairs.forEach(([triggerEl, bodyEl]) => {
    setSectionCollapsed(triggerEl, bodyEl, collapsed);
  });
}

function toggleTeacherSectionCollapseAll() {
  const pairs = getTeacherCollapsibleSectionPairs();
  if (!pairs.length) return;

  const allCollapsed = pairs.every(([, bodyEl]) => bodyEl.classList.contains('hidden'));
  // If everything is already collapsed, expand all; otherwise collapse all.
  setAllTeacherSectionsCollapsed(!allCollapsed);
}

function bindCollapsibleSections() {
  bindSectionToggle(builderSectionToggleEl, builderCardBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(creationPromptToggleEl, creationPromptBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(builderSettingsToggleEl, builderSettingsBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(builderTypesToggleEl, builderTypesBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(builderQuestionsToggleEl, builderQuestionsBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(liveScreenSectionToggleEl, liveScreenCardBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(gameControlsSectionToggleEl, gameControlsCardBodyEl, { defaultCollapsed: true, keyboard: true });
  bindSectionToggle(assignmentSectionToggleEl, assignmentSectionBodyEl, { defaultCollapsed: true, keyboard: false });
}

function bindSectionToggle(triggerEl, bodyEl, options = {}) {
  if (!triggerEl || !bodyEl) return;

  const defaultCollapsed = !!options.defaultCollapsed;
  const supportsKeyboard = !!options.keyboard;

  const toggle = () => {
    const collapsed = bodyEl.classList.contains('hidden');
    setSectionCollapsed(triggerEl, bodyEl, !collapsed);
  };

  triggerEl.addEventListener('click', (e) => {
    e.preventDefault();
    toggle();
  });

  if (supportsKeyboard) {
    triggerEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggle();
    });
  }

  setSectionCollapsed(triggerEl, bodyEl, defaultCollapsed);
}

function setSectionCollapsed(triggerEl, bodyEl, collapsed) {
  bodyEl.classList.toggle('hidden', !!collapsed);
  triggerEl.classList.toggle('collapsed', !!collapsed);
  triggerEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

  const chevron = triggerEl.querySelector('.collapse-chevron');
  if (chevron) chevron.textContent = collapsed ? '▸' : '▾';
}

// ---------- Builder ----------
function addQuestionToBuilder(question) {
  if (question && typeof question === 'object') {
    if (typeof question.imageKeyword !== 'string') question.imageKeyword = '';
    if (typeof question.videoKeyword !== 'string') question.videoKeyword = '';
    if (typeof question.videoProviderPreference !== 'string') question.videoProviderPreference = '';
  }
  quiz.questions.push(question);
  pendingScrollQuestionIndex = quiz.questions.length - 1;
  renderBuilder();
}

function renderPromptTypesList() {
  const typesListEl = document.getElementById('promptTypesList');
  if (!typesListEl) return;
  const previousSelected = new Set(Array.from(typesListEl.querySelectorAll('input:checked')).map((cb) => cb.value));
  typesListEl.innerHTML = QUESTION_TYPE_CATALOG
    .map((item) => {
      const checked = previousSelected.size ? previousSelected.has(item.type) : true;
      return `<label class="type-pill"><input type="checkbox" value="${item.type}" ${checked ? 'checked' : ''}> <span>${item.label}</span></label>`;
    })
    .join('');
}

function syncCustomGoalFieldState() {
  const goalEl = document.getElementById('promptGoal');
  const customGoalEl = document.getElementById('promptGoalCustom');
  if (!(goalEl instanceof HTMLSelectElement) || !(customGoalEl instanceof HTMLTextAreaElement)) return;
  const isCustom = goalEl.value === 'custom';
  customGoalEl.classList.toggle('hidden', !isCustom);
  customGoalEl.disabled = !isCustom;
  customGoalEl.setAttribute('aria-hidden', isCustom ? 'false' : 'true');
}

function syncTypesGridVisibility() {
  const modeEl = document.getElementById('promptTypesMode');
  const typesListEl = document.getElementById('promptTypesList');
  const selectAllTypesBtn = document.getElementById('promptSelectAllTypes');
  const clearAllTypesBtn = document.getElementById('promptClearAllTypes');
  const hidden = modeEl && modeEl.value === 'ai_choice';
  if (typesListEl) typesListEl.classList.toggle('hidden', hidden);
  if (selectAllTypesBtn) selectAllTypesBtn.classList.toggle('hidden', hidden);
  if (clearAllTypesBtn) clearAllTypesBtn.classList.toggle('hidden', hidden);
}

function bindBuilderEvents() {
  renderPromptTypesList();
  if (exportPromptBtn) {
    exportPromptBtn.addEventListener('click', exportCreationPrompt);
  }
  const goalEl = document.getElementById('promptGoal');
  if (goalEl instanceof HTMLSelectElement) {
    goalEl.addEventListener('change', syncCustomGoalFieldState);
    syncCustomGoalFieldState();
  }
  const typesModeEl = document.getElementById('promptTypesMode');
  if (typesModeEl instanceof HTMLSelectElement) {
    typesModeEl.addEventListener('change', syncTypesGridVisibility);
    syncTypesGridVisibility();
  }
  const selectAllTypesBtn = document.getElementById('promptSelectAllTypes');
  const clearAllTypesBtn = document.getElementById('promptClearAllTypes');
  const typesListEl = document.getElementById('promptTypesList');

  if (selectAllTypesBtn && typesListEl) {
    selectAllTypesBtn.addEventListener('click', () => {
      typesListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
  }
  if (clearAllTypesBtn && typesListEl) {
    clearAllTypesBtn.addEventListener('click', () => {
      typesListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
  }

  addMcqBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeMcqQuestion());
  });
  if (addMcqAudioBtn) {
    addMcqAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMcqQuestion({ withAudio: true }));
    });
  }

  addMultiBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeMultiQuestion());
  });
  if (addMultiAudioBtn) {
    addMultiAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMultiQuestion({ withAudio: true }));
    });
  }

  addTfBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeTfQuestion());
  });
  if (addTfAudioBtn) {
    addTfAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeTfQuestion({ withAudio: true }));
    });
  }

  addTextBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeTextQuestion());
  });
  if (addTextAudioBtn) {
    addTextAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeTextQuestion({ withAudio: true }));
    });
  }

  if (addOpenBtn) {
    addOpenBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeOpenQuestion());
    });
  }

  if (addSpeakingBtn) {
    addSpeakingBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeSpeakingQuestion());
    });
  }

  if (addVoiceRecordBtn) {
    addVoiceRecordBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeVoiceRecordQuestion());
    });
  }

  if (addImageOpenBtn) {
    addImageOpenBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeImageOpenQuestion());
    });
  }

  if (addContextGapBtn) {
    addContextGapBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeContextGapQuestion());
    });
  }

  if (addMatchPairsBtn) {
    addMatchPairsBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMatchPairsQuestion());
    });
  }

  if (addErrorHuntBtn) {
    addErrorHuntBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeErrorHuntQuestion());
    });
  }

  addPuzzleBtn.addEventListener('click', () => {
    addQuestionToBuilder(makePuzzleQuestion());
  });
  if (addPuzzleAudioBtn) {
    addPuzzleAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makePuzzleQuestion({ withAudio: true }));
    });
  }

  addSliderBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeSliderQuestion());
  });

  addPinBtn.addEventListener('click', () => {
    addQuestionToBuilder(makePinQuestion());
  });

  const quizTtsOtherWrap = document.getElementById('quizTtsOtherWrap');
  const quizTtsOtherVoiceEl = document.getElementById('quizTtsOtherVoice');
  const quizTtsOtherSearchEl = document.getElementById('quizTtsOtherSearch');

  // Populate/filter the "Other" voice dropdown from the full voice index
  const renderOtherVoiceOptions = (filter = '') => {
    if (!quizTtsOtherVoiceEl) return;
    const needle = String(filter || '').trim().toLowerCase();
    const currentVoice = quiz.language || quizTtsOtherVoiceEl.value;
    const filtered = EDGE_TTS_VOICE_INDEX.filter((v) => {
      if (!needle) return true;
      const haystack = `${v.code} ${v.language} ${v.country} ${v.person}`.toLowerCase();
      return haystack.includes(needle);
    });
    const voiceOptions = filtered
      .map((v) => `<option value="${escapeHtml(v.code)}" ${v.code === currentVoice ? 'selected' : ''}>${escapeHtml(formatVoiceIndexLabel(v))}</option>`)
      .join('');
    quizTtsOtherVoiceEl.innerHTML = voiceOptions;
  };
  if (quizTtsOtherVoiceEl) {
    renderOtherVoiceOptions();
  }
  if (quizTtsOtherSearchEl) {
    quizTtsOtherSearchEl.addEventListener('input', () => {
      renderOtherVoiceOptions(quizTtsOtherSearchEl.value);
      // If we are in OTHER mode, search might have changed the effective selection (even if it's the first result)
      if (quizTtsLanguageEl?.value === 'OTHER' && quizTtsOtherVoiceEl.value && quizTtsOtherVoiceEl.value !== quiz.language) {
        // Manually trigger the update if the value changed due to search
        quiz.language = quizTtsOtherVoiceEl.value;
        quiz.questions.forEach((q) => {
          if (!q || !supportsQuestionAudio(q.type)) return;
          q.language = quiz.language;
          q.ttsLanguage = 'OTHER';
          if (q.audioMode === 'tts') q.audioEnabled = true;
        });
        renderBuilder();
      }
    });
  }

  if (quizTtsLanguageEl) {
    quizTtsLanguageEl.addEventListener('change', () => {
      const mode = quizTtsLanguageEl.value;
      applyHearQuestionsMode(quiz, mode);

      // If user changed the "hear questions" mode, drop any TTS-generated mp3s (keep user-uploaded audio)
      let clearedAudio = false;
      quiz.questions.forEach((q) => {
        if (!q) return;
        const audio = String(q.audioData || '');
        const isMp3 = /\.mp3(\?|$)/i.test(audio) || audio.startsWith('data:audio/mpeg') || audio.startsWith('data:audio/mp3');
        const looksLikeTts = q._ttsGenerated || /\/quiz-[^/]+\/audio\/q\d+\.mp3(\?|$)/i.test(audio);
        if (q.audioMode === 'file' && audio && isMp3 && looksLikeTts) {
          q.audioData = '';
          q.audioMode = 'tts';
          q._ttsGenerated = false;
          q._userAudioUploaded = false;
          clearedAudio = true;
        }
      });

      // Show/hide the "Other" voice selector
      if (quizTtsOtherWrap) {
        quizTtsOtherWrap.style.display = mode === 'OTHER' ? '' : 'none';
      }

      if (mode === 'NONE') {
        // Don't hear questions — disable TTS for all questions
        quiz.language = '';
        quiz.questions.forEach((q) => {
          if (!q) return;
          q.audioEnabled = false;
          q.audioMode = 'tts';
          q.ttsLanguage = 'NONE';
          q.language = '';
        });
      } else if (mode === 'OTHER' && quizTtsOtherVoiceEl?.value) {
        // Apply the selected voice from the search dropdown
        const voice = quizTtsOtherVoiceEl.value;
        quiz.language = voice;
        quiz.questions.forEach((q) => {
          if (!q || !supportsQuestionAudio(q.type)) return;
          q.language = voice;
          q.ttsLanguage = 'OTHER';
          q.audioEnabled = true;
          q.audioMode = 'tts';
        });
      } else {
        const next = normalizeTtsLanguage(mode);
        quiz.language = getVoiceForTtsLanguage(next);
        quiz.questions.forEach((q) => {
          if (!q || !supportsQuestionAudio(q.type)) return;
          q.ttsLanguage = next;
          q.language = quiz.language;
          q.audioEnabled = true;
          q.audioMode = 'tts';
        });
      }
      renderBuilder();
    });
  }

  // Also update all questions when the "Other" voice changes
  if (quizTtsOtherVoiceEl) {
    quizTtsOtherVoiceEl.addEventListener('change', () => {
      if (quizTtsLanguageEl?.value !== 'OTHER') return;
      const voice = quizTtsOtherVoiceEl.value;
      quiz.language = voice;
      quiz.questions.forEach((q) => {
        if (!q || !supportsQuestionAudio(q.type)) return;
        q.language = voice;
        q.ttsLanguage = 'OTHER';
        if (q.audioMode === 'tts') q.audioEnabled = true;
      });
      renderBuilder();
    });
  }

  saveBtn.addEventListener('click', async () => {
    try {
      syncQuizFromUI();
      await ensureQuizMediaReady({ contextLabel: 'save local quiz', convertTtsToMp3: true, strictMediaCheck: true });

      saveQuiz(quiz);
      const fallback = String(quiz.title || 'Untitled quiz').trim() || 'Untitled quiz';
      const autoName = `${fallback} (${new Date().toLocaleString()})`;
      const saved = saveQuizToLibrary(autoName, quiz);
      setStatus(hostStatusEl, `Saved locally: ${saved.name}`, 'ok');
      openLocalLibraryDialog({ highlightId: saved.id });
    } catch (err) {
      setStatus(hostStatusEl, `Save failed: ${err.message}`, 'bad');
    }
  });

  if (openLocalBtn) {
    openLocalBtn.addEventListener('click', () => openLocalLibraryDialog());
  }
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
  }

  exportBtn.addEventListener('click', async () => {
    try {
      syncQuizFromUI();
      const missingOtherVoice = collectMissingOtherTtsVoiceIssues(quiz);
      if (missingOtherVoice.length) {
        setStatus(hostStatusEl, `⚠️ ${missingOtherVoice.join(', ')} use ttsLanguage:"OTHER" without a valid Edge voice code. Default voice will be used on export.`, 'checking');
      }
      await ensureQuizMediaReady({ contextLabel: 'export quiz', convertTtsToMp3: true, strictMediaCheck: true });

      downloadJson(quiz, `${toSafeFilename(quiz.title || 'pinplay-quiz')}.json`);
      setStatus(hostStatusEl, 'Exported with validated media + auto-filled images.', 'ok');
    } catch (err) {
      setStatus(hostStatusEl, `Export failed: ${err.message}`, 'bad');
    }
  });

  if (publishDriveBtn) {
    publishDriveBtn.addEventListener('click', publishQuizToDrive);
  }

  if (openDriveBtn) {
    openDriveBtn.addEventListener('click', () => openQuizFromDrive());
  }

  if (openCloudBtn) {
    openCloudBtn.addEventListener('click', () => openQuizFromCloud());
  }

  if (saveCloudBtn) {
    saveCloudBtn.addEventListener('click', saveQuizToCloud);
  }

  // delete actions are integrated into open dialogs

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      validateImportedQuiz(parsed);
      // Normalize prompts/corrections on import for compatibility
      parsed.questions = (parsed.questions || []).map((q) => {
        const next = { ...q };
        if (!next.prompt && next.question) next.prompt = next.question;
        if (!Array.isArray(next.correctedVariants) && next.corrected) {
          next.correctedVariants = String(next.corrected).split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
        }
        if (!next.corrected && Array.isArray(next.correctedVariants) && next.correctedVariants.length) {
          next.corrected = next.correctedVariants[0];
        }
        if (!next.requiredErrors && next.prompt && next.corrected) {
          next.requiredErrors = countErrorHuntRequiredTokens(next.prompt, next.correctedVariants || [next.corrected]);
        }
        return next;
      });
      quiz = parsed;
      collapseAllQuestions(quiz);
      renderBuilder();
      await ensureQuizMediaReady({ contextLabel: 'import quiz', convertTtsToMp3: true, strictMediaCheck: true });

      const savedOk = saveQuiz(quiz);
      if (savedOk) {
        alert('Quiz imported ✅');
      } else {
        alert('Quiz imported ✅ (local autosave skipped: browser storage is full). Use Save Drive or Export to keep a backup.');
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
    importInput.value = '';
  });

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      const shouldCollapse = quiz.questions.some((q) => !q.collapsed);
      quiz.questions.forEach((q) => { q.collapsed = shouldCollapse; });
      collapseAllBtn.textContent = shouldCollapse ? 'Expand all' : 'Collapse all';
      renderBuilder();
    });
  }

  questionListEl.addEventListener('click', async (e) => {
    const togglePinModeBtn = e.target.closest('[data-toggle-pin-mode]');
    if (togglePinModeBtn) {
      const idx = Number(togglePinModeBtn.dataset.togglePinMode);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;
      q.pinMode = q.pinMode === 'any' ? 'all' : 'any';
      renderBuilder();
      return;
    }

    const moveUpBtn = e.target.closest('[data-move-up-question]');
    if (moveUpBtn) {
      const idx = Number(moveUpBtn.dataset.moveUpQuestion);
      if (idx > 0) {
        [quiz.questions[idx - 1], quiz.questions[idx]] = [quiz.questions[idx], quiz.questions[idx - 1]];
        renderBuilder();
      }
      return;
    }

    const moveDownBtn = e.target.closest('[data-move-down-question]');
    if (moveDownBtn) {
      const idx = Number(moveDownBtn.dataset.moveDownQuestion);
      if (idx >= 0 && idx < quiz.questions.length - 1) {
        [quiz.questions[idx], quiz.questions[idx + 1]] = [quiz.questions[idx + 1], quiz.questions[idx]];
        renderBuilder();
      }
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle-question]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggleQuestion);
      if (quiz.questions[idx]) {
        quiz.questions[idx].collapsed = !quiz.questions[idx].collapsed;
        renderBuilder();
      }
      return;
    }

    const removeBtn = e.target.closest('[data-remove-question]');
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.removeQuestion);
      quiz.questions.splice(idx, 1);
      renderBuilder();
      return;
    }

    const toggleHeader = e.target.closest('[data-toggle-question-header]');
    if (toggleHeader) {
      const idx = Number(toggleHeader.dataset.toggleQuestionHeader);
      if (quiz.questions[idx]) {
        quiz.questions[idx].collapsed = !quiz.questions[idx].collapsed;
        renderBuilder();
      }
      return;
    }

    const imageSearchBtn = e.target.closest('[data-image-search]');
    if (imageSearchBtn) {
      const idx = Number(imageSearchBtn.dataset.imageSearch);
      openImageSearchDialog(idx);
      return;
    }

    const clearImageBtn = e.target.closest('[data-clear-image]');
    if (clearImageBtn) {
      const idx = Number(clearImageBtn.dataset.clearImage);
      const q = quiz.questions[idx];
      if (!q) return;
      replaceQuestionImageData(q, '');
      renderBuilder();
      setStatus(hostStatusEl, `Image cleared from Q${idx + 1}.`, 'ok');
      return;
    }

    const addPinZoneBtn = e.target.closest('[data-add-pin-zone]');
    if (addPinZoneBtn) {
      const idx = Number(addPinZoneBtn.dataset.addPinZone);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;
      const zones = normalizePinZones(q);
      if (zones.length >= 12) return;
      zones.push({ x: 50, y: 50, r: zones[0]?.r || 7 });
      q.zones = zones;
      renderBuilder();
      return;
    }

    const removePinZoneBtn = e.target.closest('[data-remove-pin-zone]');
    if (removePinZoneBtn) {
      const idx = Number(removePinZoneBtn.dataset.removePinZone);
      const zi = Number(removePinZoneBtn.dataset.zoneIndex);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;
      const zones = normalizePinZones(q).filter((_, i) => i !== zi);
      q.zones = zones;
      renderBuilder();
      return;
    }

    const preview = e.target.closest('[data-pin-preview]');
    if (preview) {
      const idx = Number(preview.dataset.pinPreview);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;

      const rect = preview.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const zones = normalizePinZones(q);
      if (zones.length < 12) {
        zones.push({ x: round(clamp(x, 0, 100), 1), y: round(clamp(y, 0, 100), 1), r: zones[0]?.r || 15 });
      } else {
        zones[zones.length - 1] = { ...zones[zones.length - 1], x: round(clamp(x, 0, 100), 1), y: round(clamp(y, 0, 100), 1) };
      }
      q.zones = zones;
      renderBuilder();
      return;
    }

    const audioBtn = e.target.closest('[data-play-audio-preview]');
    if (audioBtn) {
      const idx = Number(audioBtn.dataset.playAudioPreview);
      const q = quiz.questions[idx];
      if (!q || !hasQuestionAudio(q)) return;
      playQuestionAudio(q);
    }

    const videoPreviewBtn = e.target.closest('[data-video-preview-clip]');
    if (videoPreviewBtn) {
      const idx = Number(videoPreviewBtn.dataset.videoPreviewClip);
      const q = quiz.questions[idx];
      if (!q) return;
      syncQuizFromUI();
      const media = normalizeQuestionMedia(q.media);
      const el = questionListEl.querySelector(`[data-video-preview-el="${idx}"]`);
      if (el && el.tagName === 'VIDEO') {
        el.currentTime = Number(media.startAt || 0);
        const endAt = media.endAt;
        const stopAt = () => {
          if (endAt != null && el.currentTime >= endAt) {
            el.pause();
            el.removeEventListener('timeupdate', stopAt);
          }
        };
        el.addEventListener('timeupdate', stopAt);
        el.play().catch(() => { });
      } else {
        const config = toVideoEmbedConfig({ ...media, kind: 'video' });
        if (config.src) window.open(config.src, '_blank', 'noopener');
      }
      return;
    }

    const videoSetStartBtn = e.target.closest('[data-video-set-start]');
    if (videoSetStartBtn) {
      const idx = Number(videoSetStartBtn.dataset.videoSetStart);
      const q = quiz.questions[idx];
      const el = questionListEl.querySelector(`[data-video-preview-el="${idx}"]`);
      if (q && el && el.tagName === 'VIDEO') {
        q.media = normalizeQuestionMedia({ ...(q.media || {}), kind: 'video', startAt: el.currentTime, endAt: q.media?.endAt });
        renderBuilder();
      }
      return;
    }

    const videoSetEndBtn = e.target.closest('[data-video-set-end]');
    if (videoSetEndBtn) {
      const idx = Number(videoSetEndBtn.dataset.videoSetEnd);
      const q = quiz.questions[idx];
      const el = questionListEl.querySelector(`[data-video-preview-el="${idx}"]`);
      if (q && el && el.tagName === 'VIDEO') {
        q.media = normalizeQuestionMedia({ ...(q.media || {}), kind: 'video', endAt: el.currentTime });
        renderBuilder();
      }
      return;
    }

    const videoResetBtn = e.target.closest('[data-video-reset-clip]');
    if (videoResetBtn) {
      const idx = Number(videoResetBtn.dataset.videoResetClip);
      const q = quiz.questions[idx];
      if (!q) return;
      q.media = normalizeQuestionMedia({ ...(q.media || {}), kind: q.media?.url ? 'video' : 'none', startAt: 0, endAt: null });
      renderBuilder();
      return;
    }

    const videoClearBtn = e.target.closest('[data-video-clear]');
    if (videoClearBtn) {
      const idx = Number(videoClearBtn.dataset.videoClear);
      if (!quiz.questions[idx]) return;
      quiz.questions[idx].media = makeDefaultQuestionMedia();
      renderBuilder();
      return;
    }
  });

  questionListEl.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('[data-drag-question]');
    if (!handle) return;
    const item = handle.closest('.question-item');
    if (!item) return;
    dragQuestionIndex = Number(item.dataset.questionIndex);
    item.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragQuestionIndex));
    }
  });

  questionListEl.addEventListener('dragover', (e) => {
    const overItem = e.target.closest('.question-item');
    if (!overItem) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  });

  questionListEl.addEventListener('drop', (e) => {
    const overItem = e.target.closest('.question-item');
    if (!overItem) return;
    e.preventDefault();

    const to = Number(overItem.dataset.questionIndex);
    const from = Number.isFinite(dragQuestionIndex) ? dragQuestionIndex : Number(e.dataTransfer?.getData('text/plain'));

    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < 0 || from === to) return;

    const [moved] = quiz.questions.splice(from, 1);
    quiz.questions.splice(to, 0, moved);
    pendingScrollQuestionIndex = to;
    dragQuestionIndex = null;
    renderBuilder();
  });

  questionListEl.addEventListener('dragend', () => {
    dragQuestionIndex = null;
    questionListEl.querySelectorAll('.question-item.dragging').forEach((el) => el.classList.remove('dragging'));
  });

  questionListEl.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => String(it.type || '').startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile?.();
    if (!file) return;

    const idx = findQuestionIndexFromBuilderEventTarget(e.target);
    if (!Number.isInteger(idx) || idx < 0 || idx >= quiz.questions.length) return;

    e.preventDefault();
    const q = quiz.questions[idx];

    try {
      const nextImageData = await imageFileToOptimizedDataUrl(file);
      replaceQuestionImageData(q, nextImageData);
      renderBuilder();
      setStatus(hostStatusEl, `Image pasted into Q${idx + 1} (optimized).`, 'ok');
    } catch (err) {
      setStatus(hostStatusEl, err.message || 'Could not paste image.', 'bad');
    }
  });

  questionListEl.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el || !el.dataset) return;

    const idxRaw = el.dataset.q;
    if (idxRaw == null) return;
    const idx = Number(idxRaw);
    if (!Number.isInteger(idx) || !quiz.questions[idx]) return;

    const q = quiz.questions[idx];
    const value = String(el.value || '').trim();
    if (!value) return;

    let shouldExpand = false;
    let nextSelector = '';

    if ((el.dataset.acceptedIndex != null) && q.type === 'text') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-accepted-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 20) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-accepted-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.gapIndex != null) && q.type === 'context_gap') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-gap-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-gap-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.puzzleIndex != null) && q.type === 'puzzle') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-puzzle-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 12) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-puzzle-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.answerIndex != null) && ['mcq', 'multi', 'audio'].includes(q.type)) {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-answer-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-answer-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.pairLeft != null || el.dataset.pairRight != null) && q.type === 'match_pairs') {
      const leftFields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pair-left]`)];
      const rightFields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pair-right]`)];
      const pairCount = Math.min(leftFields.length, rightFields.length);
      const lastLeft = leftFields[pairCount - 1];
      const lastRight = rightFields[pairCount - 1];
      if ((el === lastLeft || el === lastRight) && pairCount < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-pair-left="${pairCount}"]`;
      }
    }

    if (!shouldExpand) return;

    syncQuizFromUI();
    renderBuilder();
  });

  questionListEl.addEventListener('change', async (e) => {
    const pinUpload = e.target.closest('[data-pin-upload]');
    if (pinUpload) {
      const idx = Number(pinUpload.dataset.pinUpload);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;

      const file = pinUpload.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        return;
      }

      try {
        const nextImageData = await imageFileToOptimizedDataUrl(file);
        replaceQuestionImageData(q, nextImageData);
        renderBuilder();
      } catch (err) {
        alert(`Image load failed: ${err.message}`);
      }
      return;
    }

    const imageUpload = e.target.closest('[data-image-upload]');
    if (imageUpload) {
      const idx = Number(imageUpload.dataset.imageUpload);
      const q = quiz.questions[idx];
      if (!q || q.type === 'pin') return;

      const file = imageUpload.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        return;
      }

      try {
        const nextImageData = await imageFileToOptimizedDataUrl(file);
        replaceQuestionImageData(q, nextImageData);
        renderBuilder();
      } catch (err) {
        alert(`Image load failed: ${err.message}`);
      }
      return;
    }


    const audioUpload = e.target.closest('[data-audio-upload]');
    if (audioUpload) {
      const idx = Number(audioUpload.dataset.audioUpload);
      const q = quiz.questions[idx];
      if (!q) return;

      const file = audioUpload.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        alert('Please choose an audio file.');
        return;
      }

      try {
        q.audioData = await fileToDataUrl(file);
        q.audioMode = 'file';
        q.audioEnabled = true;
        q._ttsGenerated = false;
        q._userAudioUploaded = true;
        renderBuilder();
      } catch (err) {
        alert(`Audio load failed: ${err.message}`);
      }
    }
  });
}

function findQuestionIndexFromBuilderEventTarget(target) {
  if (!target) return null;
  const el = target.nodeType === 1 ? target : target.parentElement;
  if (!el || !questionListEl?.contains(el)) return null;

  const withQ = el.closest('[data-q]');
  if (withQ && Number.isInteger(Number(withQ.dataset.q))) return Number(withQ.dataset.q);

  const withBody = el.closest('[data-image-upload],[data-pin-upload],[data-audio-upload],[data-image-search],[data-remove-question],[data-toggle-question],[data-toggle-question-header],[data-move-up-question],[data-move-down-question],[data-add-pin-zone],[data-remove-pin-zone],[data-pin-preview],[data-toggle-pin-mode]');
  if (!withBody) return null;

  const ds = withBody.dataset || {};
  const raw = ds.q ?? ds.imageUpload ?? ds.pinUpload ?? ds.audioUpload ?? ds.imageSearch ?? ds.removeQuestion ?? ds.toggleQuestion ?? ds.toggleQuestionHeader ?? ds.moveUpQuestion ?? ds.moveDownQuestion ?? ds.addPinZone ?? ds.removePinZone ?? ds.pinPreview ?? ds.togglePinMode;
  const idx = Number(raw);
  return Number.isInteger(idx) ? idx : null;
}

function renderBuilder() {
  normalizeQuizAudioDefaults(quiz);
  quizTitleEl.value = quiz.title || '';
  if (quizTtsLanguageEl) quizTtsLanguageEl.value = getHearQuestionsMode(quiz);
  // Show/hide "Other" voice selector based on saved mode
  if (quizTtsOtherWrap) {
    const isOther = getHearQuestionsMode(quiz) === 'OTHER';
    quizTtsOtherWrap.style.display = isOther ? '' : 'none';
    if (isOther && quiz.language) {
      const otherVoiceEl = document.getElementById('quizTtsOtherVoice');
      if (otherVoiceEl) otherVoiceEl.value = quiz.language;
    }
  }
  questionListEl.innerHTML = '';

  if (!quiz.questions.length) {
    questionListEl.innerHTML = '<p class="muted">No questions yet. Add one above.</p>';
    return;
  }

  quiz.questions.forEach((q, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'question-item';

    const common = `
      <div class="question-header" data-toggle-question-header="${idx}" data-drag-question="${idx}" draggable="true" title="Click to collapse/expand · Drag header to reorder">
        <strong>Q${idx + 1} · ${labelForType(q.type)}</strong>
        <div class="question-actions">
          <button class="btn" data-move-up-question="${idx}" title="Move up">↑</button>
          <button class="btn" data-move-down-question="${idx}" title="Move down">↓</button>
          <button class="btn" data-toggle-question="${idx}">${q.collapsed ? 'Expand' : 'Collapse'}</button>
          <button class="btn" data-remove-question="${idx}">Remove</button>
        </div>
      </div>
      <div class="${q.collapsed ? 'question-body-collapsed' : ''}">
      <label>Question (max 1200 chars)</label>
      <textarea data-q="${idx}" data-field="prompt" maxlength="1200">${escapeHtml(q.prompt || '')}</textarea>
      <div class="row gap top-space">
        <div style="min-width:120px;">
          <label>Points</label>
          <select data-q="${idx}" data-field="points">
            <option value="0" ${Number(q.points) === 0 ? 'selected' : ''}>0</option>
            <option value="1000" ${Number(q.points) === 1000 ? 'selected' : ''}>1000</option>
            <option value="2000" ${Number(q.points) === 2000 ? 'selected' : ''}>2000</option>
          </select>
        </div>
        <div style="min-width:160px;">
          <label>Time limit (sec)</label>
          <input data-q="${idx}" data-field="timeLimit" type="number" min="0" max="240" value="${Number.isFinite(Number(q.timeLimit)) ? Number(q.timeLimit) : 20}" />
        </div>
        <label style="display:flex; align-items:center; gap:.4rem; margin-top:1.4rem; font-weight:600;">
          <input data-q="${idx}" data-field="isPoll" type="checkbox" ${q.isPoll ? 'checked' : ''} /> Poll mode
        </label>
      </div>
    `;

    let specific = '';

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      const isMulti = q.type === 'multi';
      const maxAnswers = q.type === 'tf' ? 2 : 10;
      const baseMin = q.type === 'tf' ? 2 : 3;
      const source = (Array.isArray(q.answers) ? q.answers : []).slice(0, maxAnswers).map((a) => ({
        text: String(a?.text || ''),
        correct: !!a?.correct,
      }));
      let answers = source.length ? source : [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }];

      // Ensure at least baseMin
      while (answers.length < baseMin) {
        answers.push({ text: '', correct: false });
      }

      if (q.type !== 'tf') {
        // Prune multiple trailing blanks if total > 3
        while (answers.length > baseMin) {
          const last = answers[answers.length - 1];
          const prev = answers[answers.length - 2];
          if (String(last.text || '').trim() === '' && String(prev.text || '').trim() === '') {
            answers.pop();
          } else {
            break;
          }
        }
        // Spawn one new blank if the last one is now filled
        const lastFilled = String(answers[answers.length - 1]?.text || '').trim().length > 0;
        if (lastFilled && answers.length < maxAnswers) {
          answers.push({ text: '', correct: false });
        }
      }

      specific += `
        <label class="top-space">Answers</label>
        <div class="answers-grid">
          ${answers
          .map(
            (a, aIdx) => `
            <div class="answer-row">
              <input type="${isMulti ? 'checkbox' : 'radio'}" ${isMulti ? '' : `name="correct-${idx}"`} ${a.correct ? 'checked' : ''} data-q="${idx}" data-correct-index="${aIdx}" />
              <input data-q="${idx}" data-answer-index="${aIdx}" maxlength="90" value="${escapeHtml(a.text || '')}" ${q.type === 'tf' ? 'disabled' : ''}/>
              <span class="small">${q.type === 'tf' ? '' : 'max 90'}</span>
            </div>
          `,
          )
          .join('')}
        </div>
      `;

      if (q.type === 'multi') {
        specific += `<p class="small">Students must select all correct answers.</p>`;
      }

      if (supportsQuestionAudio(q.type)) {
        specific += buildAudioSettingsMarkup(idx, q);
      }
    }

    if (q.type === 'text') {
      const maxAccepted = 20;
      const acceptedRaw = (Array.isArray(q.accepted) ? q.accepted : []).slice(0, maxAccepted).map((x) => String(x || '').slice(0, 120));
      const acceptedNonEmpty = acceptedRaw.filter((x) => x.trim().length > 0);
      const accepted = acceptedNonEmpty.length ? [...acceptedNonEmpty] : [];
      while (accepted.length < Math.min(3, maxAccepted)) accepted.push('');
      const acceptedLastFilled = String(accepted[accepted.length - 1] || '').trim().length > 0;
      if (acceptedLastFilled && accepted.length < maxAccepted) accepted.push('');
      specific += `
        <label class="top-space">Accepted answers (dynamic, max 20)</label>
        <div class="answers-grid">
          ${accepted
          .slice(0, maxAccepted)
          .map(
            (ans, aIdx) => `
            <input data-q="${idx}" data-accepted-index="${aIdx}" maxlength="120" value="${escapeHtml(ans || '')}" placeholder="Accepted answer ${aIdx + 1}" />
          `,
          )
          .join('')}
        </div>
      `;
    }

    if (q.type === 'open') {
      specific += `
        <p class="small top-space">Students submit short text answers. Teacher grades responses live.</p>
      `;
    }

    if (q.type === 'image_open') {
      specific += `
        <p class="small top-space">Students write 1-2 sentences from the image. Teacher grades live.</p>
      `;
    }

    if (q.type === 'speaking') {
      specific += `
        <p class="small top-space">In-class speaking round: students tap submit when they have answered orally. Teacher grades participation/performance live.</p>
      `;
    }

    if (q.type === 'voice_record') {
      specific += `
        <p class="small top-space">Students record audio (max 2 min). You grade by listening to playback.</p>
      `;
    }

    if (q.type === 'context_gap') {
      const maxGaps = 10;
      const gapRaw = (Array.isArray(q.gaps) ? q.gaps : []).slice(0, maxGaps).map((x) => String(x || '').slice(0, 120));
      const gapNonEmpty = gapRaw.filter((x) => x.trim().length > 0);
      const gaps = gapNonEmpty.length ? [...gapNonEmpty] : [];
      while (gaps.length < Math.min(3, maxGaps)) gaps.push('');
      const gapLastFilled = String(gaps[gaps.length - 1] || '').trim().length > 0;
      if (gapLastFilled && gaps.length < maxGaps) gaps.push('');
      specific += `
        <p class="small top-space">How to create blanks: write your text and add <strong>____</strong> or <strong>[]</strong> where gaps should appear.</p>
        <p class="small">Then set expected answers below (dynamic, max 10). Keep order aligned with blanks. For alternatives, separate with commas (example: <em>big, large, huge</em>).</p>
        <label class="top-space">Expected words for blanks</label>
        <div class="answers-grid">
          ${gaps
          .slice(0, maxGaps)
          .map((ans, aIdx) => `
            <input data-q="${idx}" data-gap-index="${aIdx}" maxlength="120" value="${escapeHtml(ans || '')}" placeholder="Blank ${aIdx + 1}" />
          `)
          .join('')}
        </div>
      `;
    }

    if (q.type === 'match_pairs') {
      const maxPairs = 10;
      const pairsRaw = (Array.isArray(q.pairs) ? q.pairs : []).slice(0, maxPairs).map((p) => ({
        left: String(p?.left || '').slice(0, 60),
        right: String(p?.right || '').slice(0, 60),
      }));
      const pairsNonEmpty = pairsRaw.filter((p) => p.left.trim() || p.right.trim());
      const normalizedPairs = pairsNonEmpty.length ? [...pairsNonEmpty] : [];
      while (normalizedPairs.length < Math.min(3, maxPairs)) normalizedPairs.push({ left: '', right: '' });
      const lastPair = normalizedPairs[normalizedPairs.length - 1] || { left: '', right: '' };
      const lastPairFilled = String(lastPair.left || '').trim() || String(lastPair.right || '').trim();
      if (lastPairFilled && normalizedPairs.length < maxPairs) normalizedPairs.push({ left: '', right: '' });
      specific += `
        <p class="small top-space">Set matching pairs (left → right). Dynamic rows, max 10.</p>
        <div class="answers-grid">
          ${normalizedPairs
          .slice(0, maxPairs)
          .map(
            (p, i) => `
              <input data-q="${idx}" data-pair-left="${i}" maxlength="60" value="${escapeHtml(p?.left || '')}" placeholder="Left ${i + 1}" />
              <input data-q="${idx}" data-pair-right="${i}" maxlength="60" value="${escapeHtml(p?.right || '')}" placeholder="Right ${i + 1}" />
            `,
          )
          .join('')}
        </div>
      `;
    }

    if (q.type === 'error_hunt') {
      const correctedBlock = Array.isArray(q.correctedVariants) ? q.correctedVariants.join('\n') : (q.corrected || '');
      specific += `
        <label class="top-space">Accepted corrections (one per line)</label>
        <textarea data-q="${idx}" data-field="corrected" maxlength="400">${escapeHtml(correctedBlock)}</textarea>
        <p class="small">Add multiple acceptable rewrites on separate lines. Error count auto-calculates from the first variant.</p>
      `;
    }

    if (q.type === 'puzzle') {
      const maxItems = 12;
      const itemsRaw = (Array.isArray(q.items) ? q.items : []).slice(0, maxItems).map((x) => String(x || '').slice(0, 75));
      const itemsNonEmpty = itemsRaw.filter((x) => x.trim().length > 0);
      const items = itemsNonEmpty.length ? [...itemsNonEmpty] : [];
      while (items.length < Math.min(3, maxItems)) items.push('');
      const itemsLastFilled = String(items[items.length - 1] || '').trim().length > 0;
      if (itemsLastFilled && items.length < maxItems) items.push('');
      specific += `
        <label class="top-space">Correct order items (dynamic, max 12)</label>
        <div class="answers-grid">
          ${items
          .slice(0, maxItems)
          .map(
            (item, i) => `
            <input data-q="${idx}" data-puzzle-index="${i}" maxlength="75" value="${escapeHtml(item || '')}" placeholder="Position ${i + 1}" />
          `,
          )
          .join('')}
        </div>
        <p class="small">Students will drag pieces into order on their screen.</p>
      `;
    }

    if (q.type === 'slider') {
      specific += `
        <div class="row gap top-space">
          <div style="min-width:120px;">
            <label>Min</label>
            <input data-q="${idx}" data-field="sliderMin" type="number" value="${Number(q.min ?? 0)}" />
          </div>
          <div style="min-width:120px;">
            <label>Max</label>
            <input data-q="${idx}" data-field="sliderMax" type="number" value="${Number(q.max ?? 100)}" />
          </div>
          <div style="min-width:120px;">
            <label>Correct value</label>
            <input data-q="${idx}" data-field="sliderTarget" type="number" value="${Number(q.target ?? 50)}" />
          </div>
          <div style="min-width:150px;">
            <label>Margin</label>
            <select data-q="${idx}" data-field="sliderMargin">
              ${['none', 'low', 'medium', 'high', 'maximum']
          .map((m) => `<option value="${m}" ${q.margin === m ? 'selected' : ''}>${m}</option>`)
          .join('')}
            </select>
          </div>
        </div>
        <label>Unit (optional)</label>
        <input data-q="${idx}" data-field="sliderUnit" maxlength="20" value="${escapeHtml(q.unit || '')}" placeholder="e.g. kg, €, years" />
      `;
    }

    if (q.type === 'pin') {
      const zones = normalizePinZones(q);
      specific += `
        <label class="top-space">Image</label>
        <input data-pin-upload="${idx}" type="file" accept="image/*" />
        <div class="row gap top-space">
          <button type="button" class="btn" data-image-search="${idx}">Search web image</button>
          <button type="button" class="btn" data-clear-image="${idx}">Clear image</button>
        </div>
        <label class="top-space">Image keyword (auto-search on save)</label>
        <input data-q="${idx}" data-field="imageKeyword" type="text" maxlength="140" value="${escapeHtml(q.imageKeyword || '')}" placeholder="e.g. map of Spain, human heart" />
        <label class="top-space">Video keyword (auto-search on save)</label>
        <input data-q="${idx}" data-field="videoKeyword" type="text" maxlength="140" value="${escapeHtml(q.videoKeyword || '')}" placeholder="e.g. Spain map flyover, human heart animation" />
        <label class="top-space">Video provider preference</label>
        <select data-q="${idx}" data-field="videoProviderPreference">
          <option value="youtube" ${!q.videoProviderPreference || q.videoProviderPreference === 'youtube' ? 'selected' : ''}>YouTube</option>
          <option value="vimeo" ${q.videoProviderPreference === 'vimeo' ? 'selected' : ''}>Vimeo</option>
          <option value="direct" ${q.videoProviderPreference === 'direct' ? 'selected' : ''}>Direct</option>
        </select>
        <div class="row gap top-space">
          <button type="button" class="btn" data-add-pin-zone="${idx}">+ Add correct point</button>
          <button type="button" class="btn" data-toggle-pin-mode="${idx}">${q.pinMode === 'any' ? 'Any pin (1 spot is enough)' : 'All pins (must pin all spots)'}</button>        </div>
        <p class="small">Up to 12 correct points. Click preview to add a point at clicked location.</p>
        <div class="answers-grid">
          ${zones.map((z, zi) => `
            <input data-q="${idx}" data-pin-zone-x="${zi}" type="number" min="0" max="100" value="${Number(z.x)}" placeholder="X ${zi + 1}" />
            <input data-q="${idx}" data-pin-zone-y="${zi}" type="number" min="0" max="100" value="${Number(z.y)}" placeholder="Y ${zi + 1}" />
            <input data-q="${idx}" data-pin-zone-r="${zi}" type="number" min="1" max="100" value="${Number(z.r)}" placeholder="R ${zi + 1}" />
            <button type="button" class="btn" data-remove-pin-zone="${idx}" data-zone-index="${zi}">Remove</button>
          `).join('')}
        </div>
      `;

      if (q.imageData) {
        specific += `
          <div class="pin-preview" data-pin-preview="${idx}">
            <img src="${q.imageData}" alt="Pin question image" />
            ${zones.map((z) => {
          const left = clamp(z.x, 0, 100);
          const top = clamp(z.y, 0, 100);
          const size = clamp(z.r * 2, 2, 100);
          return `<div class="pin-zone" style="left:${left}%; top:${top}%; width:${size}%; height:${size}%;"></div><div class="pin-dot" style="left:${left}%; top:${top}%;"></div>`;
        }).join('')}
          </div>
        `;
      }
    }

    if (q.type !== 'pin') {
      specific += `
        <label class="top-space">Question image (optional)</label>
        <input data-image-upload="${idx}" type="file" accept="image/*" />
        <div class="row gap top-space"><button type="button" class="btn" data-image-search="${idx}">Search web image</button><button type="button" class="btn" data-clear-image="${idx}">Clear image</button></div>
        <label class="top-space">Image keyword (auto-search on save)</label>
        <input data-q="${idx}" data-field="imageKeyword" type="text" maxlength="140" value="${escapeHtml(q.imageKeyword || '')}" placeholder="e.g. rubber band, volcano, Eiffel tower" />
        <label class="top-space">Video keyword (auto-search on save)</label>
        <input data-q="${idx}" data-field="videoKeyword" type="text" maxlength="140" value="${escapeHtml(q.videoKeyword || '')}" placeholder="e.g. volcano eruption clip, Eiffel tower drone shot" />
        <label class="top-space">Video provider preference</label>
        <select data-q="${idx}" data-field="videoProviderPreference">
          <option value="youtube" ${!q.videoProviderPreference || q.videoProviderPreference === 'youtube' ? 'selected' : ''}>YouTube</option>
          <option value="vimeo" ${q.videoProviderPreference === 'vimeo' ? 'selected' : ''}>Vimeo</option>
          <option value="direct" ${q.videoProviderPreference === 'direct' ? 'selected' : ''}>Direct</option>
        </select>
      `;
      if (q.imageData) {
        specific += `
          <div class="pin-preview question-image-preview">
            <img src="${q.imageData}" alt="Question image" data-zoomable="1" />
          </div>
        `;
      }
    }

    if (supportsQuestionAudio(q.type) && !['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      specific += buildAudioSettingsMarkup(idx, q);
    }

    specific += buildVideoSettingsMarkup(idx, q);

    wrap.innerHTML = common + specific + '</div>';
    wrap.dataset.questionIndex = String(idx);
    questionListEl.appendChild(wrap);
  });

  questionListEl.querySelectorAll('[data-q]').forEach((el) => {
    el.addEventListener('input', syncQuizFromUI);
    el.addEventListener('change', syncQuizFromUI);
  });

  if (collapseAllBtn) {
    const allCollapsed = quiz.questions.length > 0 && quiz.questions.every((q) => !!q.collapsed);
    collapseAllBtn.textContent = allCollapsed ? 'Expand all' : 'Collapse all';
  }

  if (pendingScrollQuestionIndex != null) {
    const target = questionListEl.querySelector(`[data-question-index="${pendingScrollQuestionIndex}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pendingScrollQuestionIndex = null;
  }
}

const EDGE_TTS_LANGUAGE_DEFAULTS = {
  NONE: '',
  EN: 'en-US-AriaNeural',
  CA: 'ca-ES-JoanaNeural',
  FR: 'fr-FR-DeniseNeural',
  OTHER: 'en-US-AriaNeural',
};
const EDGE_TTS_LANGUAGE_OPTIONS = [
  { value: 'NONE', label: "Don't hear questions" },
  { value: 'EN', label: 'English' },
  { value: 'CA', label: 'Català' },
  { value: 'FR', label: 'Français' },
  { value: 'OTHER', label: 'Other' },
];
const EDGE_TTS_VOICE_INDEX = [
  // English
  { code: 'en-US-AndrewMultilingualNeural', language: 'English', country: 'United States', person: 'Andrew (Multi)' },
  { code: 'en-US-AvaMultilingualNeural', language: 'English', country: 'United States', person: 'Ava (Multi)' },
  { code: 'en-US-EmmaMultilingualNeural', language: 'English', country: 'United States', person: 'Emma (Multi)' },
  { code: 'en-US-BrianMultilingualNeural', language: 'English', country: 'United States', person: 'Brian (Multi)' },
  { code: 'en-US-AndrewNeural', language: 'English', country: 'United States', person: 'Andrew' },
  { code: 'en-US-AvaNeural', language: 'English', country: 'United States', person: 'Ava' },
  { code: 'en-US-EmmaNeural', language: 'English', country: 'United States', person: 'Emma' },
  { code: 'en-US-BrianNeural', language: 'English', country: 'United States', person: 'Brian' },
  { code: 'en-GB-RyanNeural', language: 'English', country: 'United Kingdom', person: 'Ryan' },
  { code: 'en-GB-SoniaNeural', language: 'English', country: 'United Kingdom', person: 'Sonia' },
  { code: 'en-AU-WilliamNeural', language: 'English', country: 'Australia', person: 'William' },
  { code: 'en-AU-NatashaNeural', language: 'English', country: 'Australia', person: 'Natasha' },
  { code: 'en-CA-LiamNeural', language: 'English', country: 'Canada', person: 'Liam' },
  { code: 'en-CA-ClaraNeural', language: 'English', country: 'Canada', person: 'Clara' },
  { code: 'en-IN-PrabhatNeural', language: 'English', country: 'India', person: 'Prabhat' },
  { code: 'en-IN-NeerjaNeural', language: 'English', country: 'India', person: 'Neerja' },
  { code: 'en-IE-ConnorNeural', language: 'English', country: 'Ireland', person: 'Connor' },
  { code: 'en-IE-EmilyNeural', language: 'English', country: 'Ireland', person: 'Emily' },
  { code: 'en-SG-WayneNeural', language: 'English', country: 'Singapore', person: 'Wayne' },
  { code: 'en-SG-LunaNeural', language: 'English', country: 'Singapore', person: 'Luna' },
  { code: 'en-HK-SamNeural', language: 'English', country: 'Hong Kong', person: 'Sam' },
  { code: 'en-HK-YanNeural', language: 'English', country: 'Hong Kong', person: 'Yan' },
  { code: 'en-KE-ChilembaNeural', language: 'English', country: 'Kenya', person: 'Chilemba' },
  { code: 'en-KE-AsiliaNeural', language: 'English', country: 'Kenya', person: 'Asilia' },
  { code: 'en-NG-AbeoNeural', language: 'English', country: 'Nigeria', person: 'Abeo' },
  { code: 'en-NG-EzinneNeural', language: 'English', country: 'Nigeria', person: 'Ezinne' },
  { code: 'en-NZ-MitchellNeural', language: 'English', country: 'New Zealand', person: 'Mitchell' },
  { code: 'en-NZ-MollyNeural', language: 'English', country: 'New Zealand', person: 'Molly' },
  { code: 'en-PH-JamesNeural', language: 'English', country: 'Philippines', person: 'James' },
  { code: 'en-PH-RosaNeural', language: 'English', country: 'Philippines', person: 'Rosa' },
  { code: 'en-TZ-ElimuNeural', language: 'English', country: 'Tanzania', person: 'Elimu' },
  { code: 'en-TZ-ImaniNeural', language: 'English', country: 'Tanzania', person: 'Imani' },
  { code: 'en-ZA-LukeNeural', language: 'English', country: 'South Africa', person: 'Luke' },
  { code: 'en-ZA-LeahNeural', language: 'English', country: 'South Africa', person: 'Leah' },

  // Catalan
  { code: 'ca-ES-JoanaNeural', language: 'Català', country: 'Spain', person: 'Joana' },
  { code: 'ca-ES-EnricNeural', language: 'Català', country: 'Spain', person: 'Enric' },

  // French
  { code: 'fr-FR-DeniseNeural', language: 'Français', country: 'France', person: 'Denise' },
  { code: 'fr-FR-HenriNeural', language: 'Français', country: 'France', person: 'Henri' },
  { code: 'fr-CA-SylvieNeural', language: 'Français', country: 'Canada', person: 'Sylvie' },
  { code: 'fr-CA-AntoineNeural', language: 'Français', country: 'Canada', person: 'Antoine' },
  { code: 'fr-BE-CharlineNeural', language: 'Français', country: 'Belgium', person: 'Charline' },
  { code: 'fr-BE-GerardNeural', language: 'Français', country: 'Belgium', person: 'Gerard' },
  { code: 'fr-CH-ArianeNeural', language: 'Français', country: 'Switzerland', person: 'Ariane' },
  { code: 'fr-CH-FabriceNeural', language: 'Français', country: 'Switzerland', person: 'Fabrice' },

  // Spanish
  { code: 'es-ES-ElviraNeural', language: 'Español', country: 'Spain', person: 'Elvira' },
  { code: 'es-ES-AlvaroNeural', language: 'Español', country: 'Spain', person: 'Alvaro' },
  { code: 'es-MX-DaliaNeural', language: 'Español', country: 'Mexico', person: 'Dalia' },
  { code: 'es-MX-JorgeNeural', language: 'Español', country: 'Mexico', person: 'Jorge' },
  { code: 'es-AR-ElenaNeural', language: 'Español', country: 'Argentina', person: 'Elena' },
  { code: 'es-AR-TomasNeural', language: 'Español', country: 'Argentina', person: 'Tomas' },
  { code: 'es-CO-SalomeNeural', language: 'Español', country: 'Colombia', person: 'Salome' },
  { code: 'es-CO-GonzaloNeural', language: 'Español', country: 'Colombia', person: 'Gonzalo' },
  { code: 'es-CL-CatalinaNeural', language: 'Español', country: 'Chile', person: 'Catalina' },
  { code: 'es-CL-LorenzoNeural', language: 'Español', country: 'Chile', person: 'Lorenzo' },
  { code: 'es-US-PalomaNeural', language: 'Español', country: 'United States', person: 'Paloma' },
  { code: 'es-US-AlonsoNeural', language: 'Español', country: 'United States', person: 'Alonso' },
  { code: 'es-PE-CamilaNeural', language: 'Español', country: 'Peru', person: 'Camila' },
  { code: 'es-PE-AlexNeural', language: 'Español', country: 'Peru', person: 'Alex' },

  // Italian
  { code: 'it-IT-ElsaNeural', language: 'Italiano', country: 'Italy', person: 'Elsa' },
  { code: 'it-IT-DiegoNeural', language: 'Italiano', country: 'Italy', person: 'Diego' },
  { code: 'it-CH-LuisaNeural', language: 'Italiano', country: 'Switzerland', person: 'Luisa' },

  // German
  { code: 'de-DE-KatjaNeural', language: 'Deutsch', country: 'Germany', person: 'Katja' },
  { code: 'de-DE-ConradNeural', language: 'Deutsch', country: 'Germany', person: 'Conrad' },
  { code: 'de-AT-IngridNeural', language: 'Deutsch', country: 'Austria', person: 'Ingrid' },
  { code: 'de-AT-JonasNeural', language: 'Deutsch', country: 'Austria', person: 'Jonas' },
  { code: 'de-CH-LeniNeural', language: 'Deutsch', country: 'Switzerland', person: 'Leni' },
  { code: 'de-CH-JanNeural', language: 'Deutsch', country: 'Switzerland', person: 'Jan' },

  // Portuguese
  { code: 'pt-BR-FranciscaNeural', language: 'Português', country: 'Brazil', person: 'Francisca' },
  { code: 'pt-BR-AntonioNeural', language: 'Português', country: 'Brazil', person: 'Antonio' },
  { code: 'pt-PT-RaquelNeural', language: 'Português', country: 'Portugal', person: 'Raquel' },
  { code: 'pt-PT-DuarteNeural', language: 'Português', country: 'Portugal', person: 'Duarte' },

  // Russian
  { code: 'ru-RU-SvetlanaNeural', language: 'Русский', country: 'Russia', person: 'Svetlana' },
  { code: 'ru-RU-DmitryNeural', language: 'Русский', country: 'Russia', person: 'Dmitry' },

  // Japanese
  { code: 'ja-JP-NanamiNeural', language: '日本語', country: 'Japan', person: 'Nanami' },
  { code: 'ja-JP-KeitaNeural', language: '日本語', country: 'Japan', person: 'Keita' },

  // Chinese
  { code: 'zh-CN-XiaoxiaoNeural', language: '中文', country: 'China', person: 'Xiaoxiao' },
  { code: 'zh-CN-YunxiNeural', language: '中文', country: 'China', person: 'Yunxi' },
  { code: 'zh-CN-XiaoyiNeural', language: '中文', country: 'China', person: 'Xiaoyi' },
  { code: 'zh-TW-HsiaoChenNeural', language: '中文', country: 'Taiwan', person: 'HsiaoChen' },
  { code: 'zh-TW-YunJheNeural', language: '中文', country: 'Taiwan', person: 'YunJhe' },
  { code: 'zh-HK-HiuMaanNeural', language: '中文', country: 'Hong Kong', person: 'HiuMaan' },
  { code: 'zh-HK-WanLungNeural', language: '中文', country: 'Hong Kong', person: 'WanLung' },

  // Korean
  { code: 'ko-KR-SunHiNeural', language: '한국어', country: 'South Korea', person: 'SunHi' },
  { code: 'ko-KR-InJoonNeural', language: '한국어', country: 'South Korea', person: 'InJoon' },

  // Arabic
  { code: 'ar-SA-ZariyahNeural', language: 'العربية', country: 'Saudi Arabia', person: 'Zariyah' },
  { code: 'ar-SA-HamedNeural', language: 'العربية', country: 'Saudi Arabia', person: 'Hamed' },
  { code: 'ar-EG-SalmaNeural', language: 'العربية', country: 'Egypt', person: 'Salma' },
  { code: 'ar-EG-ShakirNeural', language: 'العربية', country: 'Egypt', person: 'Shakir' },
  { code: 'ar-AE-FatimaNeural', language: 'العربية', country: 'UAE', person: 'Fatima' },
  { code: 'ar-AE-HamdanNeural', language: 'العربية', country: 'UAE', person: 'Hamdan' },

  // Hindi
  { code: 'hi-IN-SwaraNeural', language: 'हिन्दी', country: 'India', person: 'Swara' },
  { code: 'hi-IN-MadhurNeural', language: 'हिन्दी', country: 'India', person: 'Madhur' },

  // Dutch
  { code: 'nl-NL-ColetteNeural', language: 'Nederlands', country: 'Netherlands', person: 'Colette' },
  { code: 'nl-NL-MaartenNeural', language: 'Nederlands', country: 'Netherlands', person: 'Maarten' },
  { code: 'nl-BE-DenaNeural', language: 'Nederlands', country: 'Belgium', person: 'Dena' },
  { code: 'nl-BE-ArnaudNeural', language: 'Nederlands', country: 'Belgium', person: 'Arnaud' },

  // Polish
  { code: 'pl-PL-AgnieszkaNeural', language: 'Polski', country: 'Poland', person: 'Agnieszka' },
  { code: 'pl-PL-MarekNeural', language: 'Polski', country: 'Poland', person: 'Marek' },

  // Turkish
  { code: 'tr-TR-EmelNeural', language: 'Türkçe', country: 'Turkey', person: 'Emel' },
  { code: 'tr-TR-AhmetNeural', language: 'Türkçe', country: 'Turkey', person: 'Ahmet' },

  // Swedish
  { code: 'sv-SE-SofieNeural', language: 'Svenska', country: 'Sweden', person: 'Sofie' },
  { code: 'sv-SE-MattiasNeural', language: 'Svenska', country: 'Sweden', person: 'Mattias' },

  // Norwegian
  { code: 'nb-NO-PernilleNeural', language: 'Norsk', country: 'Norway', person: 'Pernille' },
  { code: 'nb-NO-FinnNeural', language: 'Norsk', country: 'Norway', person: 'Finn' },

  // Danish
  { code: 'da-DK-ChristelNeural', language: 'Dansk', country: 'Denmark', person: 'Christel' },
  { code: 'da-DK-JeppeNeural', language: 'Dansk', country: 'Denmark', person: 'Jeppe' },

  // Finnish
  { code: 'fi-FI-NooraNeural', language: 'Suomi', country: 'Finland', person: 'Noora' },
  { code: 'fi-FI-SelmaNeural', language: 'Suomi', country: 'Finland', person: 'Selma' },
  { code: 'fi-FI-HarriNeural', language: 'Suomi', country: 'Finland', person: 'Harri' },

  // Greek
  { code: 'el-GR-AthinaNeural', language: 'Ελληνικά', country: 'Greece', person: 'Athina' },
  { code: 'el-GR-NestorasNeural', language: 'Ελληνικά', country: 'Greece', person: 'Nestoras' },

  // Czech
  { code: 'cs-CZ-VlastaNeural', language: 'Čeština', country: 'Czech Republic', person: 'Vlasta' },
  { code: 'cs-CZ-AntoninNeural', language: 'Čeština', country: 'Czech Republic', person: 'Antonin' },

  // Hungarian
  { code: 'hu-HU-NoemiNeural', language: 'Magyar', country: 'Hungary', person: 'Noemi' },
  { code: 'hu-HU-TamasNeural', language: 'Magyar', country: 'Hungary', person: 'Tamas' },

  // Romanian
  { code: 'ro-RO-AlinaNeural', language: 'Română', country: 'Romania', person: 'Alina' },
  { code: 'ro-RO-EmilNeural', language: 'Română', country: 'Romania', person: 'Emil' },

  // Ukrainian
  { code: 'uk-UA-PolinaNeural', language: 'Українська', country: 'Ukraine', person: 'Polina' },
  { code: 'uk-UA-OstapNeural', language: 'Українська', country: 'Ukraine', person: 'Ostap' },

  // Bulgarian
  { code: 'bg-BG-KalinaNeural', language: 'Български', country: 'Bulgaria', person: 'Kalina' },
  { code: 'bg-BG-BorislavNeural', language: 'Български', country: 'Bulgaria', person: 'Borislav' },

  // Slovak
  { code: 'sk-SK-ViktoriaNeural', language: 'Slovenčina', country: 'Slovakia', person: 'Viktoria' },
  { code: 'sk-SK-LukasNeural', language: 'Slovenčina', country: 'Slovakia', person: 'Lukas' },

  // Croatian
  { code: 'hr-HR-GabrijelaNeural', language: 'Hrvatski', country: 'Croatia', person: 'Gabrijela' },
  { code: 'hr-HR-SreckoNeural', language: 'Hrvatski', country: 'Croatia', person: 'Srecko' },

  // Serbian
  { code: 'sr-RS-SophieNeural', language: 'Srpski', country: 'Serbia', person: 'Sophie' },
  { code: 'sr-RS-NicholasNeural', language: 'Srpski', country: 'Serbia', person: 'Nicholas' },

  // Slovenian
  { code: 'sl-SI-PetraNeural', language: 'Slovenščina', country: 'Slovenia', person: 'Petra' },
  { code: 'sl-SI-RokNeural', language: 'Slovenščina', country: 'Slovenia', person: 'Rok' },

  // Thai
  { code: 'th-TH-PremwadeeNeural', language: 'ไทย', country: 'Thailand', person: 'Premwadee' },
  { code: 'th-TH-NiwatNeural', language: 'ไทย', country: 'Thailand', person: 'Niwat' },

  // Vietnamese
  { code: 'vi-VN-HoaiMyNeural', language: 'Tiếng Việt', country: 'Vietnam', person: 'HoaiMy' },
  { code: 'vi-VN-NamMinhNeural', language: 'Tiếng Việt', country: 'Vietnam', person: 'NamMinh' },

  // Indonesian
  { code: 'id-ID-GadisNeural', language: 'Bahasa', country: 'Indonesia', person: 'Gadis' },
  { code: 'id-ID-ArdiNeural', language: 'Bahasa', country: 'Indonesia', person: 'Ardi' },

  // Malay
  { code: 'ms-MY-YasminNeural', language: 'Bahasa', country: 'Malaysia', person: 'Yasmin' },
  { code: 'ms-MY-OsmanNeural', language: 'Bahasa', country: 'Malaysia', person: 'Osman' },

  // Hebrew
  { code: 'he-IL-HilaNeural', language: 'עברית', country: 'Israel', person: 'Hila' },
  { code: 'he-IL-AvriNeural', language: 'עברית', country: 'Israel', person: 'Avri' },

  // Persian
  { code: 'fa-IR-DilaraNeural', language: 'فارسی', country: 'Iran', person: 'Dilara' },
  { code: 'fa-IR-FaridNeural', language: 'فارسی', country: 'Iran', person: 'Farid' },

  // Bengali
  { code: 'bn-IN-TanishaaNeural', language: 'বাংলা', country: 'India', person: 'Tanishaa' },
  { code: 'bn-IN-BashkarNeural', language: 'বাংলা', country: 'India', person: 'Bashkar' },
  { code: 'bn-BD-NabanitaNeural', language: 'বাংলা', country: 'Bangladesh', person: 'Nabanita' },
  { code: 'bn-BD-PradeepNeural', language: 'বাংলা', country: 'Bangladesh', person: 'Pradeep' },

  // Tamil
  { code: 'ta-IN-PallaviNeural', language: 'தமிழ்', country: 'India', person: 'Pallavi' },
  { code: 'ta-IN-ValluvarNeural', language: 'தமிழ்', country: 'India', person: 'Valluvar' },

  // Telugu
  { code: 'te-IN-ShrutiNeural', language: 'తెలుగు', country: 'India', person: 'Shruti' },
  { code: 'te-IN-MohanNeural', language: 'తెలుగు', country: 'India', person: 'Mohan' },

  // Urdu
  { code: 'ur-IN-GulNeural', language: 'اردو', country: 'India', person: 'Gul' },
  { code: 'ur-IN-SalmanNeural', language: 'اردو', country: 'India', person: 'Salman' },
  { code: 'ur-PK-UzmaNeural', language: 'اردو', country: 'Pakistan', person: 'Uzma' },
  { code: 'ur-PK-AsadNeural', language: 'اردو', country: 'Pakistan', person: 'Asad' },

  // Afrikaans
  { code: 'af-ZA-AdriNeural', language: 'Afrikaans', country: 'South Africa', person: 'Adri' },
  { code: 'af-ZA-WillemNeural', language: 'Afrikaans', country: 'South Africa', person: 'Willem' },

  // Swahili
  { code: 'sw-KE-ZuriNeural', language: 'Kiswahili', country: 'Kenya', person: 'Zuri' },
  { code: 'sw-KE-RafikiNeural', language: 'Kiswahili', country: 'Kenya', person: 'Rafiki' },
  { code: 'sw-TZ-RehemaNeural', language: 'Kiswahili', country: 'Tanzania', person: 'Rehema' },
  { code: 'sw-TZ-DaudiNeural', language: 'Kiswahili', country: 'Tanzania', person: 'Daudi' },
];
const EDGE_TTS_VOICE_OPTIONS = [...new Set([...Object.values(EDGE_TTS_LANGUAGE_DEFAULTS), ...EDGE_TTS_VOICE_INDEX.map((v) => v.code)])];
const DEFAULT_EDGE_TTS_LANGUAGE = 'EN';
const DEFAULT_EDGE_TTS_VOICE = EDGE_TTS_LANGUAGE_DEFAULTS[DEFAULT_EDGE_TTS_LANGUAGE];

function normalizeTtsLanguage(value) {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'NONE') return 'NONE';
  return EDGE_TTS_LANGUAGE_DEFAULTS[key] ? key : DEFAULT_EDGE_TTS_LANGUAGE;
}

function formatVoiceIndexLabel(v) {
  return `${v.language} · ${v.country} · ${v.person} · ${v.code}`;
}

function guessTtsLanguageFromVoice(voice) {
  const v = String(voice || '').trim().toLowerCase();
  if (v.startsWith('ca-')) return 'CA';
  if (v.startsWith('fr-')) return 'FR';
  return 'EN';
}

function getVoiceForTtsLanguage(language) {
  const lang = normalizeTtsLanguage(language);
  if (lang === 'NONE') return '';
  return EDGE_TTS_LANGUAGE_DEFAULTS[lang] || DEFAULT_EDGE_TTS_VOICE;
}

function normalizeTtsVoice(voice, fallbackLanguage = DEFAULT_EDGE_TTS_LANGUAGE) {
  const raw = String(voice || '').trim();
  if (raw && EDGE_TTS_VOICE_OPTIONS.includes(raw)) return raw;
  return getVoiceForTtsLanguage(fallbackLanguage);
}

function isLikelyEdgeVoiceId(value) {
  return /^[a-z]{2,3}-[A-Z]{2,4}-[A-Za-z][A-Za-z0-9]*Neural$/.test(String(value || '').trim());
}

function getHearQuestionsMode(targetQuiz) {
  const raw = String(targetQuiz?.ttsLanguage || '').trim().toUpperCase();
  if (raw === 'NONE' || !raw) return 'NONE';
  return normalizeTtsLanguage(targetQuiz?.ttsLanguage);
}

function applyHearQuestionsMode(targetQuiz, modeValue) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const mode = String(modeValue || '').trim().toUpperCase();
  // "Don't hear questions" — disable TTS
  if (mode === 'NONE') {
    targetQuiz.ttsLanguage = 'NONE';
    targetQuiz.readAllQuestionsAloud = false;
    return;
  }
  // Legacy support for old saved mode.
  if (mode === 'READ') {
    targetQuiz.ttsLanguage = DEFAULT_EDGE_TTS_LANGUAGE;
    targetQuiz.readAllQuestionsAloud = false;
    return;
  }
  targetQuiz.ttsLanguage = normalizeTtsLanguage(mode);
  targetQuiz.readAllQuestionsAloud = true;
}

function normalizeQuizAudioDefaults(targetQuiz) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const raw = String(targetQuiz.ttsLanguage || '').trim().toUpperCase();
  targetQuiz.ttsLanguage = ['NONE', 'EN', 'CA', 'FR', 'OTHER'].includes(raw) ? raw : 'NONE';
  targetQuiz.readAllQuestionsAloud = targetQuiz.ttsLanguage !== 'NONE' && targetQuiz.readAllQuestionsAloud !== false;

  if (targetQuiz.ttsLanguage === 'NONE') {
    targetQuiz.language = '';
  } else if (targetQuiz.ttsLanguage === 'OTHER') {
    if (!targetQuiz.language) targetQuiz.language = EDGE_TTS_LANGUAGE_DEFAULTS['OTHER'];
  } else {
    targetQuiz.language = getVoiceForTtsLanguage(targetQuiz.ttsLanguage);
  }
}

function isHttpUrl(value) {
  const s = String(value || '').trim();
  return /^https?:\/\//i.test(s);
}

function detectVideoProvider(url) {
  const raw = String(url || '').toLowerCase();
  if (raw.includes('youtu.be') || raw.includes('youtube.com')) return 'youtube';
  if (raw.includes('vimeo.com')) return 'vimeo';
  return 'direct';
}

function toVideoEmbedConfig(media) {
  const normalized = normalizeQuestionMedia(media);
  const provider = normalized.provider || detectVideoProvider(normalized.url || normalized.embedUrl);
  const srcRaw = normalized.url || normalized.embedUrl;
  const start = Math.max(0, Number(normalized.startAt || 0) || 0);
  const end = normalized.endAt == null ? null : Number(normalized.endAt);
  if (!srcRaw) return { provider, src: '', start, end };

  try {
    const parsed = new URL(srcRaw);
    if (provider === 'youtube') {
      let id = '';
      if (parsed.hostname.includes('youtu.be')) id = parsed.pathname.slice(1);
      if (!id && parsed.searchParams.get('v')) id = parsed.searchParams.get('v');
      if (!id && parsed.pathname.includes('/embed/')) id = parsed.pathname.split('/embed/')[1];
      if (!id) return { provider, src: '', start, end };
      const embed = new URL(`https://www.youtube.com/embed/${id}`);
      if (start > 0) embed.searchParams.set('start', String(Math.floor(start)));
      if (end != null) embed.searchParams.set('end', String(Math.floor(end)));
      embed.searchParams.set('rel', '0');
      embed.searchParams.set('enablejsapi', '1');
      return { provider, src: embed.toString(), start, end };
    }
    if (provider === 'vimeo') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts.find((x) => /^\d+$/.test(x));
      if (!id) return { provider, src: '', start, end };
      const embed = new URL(`https://player.vimeo.com/video/${id}`);
      if (start > 0) embed.searchParams.set('#t', `${Math.floor(start)}s`);
      return { provider, src: embed.toString(), start, end };
    }
    return { provider: 'direct', src: parsed.toString(), start, end };
  } catch {
    return { provider, src: '', start, end };
  }
}

function buildAudioSettingsMarkup(idx, q) {
  const mode = q.audioMode || (q.audioData ? 'file' : 'tts');
  const ttsLanguage = normalizeTtsLanguage(q.ttsLanguage || guessTtsLanguageFromVoice(q.language));
  const voice = normalizeTtsVoice(q.language, ttsLanguage);
  const showOtherSearch = ttsLanguage === 'OTHER';
  const ttsLanguageOptions = EDGE_TTS_LANGUAGE_OPTIONS
    .filter((x) => x.value !== 'READ')
    .map((x) => `<option value="${x.value}" ${ttsLanguage === x.value ? 'selected' : ''}>${x.label}</option>`)
    .join('');

  const voiceSource = showOtherSearch ? EDGE_TTS_VOICE_INDEX.map((v) => v.code) : [EDGE_TTS_LANGUAGE_DEFAULTS['EN'], EDGE_TTS_LANGUAGE_DEFAULTS['CA'], EDGE_TTS_LANGUAGE_DEFAULTS['FR']];
  const voiceOptions = [...new Set(voiceSource)]
    .map((v) => `<option value="${v}" ${voice === v ? 'selected' : ''}>${v}</option>`)
    .join('');
  const voiceIndexOptions = EDGE_TTS_VOICE_INDEX
    .map((v) => `<option value="${escapeHtml(v.code)}">${escapeHtml(formatVoiceIndexLabel(v))}</option>`)
    .join('');

  return `
    <div class="top-space" style="padding:.55rem; border:1px dashed var(--line); border-radius:.55rem;">
      <div class="row gap top-space">
        <div style="min-width:170px;">
          <label>Audio source</label>
          <select data-q="${idx}" data-field="audioMode">
            <option value="tts" ${mode === 'tts' ? 'selected' : ''}>Text-to-speech</option>
            <option value="file" ${mode === 'file' ? 'selected' : ''}>Audio file</option>
          </select>
        </div>
        <div style="min-width:220px;">
          <label>Audio file</label>
          <input data-audio-upload="${idx}" type="file" accept="audio/*" />
        </div>
      </div>
      <label class="top-space">Text to read aloud (max 1000 chars)</label>
      <input data-q="${idx}" data-field="audioText" maxlength="1200" value="${escapeHtml(q.audioText || '')}" placeholder="This is a sample text." />
      <label>TTS text language</label>
      <select data-q="${idx}" data-field="ttsLanguageQuestion">${ttsLanguageOptions}</select>
      ${showOtherSearch ? `<label class="top-space">Find Edge voice (language · country · person · code)</label>
      <input data-q="${idx}" data-field="voiceSearch" list="edgeVoiceIndex" value="${escapeHtml(voice)}" placeholder="Type language/country/person/code" />
      <datalist id="edgeVoiceIndex">${voiceIndexOptions}</datalist>` : ''}
      <label>TTS Voice</label>
      <select data-q="${idx}" data-field="language">${voiceOptions}</select>
      <div class="small top-space">${q.audioData ? 'Audio file uploaded ✅' : 'No audio file uploaded yet.'}</div>
      <div class="top-space"><button type="button" class="btn" data-play-audio-preview="${idx}">▶ Play preview</button></div>
    </div>
  `;
}

function formatClipSummary(media) {
  const start = Number(media?.startAt || 0) || 0;
  const end = media?.endAt == null ? null : Number(media.endAt);
  const fmt = (s) => {
    const sec = Math.max(0, Math.floor(Number(s || 0)));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const r = String(sec % 60).padStart(2, '0');
    return `${m}:${r}`;
  };
  if (end == null) return `${fmt(start)} → end`;
  return `${fmt(start)} → ${fmt(end)} (${Math.max(0, Math.floor(end - start))}s)`;
}

function buildVideoSettingsMarkup(idx, q) {
  const media = normalizeQuestionMedia(q.media);
  const config = toVideoEmbedConfig(media);
  const invalidBounds = media.endAt != null && Number(media.endAt) <= Number(media.startAt || 0);
  return `
    <div class="top-space" style="padding:.55rem; border:1px dashed var(--line); border-radius:.55rem;">
      <label><strong>Question video (optional)</strong></label>
      <div class="row gap top-space">
        <input data-q="${idx}" data-field="mediaUrl" value="${escapeHtml(media.url)}" maxlength="2000" placeholder="Paste YouTube, Vimeo, or direct video URL" />
        <select data-q="${idx}" data-field="mediaProvider">
          <option value="youtube" ${config.provider === 'youtube' ? 'selected' : ''}>YouTube</option>
          <option value="vimeo" ${config.provider === 'vimeo' ? 'selected' : ''}>Vimeo</option>
          <option value="direct" ${config.provider === 'direct' ? 'selected' : ''}>Direct URL</option>
        </select>
      </div>
      <div class="row gap top-space">
        <div><label>Start (sec)</label><input type="number" min="0" step="0.1" data-q="${idx}" data-field="mediaStartAt" value="${Number(media.startAt || 0)}"></div>
        <div><label>End (sec)</label><input type="number" min="0" step="0.1" data-q="${idx}" data-field="mediaEndAt" value="${media.endAt == null ? '' : Number(media.endAt)}" placeholder="optional"></div>
      </div>
      <div class="small top-space">Clip: ${formatClipSummary(media)}</div>
      ${invalidBounds ? '<div class="small" style="color:#dc2626;">End must be greater than start. End was reset to video end.</div>' : ''}
      <div class="row gap top-space">
        <button type="button" class="btn" data-video-preview-clip="${idx}">Preview clip</button>
        <button type="button" class="btn" data-video-set-start="${idx}">Set Start = Current Time</button>
        <button type="button" class="btn" data-video-set-end="${idx}">Set End = Current Time</button>
        <button type="button" class="btn" data-video-reset-clip="${idx}">Reset clip</button>
        <button type="button" class="btn" data-video-clear="${idx}">Remove video</button>
      </div>
      <div class="top-space question-video-wrap" data-video-preview-wrap="${idx}">
        ${config.src ? (config.provider === 'direct'
      ? `<video data-video-preview-el="${idx}" controls preload="metadata" src="${escapeHtml(config.src)}" class="question-video-el"></video>`
      : `<iframe data-video-preview-el="${idx}" src="${escapeHtml(config.src)}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" class="question-video-el"></iframe>`) : '<div class="small">No valid video URL yet.</div>'}
      </div>
    </div>
  `;
}

function syncQuizFromUI() {
  quiz.title = quizTitleEl.value.trim();
  applyHearQuestionsMode(quiz, quizTtsLanguageEl?.value || getHearQuestionsMode(quiz));

  quiz.questions.forEach((q, idx) => {
    const promptEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="prompt"]`);
    const pointsEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="points"]`);
    const timeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="timeLimit"]`);
    const pollEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="isPoll"]`);

    if (promptEl) q.prompt = String(promptEl.value || '').slice(0, 1200);
    if (pointsEl) q.points = Number(pointsEl.value || 1000);
    if (timeEl) q.timeLimit = normalizeTimeLimitValue(timeEl.value, q.type);
    q.isPoll = !!pollEl?.checked;
    const mediaUrlEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="mediaUrl"]`);
    const mediaProviderEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="mediaProvider"]`);
    const mediaStartEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="mediaStartAt"]`);
    const mediaEndEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="mediaEndAt"]`);
    const nextMedia = normalizeQuestionMedia({
      ...(q.media || makeDefaultQuestionMedia()),
      url: String(mediaUrlEl?.value || '').trim(),
      provider: String(mediaProviderEl?.value || detectVideoProvider(mediaUrlEl?.value || '')),
      startAt: Number(mediaStartEl?.value || 0),
      endAt: String(mediaEndEl?.value || '').trim() === '' ? null : Number(mediaEndEl?.value),
      kind: String(mediaUrlEl?.value || '').trim() ? 'video' : 'none',
    });
    q.media = nextMedia;
    if (q.type === 'pin' && q.media.kind === 'video') {
      q.media = makeDefaultQuestionMedia();
    }
    if (q.media.kind === 'video' && q.type !== 'pin' && q.imageData) {
      replaceQuestionImageData(q, '');
    }

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      q.answers = q.answers || [];
      const answerSlots = q.type === 'tf' ? 2 : 10;
      while (q.answers.length < answerSlots) q.answers.push({ text: '', correct: false });

      q.answers.slice(0, answerSlots).forEach((a, aIdx) => {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-answer-index="${aIdx}"]`);
        if (aEl) a.text = String(aEl.value || '').slice(0, 90);
      });

      if (q.type === 'multi') {
        q.answers.forEach((a, aIdx) => {
          const cEl = questionListEl.querySelector(`[data-q="${idx}"][data-correct-index="${aIdx}"]`);
          a.correct = !!cEl?.checked;
        });
      } else {
        const selectedCorrect = questionListEl.querySelector(`[data-q="${idx}"][data-correct-index]:checked`);
        const correctIndex = selectedCorrect ? Number(selectedCorrect.dataset.correctIndex) : 0;
        q.answers.forEach((a, aIdx) => {
          a.correct = aIdx === correctIndex;
        });
      }

      if (q.type === 'tf') {
        const tfTrue = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'true');
        const tfFalse = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'false');
        const trueCorrect = tfTrue ? !!tfTrue.correct : !!q.answers?.[0]?.correct;
        const falseCorrect = tfFalse ? !!tfFalse.correct : !!q.answers?.[1]?.correct;
        q.answers[0] = { text: 'True', correct: trueCorrect };
        q.answers[1] = { text: 'False', correct: falseCorrect };
      }

    }

    if (supportsQuestionAudio(q.type)) {
      const audioModeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioMode"]`);
      const audioTextEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioText"]`);
      const languageEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="language"]`);
      const ttsLanguageQuestionEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="ttsLanguageQuestion"]`);
      const voiceSearchEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="voiceSearch"]`);

      const quizTtsLanguage = normalizeTtsLanguage(quiz.ttsLanguage);
      q.audioMode = ['tts', 'file'].includes(String(audioModeEl?.value || '')) ? String(audioModeEl.value) : (q.audioData ? 'file' : 'tts');
      q.audioText = String(audioTextEl?.value || '').slice(0, 1200);

      const textLang = normalizeTtsLanguage(ttsLanguageQuestionEl?.value || q.ttsLanguage || quizTtsLanguage);
      q.ttsLanguage = textLang;
      const pickedVoice = String(languageEl?.value || '').slice(0, 64);
      let resolvedVoice = normalizeTtsVoice(pickedVoice, textLang);

      if (textLang === 'OTHER' && voiceSearchEl) {
        const rawSearch = String(voiceSearchEl.value || '').trim();
        if (rawSearch) {
          const rawLower = rawSearch.toLowerCase();
          const hit = EDGE_TTS_VOICE_INDEX.find((v) => {
            const label = formatVoiceIndexLabel(v).toLowerCase();
            return v.code.toLowerCase() === rawLower || label.includes(rawLower);
          });
          if (hit) resolvedVoice = hit.code;
        }
      }

      q.language = normalizeTtsVoice(resolvedVoice, quizTtsLanguage);

      if (q.audioMode !== 'file') q.audioData = q.audioData || '';

      // New rule: no checkbox.
      // TTS is enabled when text exists and language is not 'NONE'; file mode enabled when audioData exists.
      q.audioEnabled = q.type === 'audio'
        ? true
        : (q.audioMode === 'file' ? !!q.audioData : (textLang !== 'NONE' && !!String(q.audioText || '').trim()));
    }

    // Sync imageKeyword from form
    const imageKeywordEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="imageKeyword"]`);
    if (imageKeywordEl) q.imageKeyword = String(imageKeywordEl.value || '').trim().slice(0, 140);
    const videoKeywordEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="videoKeyword"]`);
    if (videoKeywordEl) q.videoKeyword = String(videoKeywordEl.value || '').trim().slice(0, 140);
    const videoProviderPreferenceEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="videoProviderPreference"]`);
    q.videoProviderPreference = ['youtube', 'vimeo', 'direct'].includes(String(videoProviderPreferenceEl?.value || ''))
      ? String(videoProviderPreferenceEl.value)
      : '';

    if (q.type === 'text') {
      const accepted = [];
      for (let aIdx = 0; aIdx < 20; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-accepted-index="${aIdx}"]`);
        accepted.push(String(aEl?.value || '').slice(0, 120));
      }
      q.accepted = accepted;
    }

    if (q.type === 'context_gap') {
      const gaps = [];
      for (let aIdx = 0; aIdx < 10; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-gap-index="${aIdx}"]`);
        gaps.push(String(aEl?.value || '').slice(0, 120));
      }
      q.gaps = gaps;
    }

    if (q.type === 'match_pairs') {
      const pairs = [];
      for (let i = 0; i < 10; i++) {
        const leftEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-left="${i}"]`);
        const rightEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-right="${i}"]`);
        const left = String(leftEl?.value || '').slice(0, 60).trim();
        const right = String(rightEl?.value || '').slice(0, 60).trim();
        if (left || right) pairs.push({ left, right });
      }
      q.pairs = pairs;
    }

    if (q.type === 'error_hunt') {
      const correctedEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="corrected"]`);
      const correctedRaw = String(correctedEl?.value || '').trimEnd();
      const variants = correctedRaw.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
      q.correctedVariants = variants;
      q.corrected = variants[0] || '';
      // Recalculate required errors based on prompt and corrected variants
      q.requiredErrors = countErrorHuntRequiredTokens(q.prompt, variants);
    }

    if (q.type === 'puzzle') {
      const items = [];
      for (let i = 0; i < 12; i++) {
        const itemEl = questionListEl.querySelector(`[data-q="${idx}"][data-puzzle-index="${i}"]`);
        items.push(String(itemEl?.value || '').slice(0, 90));
      }
      q.items = items;
    }

    if (q.type === 'slider') {
      const minEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMin"]`);
      const maxEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMax"]`);
      const targetEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderTarget"]`);
      const marginEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMargin"]`);
      const unitEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderUnit"]`);

      const min = Number(minEl?.value ?? 0);
      const max = Number(maxEl?.value ?? 100);
      const fixedMin = Number.isFinite(min) ? min : 0;
      const fixedMax = Number.isFinite(max) ? max : 100;

      q.min = Math.min(fixedMin, fixedMax);
      q.max = Math.max(fixedMin, fixedMax);
      q.target = clamp(Number(targetEl?.value ?? q.min), q.min, q.max);
      q.margin = ['none', 'low', 'medium', 'high', 'maximum'].includes(marginEl?.value)
        ? marginEl.value
        : 'medium';
      q.unit = String(unitEl?.value || '').slice(0, 20);
    }

    if (q.type === 'pin') {
      const xEls = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pin-zone-x]`)];
      const zones = xEls.map((xEl) => {
        const zi = Number(xEl.dataset.pinZoneX);
        const yEl = questionListEl.querySelector(`[data-q="${idx}"][data-pin-zone-y="${zi}"]`);
        const rEl = questionListEl.querySelector(`[data-q="${idx}"][data-pin-zone-r="${zi}"]`);
        return {
          x: round(clamp(Number(xEl?.value ?? 50), 0, 100), 1),
          y: round(clamp(Number(yEl?.value ?? 50), 0, 100), 1),
          r: round(clamp(Number(rEl?.value ?? 15), 1, 100), 1),
        };
      }).slice(0, 12);
      q.zones = zones.length ? zones : [{ x: 50, y: 50, r: 15 }];
      q.zone = q.zones[0];
      q.pinMode = questionListEl.querySelector(`[data-q="${idx}"][data-field="pinMode"]`)?.value || q.pinMode || 'all';
      if (q.pinMode !== 'any' && q.pinMode !== 'all') q.pinMode = String(q.pinMode);
    }
  });
}

async function publishQuizToDrive() {
  try {
    syncQuizFromUI();

    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    await ensureQuizMediaReady({ contextLabel: 'publish to drive', convertTtsToMp3: true, strictMediaCheck: true });
    const payload = normalizeQuizForLive(quiz);
    const data = await api(DRIVE_PUBLISH_ENDPOINT, {
      method: 'POST',
      body: {
        quiz: payload,
      },
    });

    const fileName = data?.file?.name || 'quiz.json';
    const fileId = data?.file?.id || null;

    setStatus(hostStatusEl, `Published to Drive: ${fileName}`, 'ok');
    await openQuizFromDrive({ highlightId: fileId });
  } catch (err) {
    setStatus(hostStatusEl, `Drive publish failed: ${err.message}`, 'bad');
  }
}

async function openImageSearchDialog(questionIdx) {
  const q = quiz.questions?.[Number(questionIdx)];
  if (!q) return;

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog-card';

  const head = document.createElement('div');
  head.className = 'row spread gap';
  const h = document.createElement('h3');
  h.textContent = 'Search web images';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());
  head.append(h, closeBtn);

  const row = document.createElement('div');
  row.className = 'row gap top-space';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search query';
  input.value = String(q.prompt || q.type || '').slice(0, 140);
  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn primary';
  searchBtn.textContent = 'Search';
  row.append(input, searchBtn);

  const status = document.createElement('p');
  status.className = 'small top-space';

  const results = document.createElement('div');
  results.className = 'answers-grid top-space';
  results.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
  results.style.gap = '.45rem';

  const runSearch = async () => {
    const query = String(input.value || '').trim();
    if (!query) {
      status.textContent = 'Enter a search query.';
      return;
    }
    status.textContent = 'Searching images...';
    results.innerHTML = '';

    try {
      const allItems = [];
      const seen = new Set();
      const targetTotal = 60;
      const openverseFirstLimit = Math.min(20, targetTotal);

      // 1) Openverse direct from browser first (small curated slice)
      try {
        const ovUrl = new URL('https://api.openverse.org/v1/images/');
        ovUrl.searchParams.set('q', query);
        ovUrl.searchParams.set('page_size', String(openverseFirstLimit));
        ovUrl.searchParams.set('page', '1');
        ovUrl.searchParams.set('mature', 'false');

        const ovRes = await fetch(ovUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8' },
        });
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          const ovItems = (Array.isArray(ovData?.results) ? ovData.results : []).map((it) => ({
            url: String(it?.url || ''),
            thumb: String(it?.thumbnail || it?.url || ''),
            title: String(it?.title || it?.foreign_landing_url || 'Openverse image'),
            source: 'Openverse',
          }));
          ovItems.forEach((it) => {
            if (it.url && !seen.has(it.url)) {
              seen.add(it.url);
              allItems.push(it);
            }
          });
        }
      } catch {
        // Openverse optional; continue with Pexels
      }

      // 2) Fill rest from backend Pexels search
      const need = Math.max(0, targetTotal - allItems.length);
      if (need > 0) {
        const data = await api(`/api/images/search?q=${encodeURIComponent(query)}&count=${need}`, { method: 'GET' });
        const pxItems = Array.isArray(data.items) ? data.items : [];
        pxItems.forEach((it) => {
          const url = String(it?.url || '');
          if (url && !seen.has(url)) {
            seen.add(url);
            allItems.push(it);
          }
        });
      }

      const items = allItems;
      if (!items.length) {
        status.textContent = 'No images found.';
        return;
      }
      status.textContent = `Found ${items.length} images. Click an image to import.`;

      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '.2rem';
        card.style.cursor = 'pointer';

        const img = document.createElement('img');
        img.src = item.thumb || item.url;
        img.alt = String(item.title || 'Image result');
        img.style.width = '100%';
        img.style.borderRadius = '.4rem';
        img.style.maxHeight = '78px';
        img.style.objectFit = 'cover';

        const importImage = async () => {
          try {
            card.style.opacity = '.55';
            card.style.pointerEvents = 'none';
            const imported = await api('/api/images/fetch', { method: 'POST', body: { url: item.url } });
            if (!imported?.dataUrl) throw new Error('Image import failed.');
            // Resize web image before storing
            const blob = dataUrlToBlob(imported.dataUrl);
            const resized = await imageFileToOptimizedDataUrl(blob);
            replaceQuestionImageData(q, resized);
            renderBuilder();
            setStatus(hostStatusEl, 'Image added from web search.', 'ok');
            overlay.remove();
          } catch (err) {
            setStatus(hostStatusEl, err.message || 'Could not import image.', 'bad');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
          }
        };

        card.addEventListener('click', importImage);
        card.append(img);
        results.appendChild(card);
      });
    } catch (err) {
      status.textContent = String(err?.message || 'Image search failed.');
    }
  };

  searchBtn.addEventListener('click', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  dialog.append(head, row, status, results);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  setTimeout(() => { input.focus(); input.select(); }, 50);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function showQuizManagerDialog({ title, items, onOpen, onDelete, highlightId = null }) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog-card';

  const head = document.createElement('div');
  head.className = 'row spread gap';
  const h = document.createElement('strong');
  h.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());
  head.append(h, closeBtn);

  const list = document.createElement('div');
  list.className = 'dialog-list top-space';

  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'small';
    p.textContent = 'No saved quizzes found.';
    list.appendChild(p);
  } else {
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'dialog-row';
      if (highlightId && String(item.id || '') === String(highlightId)) {
        row.classList.add('recent');
      }

      const openBtn = document.createElement('button');
      openBtn.className = 'btn dialog-open';
      openBtn.textContent = item.label;
      openBtn.title = item.label;
      openBtn.addEventListener('click', async () => {
        await onOpen(item);
        overlay.remove();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn dialog-delete';
      delBtn.textContent = '✕';
      delBtn.title = `Delete ${item.label}`;
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete "${item.label}"?`)) return;
        await onDelete(item);
        row.remove();
      });

      row.append(openBtn, delBtn);
      list.appendChild(row);
    });
  }

  dialog.append(head, list);
  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function openLocalLibraryDialog(opts = {}) {
  const items = loadQuizLibrary().slice().reverse();
  showQuizManagerDialog({
    title: 'Local quizzes',
    items: items.map((item) => ({
      id: item.id,
      raw: item,
      label: `${item.name} — ${new Date(item.updatedAt || Date.now()).toLocaleString()}`,
    })),
    onOpen: async (item) => {
      const chosen = item.raw;
      validateImportedQuiz(chosen.quiz);
      quiz = chosen.quiz;
      collapseAllQuestions(quiz);
      renderBuilder();
      saveQuiz(quiz);
      setStatus(hostStatusEl, `Loaded local save: ${chosen.name}`, 'ok');
    },
    onDelete: async (item) => {
      const next = loadQuizLibrary().filter((x) => x.id !== item.id);
      saveQuizLibrary(next);
      setStatus(hostStatusEl, `Deleted local save: ${item.raw.name}`, 'ok');
    },
    highlightId: opts.highlightId || null,
  });
}

async function openQuizFromDrive(opts = {}) {
  try {
    const list = await api('/api/drive/list', { method: 'GET' });
    const files = Array.isArray(list?.files) ? list.files : [];
    showQuizManagerDialog({
      title: 'Drive quizzes',
      items: files.map((f) => ({ id: f.id, raw: f, label: String(f.name || f.id) })),
      onOpen: async (item) => {
        const chosen = item.raw;
        const openData = await api(`/api/drive/open?fileId=${encodeURIComponent(chosen.id)}`, { method: 'GET' });
        const loadedQuiz = openData?.quiz;
        validateImportedQuiz(loadedQuiz);
        quiz = loadedQuiz;
        collapseAllQuestions(quiz);
        renderBuilder();
        saveQuiz(quiz);
        setStatus(hostStatusEl, `Loaded from Drive: ${chosen.name || chosen.id}`, 'ok');
      },
      onDelete: async (item) => {
        const chosen = item.raw;
        await api('/api/drive/delete', {
          method: 'POST',
          body: { fileId: chosen.id },
        });
        setStatus(hostStatusEl, `Deleted from Drive: ${chosen.name || chosen.id}`, 'ok');
      },
      highlightId: opts.highlightId || null,
    });
  } catch (err) {
    setStatus(hostStatusEl, `Open from Drive failed: ${err.message}`, 'bad');
  }
}

// Open quiz from Cloud (R2)
async function openQuizFromCloud() {
  try {
    const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
    setStatus(hostStatusEl, '☁️ Loading quizzes from cloud...', 'ok');

    const data = await api('/api/quizzes', { method: 'GET' });
    const cloudQuizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];

    if (!cloudQuizzes.length) {
      setStatus(hostStatusEl, 'No quizzes in cloud yet. Import a quiz first!', 'ok');
      return;
    }

    showQuizManagerDialog({
      title: '☁️ Cloud quizzes (R2)',
      items: cloudQuizzes.map((q, i) => ({
        id: q.key,
        raw: q,
        label: `${q.title || q.pin} (${q.questionCount || '?'} Q) — ${(q.size / 1024).toFixed(0)} KB`
      })),
      onOpen: async (item) => {
        const quizKey = item.raw.key;
        const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
        setStatus(hostStatusEl, '☁️ Loading from cloud...', 'ok');
        const res = await fetch(`${base}/api/media/${quizKey}`);
        if (!res.ok) throw new Error('Failed to load quiz from cloud');
        const loadedQuiz = await res.json();
        // The quiz JSON is stored directly (not wrapped)
        validateImportedQuiz(loadedQuiz);
        quiz = loadedQuiz;
        quiz._r2QuizId = quizKey.replace('quizzes/', '').replace('.json', '');
        collapseAllQuestions(quiz);
        renderBuilder();
        saveQuiz(quiz);
        setStatus(hostStatusEl, `✅ Loaded: ${item.label}`, 'ok');
      },
      onDelete: async (item) => {
        // Delete from R2 via Worker API
        const quizKey = item.raw.key;
        await fetch(`${base}/api/quizzes/${quizKey}`, { method: 'DELETE' });
        setStatus(hostStatusEl, `Deleted from Cloud: ${item.label}`, 'ok');
      },
      highlightId: null,
    });
  } catch (err) {
    setStatus(hostStatusEl, `Cloud load failed: ${err.message}`, 'bad');
  }
}


// Save quiz to Cloud (R2)
async function saveQuizToCloud() {
  try {
    syncQuizFromUI();
    await ensureQuizMediaReady({ contextLabel: 'cloud save', convertTtsToMp3: true, strictMediaCheck: true });
    const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';

    const quizId = quiz._r2QuizId || `quiz-${Date.now()}`;
    quiz._r2QuizId = quizId;
    quiz.title = quiz.title || 'Untitled Quiz';

    // Skip upload if quiz JSON hasn't changed since last cloud save
    const payload = JSON.stringify({ quiz, quizId });
    const payloadHash = hashStringInt(payload);
    if (quiz._lastCloudHash === payloadHash) {
      setStatus(hostStatusEl, `✅ Already saved: ${quiz.title || 'Quiz'} (no changes)`, 'ok');
      return;
    }

    setStatus(hostStatusEl, '☁️ Uploading quiz to cloud...', 'ok');

    // Upload quiz JSON to R2 (with title and questions for listing)
    const res = await fetch(`${base}/api/quizzes/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    quiz._lastCloudHash = payloadHash;

    setStatus(hostStatusEl, `✅ Saved: ${quiz.title || 'Quiz'} (PIN when playing)`, 'ok');
  } catch (err) {
    setStatus(hostStatusEl, `Cloud save failed: ${err.message}`, 'bad');
  }
}

async function exportCreationPrompt() {
  const theme = document.getElementById('promptTheme')?.value.trim();
  const lang = document.getElementById('promptLanguage')?.value.trim();
  const level = document.getElementById('promptLevel')?.value.trim();
  const timeLimit = document.getElementById('promptTimeLimit')?.value;
  const count = document.getElementById('promptQuestionCount')?.value;
  const images = document.getElementById('promptImages')?.value;
  const audio = document.getElementById('promptAudio')?.value;
  const video = document.getElementById('promptVideo')?.value;
  const goalEl = document.getElementById('promptGoal') instanceof HTMLSelectElement ? document.getElementById('promptGoal') : null;
  const customGoalEl = document.getElementById('promptGoalCustom') instanceof HTMLTextAreaElement ? document.getElementById('promptGoalCustom') : null;
  const goal = goalEl?.value;
  const goalText = goalEl?.options[goalEl.selectedIndex]?.text;
  const customGoalText = customGoalEl?.value.trim();

  if (!theme) {
    alert('Please enter a theme for the quiz!');
    return;
  }

  // Create clean request object (no blank fields)
  const cleanRequest = { theme };
  if (lang) cleanRequest.language = lang;
  if (level) cleanRequest.level = level;
  if (timeLimit) cleanRequest.timeLimit = Number(timeLimit);
  if (count) cleanRequest.questionCount = Number(count);
  cleanRequest.images = images;
  cleanRequest.audio = audio;
  cleanRequest.video = video;

  if (goal === 'custom') {
    if (!customGoalText) {
      alert('Please enter a custom pedagogical goal before generating the prompt.');
      customGoalEl?.focus();
      return;
    }
    cleanRequest.goal = customGoalText;
  } else if (goalText) {
    cleanRequest.goal = goalText;
  }

  const typesMode = document.getElementById('promptTypesMode')?.value;
  const selectedTypes = Array.from(document.querySelectorAll('#promptTypesList input:checked'))
    .map(cb => cb.value)
    .filter((type) => CANONICAL_QUESTION_TYPES.includes(type));
  const allowedTypes = CANONICAL_QUESTION_TYPES.filter((type) => {
    if (typesMode === 'include' && selectedTypes.length) return selectedTypes.includes(type);
    if (typesMode === 'exclude' && selectedTypes.length) return !selectedTypes.includes(type);
    return true;
  });

  if (typesMode === 'ai_choice') {
    cleanRequest.questionTypeSelection = 'ai_choice';
  } else if (typesMode === 'include' && selectedTypes.length > 0) {
    cleanRequest.includeQuestionTypes = selectedTypes;
  } else if (typesMode === 'exclude' && selectedTypes.length > 0) {
    cleanRequest.excludeQuestionTypes = selectedTypes;
  }

  const textualSummary = Object.entries(cleanRequest)
    .map(([k, v]) => Array.isArray(v) ? `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v.join(', ')}` : `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
    .join('\n');

  const templateAllowedTypes = allowedTypes.filter((type) => TEMPLATE_QUESTION_TYPES.includes(type));
  const filteredTemplateQuestions = TEMPLATE_ALL_13_TYPES.questions
    .filter((q) => templateAllowedTypes.includes(q.type))
    .map((q) => {
      const clone = JSON.parse(JSON.stringify(q));
      if (!supportsQuestionAudio(clone.type)) return clone;

      clone.audioMode = clone.audioMode === 'file' ? 'file' : 'tts';
      if (clone.audioMode === 'tts') {
        clone.audioData = '';
        clone.audioText = String(clone.audioText || clone.prompt || '').slice(0, 1200);
        const questionTtsLanguage = normalizeTtsLanguage(clone.ttsLanguage || TEMPLATE_ALL_13_TYPES.ttsLanguage);
        clone.ttsLanguage = questionTtsLanguage;
        if (questionTtsLanguage === 'OTHER') {
          clone.language = String(clone.language || TEMPLATE_ALL_13_TYPES.language || EDGE_TTS_LANGUAGE_DEFAULTS.OTHER).trim();
        } else {
          delete clone.language;
        }
      }
      return clone;
    });
  const relevantTypeExplanations = Object.fromEntries(
    allowedTypes
      .filter((type) => QUESTION_TYPE_EXPLANATIONS[type])
      .map((type) => [type, JSON.parse(JSON.stringify(QUESTION_TYPE_EXPLANATIONS[type]))])
  );
  const typeUseCases = Object.fromEntries(
    allowedTypes
      .filter((type) => QUESTION_TYPE_EXPLANATIONS[type])
      .map((type) => [type, (QUESTION_TYPE_EXPLANATIONS[type].pedagogicalUses || []).slice(0, 2)])
  );

  const featureGuides = {
    imageKeyword: cleanRequest.images === 'some'
      ? "Use a specific 2-5 word visual target. Keep imageData empty."
      : undefined,
    videoKeyword: cleanRequest.video === 'some'
      ? "When video:'some', you MUST provide videoKeyword (2-7 words) as the primary signal for auto-search; videoProviderPreference:'youtube'|'vimeo'|'direct' is optional. Do NOT include media.url unless the user explicitly asks for a fixed/manual URL."
      : undefined,
    audioMode: cleanRequest.audio === 'some'
      ? "For TTS questions include audioMode:'tts', audioText, question-level ttsLanguage, and question-level language when ttsLanguage:'OTHER'. Keep audioData empty."
      : undefined,
    videoEmbed: cleanRequest.video === 'some'
      ? "Strict exception path: use media.url only for user-supplied or manually verified links. Default to keyword-first flow with videoKeyword for auto-add."
      : undefined,
    readAllQuestionsAloud: cleanRequest.audio === 'some'
      ? "Set true only when broad accessibility/listening repetition is desired."
      : undefined
  };

  const audioPedagogicalUse = cleanRequest.audio === 'some' ? {
    role: "Audio is a modality/strategy, not a question type.",
    usage: [
      "Listening comprehension (prompt text = [Listening...], audioText = transcript)",
      "Spelling/Dictation (prompt text = Spell this word, audioText = the word)",
      "Speaking triggers (audioText provides the target phrase to say)"
    ],
    implementation: "Apply audio fields (audioMode: 'tts', audioText: '...') to existing supported question types."
  } : undefined;

  const allowedTypesText = allowedTypes.join(', ');
  const blockedTypesText = CANONICAL_QUESTION_TYPES.filter((type) => !allowedTypes.includes(type)).join(', ');
  const questionTypesRule = typesMode === 'ai_choice'
    ? `Choose the question types that best fit the quiz goals and theme from the available types: ${allowedTypesText}. Vary types for engagement and pedagogical effectiveness.`
    : `Use only allowed question types: ${allowedTypesText}.`;
  const mustFollowRules = [
    'Return valid PinPlay JSON version 3.',
    questionTypesRule,
    'Do NOT emit "type": "audio" or create an "audio" question-type category.',
    'Use imageData as "" (never base64 in generated output).',
    cleanRequest.audio === 'some'
      ? 'For generated audio use audioMode:"tts", audioData:"", meaningful audioText, and always include question-level ttsLanguage.'
      : 'Do not add question audio fields unless required by request.',
    cleanRequest.audio === 'some'
      ? 'If question ttsLanguage is "OTHER", question language must be an exact Edge voice ID (format like "xx-XX-NameNeural").'
      : undefined,
    cleanRequest.audio === 'some'
      ? 'For mixed-language quizzes, set ttsLanguage per question (and language only for OTHER) instead of relying only on quiz-level defaults.'
      : undefined,
    cleanRequest.images === 'no' ? 'Do NOT include imageKeyword or imageData.' : 'Keep imageData empty.',
    cleanRequest.video === 'some'
      ? 'If both imageKeyword and videoKeyword are present, video takes precedence and image can be cleared when video is auto-filled.'
      : undefined,
    cleanRequest.video === 'some'
      ? 'Prefer videoKeyword over explicit media.url.'
      : undefined,
    cleanRequest.video === 'some'
      ? 'Do not invent or guess YouTube/Vimeo URLs.'
      : undefined,
    cleanRequest.video === 'some'
      ? 'If both videoKeyword and media.url are present, keep videoKeyword as source of truth unless the user explicitly asked for a fixed link.'
      : undefined,
    cleanRequest.video === 'no' ? 'Do NOT include media object or video URLs.' : 'Use media object for video only when pedagogically relevant.',
    'Do not repeat request fields verbatim inside the output JSON.'
  ];
  const normalizedMustFollowRules = mustFollowRules.filter(Boolean);
  if (blockedTypesText) {
    mustFollowRules.push(`Do NOT use blocked types: ${blockedTypesText}.`);
  }
  const outputContract = [
    'Output only one JSON object.',
    'Follow exampleTemplate key shapes.',
    'Keep ids stable and unique.',
    'Prefer short, clear prompt text and concise answer choices.',
    'TTS shape: { audioMode:"tts", audioText:"...", ttsLanguage:"EN|CA|FR|OTHER|NONE", language:"xx-XX-NameNeural" only when ttsLanguage is "OTHER" }.',
    'For videos, prefer keyword auto-add flow (videoKeyword) so generated quizzes stay resilient to link rot.'
  ];
  const qualityGoals = [
    `Prioritize: ${cleanRequest.goal || 'balanced scaffold + retrieval practice'}.`,
    'Use pedagogically meaningful distractors and progression.',
    'Keep language level aligned to request.',
    'Avoid redundant narration and filler text.'
  ];

  const promptText = [
    'Task',
    textualSummary,
    '',
    'Must-follow rules',
    normalizedMustFollowRules.map((r, i) => `${i + 1}. ${r}`).join('\n'),
    '',
    'Output contract',
    outputContract.map((r, i) => `${i + 1}. ${r}`).join('\n'),
    '',
    'Quality goals',
    qualityGoals.map((r, i) => `${i + 1}. ${r}`).join('\n')
  ].join('\n').trim();

  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      type: "PinPlay Creation Prompt",
      version: "3.4"
    },
    request: cleanRequest,
    promptIntent: "Generate one valid PinPlay v3 quiz JSON from request constraints only.",
    context: {
      allowedQuestionTypes: allowedTypes,
      typeExplanations: relevantTypeExplanations,
      typeUseCases,
      featureGuides: Object.fromEntries(Object.entries(featureGuides).filter(([, value]) => !!value)),
      audioPedagogicalUse
    },
    exampleTemplate: {
      ...TEMPLATE_ALL_13_TYPES,
      questions: filteredTemplateQuestions
    }
  };

  const CONTEXT_BUDGET = 22000;
  if (JSON.stringify(exportData).length > CONTEXT_BUDGET && exportData.context?.typeExplanations) {
    Object.keys(exportData.context.typeExplanations).forEach((type) => {
      const info = exportData.context.typeExplanations[type];
      if (!info) return;
      info.pedagogicalUses = (info.pedagogicalUses || []).slice(0, 1);
      info.differentiationTips = (info.differentiationTips || []).slice(0, 1);
      info.commonPitfalls = (info.commonPitfalls || []).slice(0, 1);
      if (typeof info.ttsStrategy === 'string') info.ttsStrategy = info.ttsStrategy.slice(0, 120);
      if (typeof info.rules === 'string') info.rules = info.rules.slice(0, 180);
    });
  }
  if (JSON.stringify(exportData).length > CONTEXT_BUDGET) {
    delete exportData.context.typeExplanations;
  }
  if (JSON.stringify(exportData).length > CONTEXT_BUDGET) {
    delete exportData.context.typeUseCases;
  }

  try {
    await navigator.clipboard.writeText(promptText);
    if (promptStatusEl) {
      promptStatusEl.textContent = 'Prompt copied! 📋';
      promptStatusEl.className = 'small ok';
      setTimeout(() => { if (promptStatusEl) promptStatusEl.textContent = ''; }, 4000);
    }
  } catch (err) {
    if (promptStatusEl) {
      promptStatusEl.textContent = 'Copied failed, but JSON exported.';
      promptStatusEl.className = 'small bad';
    }
  }

  const filename = `prompt-${toSafeFilename(theme)}.json`;
  downloadJson(exportData, filename);
}

async function customPasswordPrompt(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.backdropFilter = 'blur(3px)';

    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'var(--panel-bg, #fff)';
    dialog.style.color = 'var(--text, #333)';
    dialog.style.padding = '24px';
    dialog.style.borderRadius = 'var(--radius, 12px)';
    dialog.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
    dialog.style.minWidth = '320px';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.gap = '16px';
    dialog.style.fontFamily = 'var(--font-sans, system-ui, sans-serif)';

    const msgEl = document.createElement('div');
    msgEl.textContent = message;
    msgEl.style.fontWeight = '500';
    msgEl.style.fontSize = '16px';

    const input = document.createElement('input');
    input.type = 'password';
    input.style.padding = '10px 14px';
    input.style.border = '1px solid var(--border-color, #ccc)';
    input.style.borderRadius = 'var(--radius, 8px)';
    input.style.fontSize = '16px';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.outline = 'none';

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn';
    cancelBtn.style.backgroundColor = 'transparent';
    cancelBtn.style.color = 'var(--text, #333)';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.className = 'btn';

    btnRow.append(cancelBtn, okBtn);
    dialog.append(msgEl, input, btnRow);
    overlay.append(dialog);
    document.body.append(overlay);

    setTimeout(() => input.focus(), 10);

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    const submit = () => {
      cleanup();
      resolve(input.value);
    };

    const cancel = () => {
      cleanup();
      resolve(null);
    };

    okBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', cancel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cancel();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') cancel();
    });
  });
}

// ---------- Live mode ----------
function bindLiveEvents() {
  if (createLiveBtn) createLiveBtn.addEventListener('click', createLiveGame);
  if (hostApplyBuilderBtn) hostApplyBuilderBtn.addEventListener('click', hostApplyBuilderToLive);
  if (hostRefreshBtn) hostRefreshBtn.addEventListener('click', pollHostState);
  if (hostAttemptsRefreshBtn) hostAttemptsRefreshBtn.addEventListener('click', () => fetchHostAttempts({ force: true }));
  if (hostAttemptsExportBtn) hostAttemptsExportBtn.addEventListener('click', exportHostAttemptsCsv);
  if (hostAttemptsClassFilterEl) hostAttemptsClassFilterEl.addEventListener('change', () => renderHostAttemptsSnapshot(live.host.attemptsCache));
  if (hostAttemptsSearchEl) hostAttemptsSearchEl.addEventListener('input', () => renderHostAttemptsSnapshot(live.host.attemptsCache));
  if (hostStartBtn) hostStartBtn.addEventListener('click', hostStartGame);
  if (hostPrevBtn) hostPrevBtn.addEventListener('click', hostPrevQuestion);
  if (hostNextBtn) hostNextBtn.addEventListener('click', hostNextQuestion);
  if (hostJoinBtn) hostJoinBtn.addEventListener('click', joinLiveGameAsHostByPin);
  if (assignmentInstantFeedbackBtn) assignmentInstantFeedbackBtn.addEventListener('click', toggleInstantFeedbackMode);
  if (createAssignmentBtn) createAssignmentBtn.addEventListener('click', createAssignmentFromCurrentQuiz);
  if (refreshAssignmentsBtn) refreshAssignmentsBtn.addEventListener('click', refreshAssignmentsList);
  if (assignmentSelfCheckBtn) assignmentSelfCheckBtn.addEventListener('click', runAssignmentSelfCheck);
  if (assignmentResultsFilterEl) assignmentResultsFilterEl.addEventListener('change', () => {
    if (assignmentResultsCache?.code && assignmentResultsCache?.data) {
      renderAssignmentResults(assignmentResultsCache.code, assignmentResultsCache.data);
    }
  });
  if (hostJoinPinEl) {
    hostJoinPinEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinLiveGameAsHostByPin();
    });
  }

  if (hostPlayersEl) {
    hostPlayersEl.addEventListener('click', (e) => {
      const renameBtn = e.target.closest('[data-rename-player]');
      if (renameBtn) {
        renamePlayer(renameBtn.dataset.renamePlayer, renameBtn.dataset.currentName || '');
        return;
      }

      const adjustBtn = e.target.closest('[data-adjust-player]');
      if (adjustBtn) {
        adjustPlayerScore(adjustBtn.dataset.adjustPlayer, adjustBtn.dataset.currentName || '');
        return;
      }

      const btn = e.target.closest('[data-kick-player]');
      if (!btn) return;
      kickPlayer(btn.dataset.kickPlayer);
    });
  }

  if (projectorFullscreenBtn) {
    projectorFullscreenBtn.addEventListener('click', toggleProjectorFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenButtonLabel);
    syncFullscreenButtonLabel();
  }
  document.addEventListener('fullscreenchange', () => {
    if (!joinSubmitBtn) return;
    if (isQuestionMediaFullscreenActive()) {
      joinSubmitBtn.disabled = true;
      setStatus(joinStatusEl, 'Exit fullscreen to answer.', 'bad');
    }
  });

  if (joinBtn) joinBtn.addEventListener('click', joinLiveGame);
  if (joinSubmitBtn) joinSubmitBtn.addEventListener('click', submitLiveAnswer);

  if (previewUnifiedBtn) previewUnifiedBtn.addEventListener('click', () => startPreviewMode());

  const studentPreviewBtn = document.getElementById('studentPreviewBtn');
  if (studentPreviewBtn) studentPreviewBtn.addEventListener('click', () => launchStudentPreviewAssignment());

  if (previewRerollBtn) {
    previewRerollBtn.addEventListener('click', () => {
      if (!previewMode.active) return;
      previewMode.simNames = randomPreviewNames(14);
      previewMode.simClassSeed = Date.now();
      previewMode.simTeacherByQ = {};
      renderPreviewFrame();
      setStatus(hostStatusEl, 'Unified preview class re-rolled (local grading reset).', 'ok');
    });
  }
  if (previewResimBtn) {
    previewResimBtn.addEventListener('click', () => {
      if (!previewMode.active) return;
      previewMode.simClassSeed = Date.now();
      const qKey = String(Number(previewMode.index || 0));
      delete previewMode.simTeacherByQ[qKey];
      renderPreviewFrame();
      setStatus(hostStatusEl, 'Unified preview current question re-simulated.', 'ok');
    });
  }
  const jumpPreviewQuestion = () => {
    if (!previewMode.active) return;
    const total = Number(quiz?.questions?.length || 0);
    if (!total) return;
    const wanted = Number(previewJumpInputEl?.value || 1);
    const idx = Math.max(0, Math.min(total - 1, (Number.isFinite(wanted) ? wanted : 1) - 1));
    previewMode.index = idx;
    renderPreviewFrame();
    setStatus(hostStatusEl, `Unified preview jumped to Q${idx + 1}.`, 'ok');
  };
  if (previewJumpBtn) previewJumpBtn.addEventListener('click', jumpPreviewQuestion);
  if (previewJumpInputEl) {
    previewJumpInputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      jumpPreviewQuestion();
    });
  }
  if (previewExitBtn) previewExitBtn.addEventListener('click', stopPreviewMode);

  if (randomNamesToggleEl) {
    randomNamesToggleEl.addEventListener('click', hostUpdateRandomNames);
  }

  document.addEventListener('keydown', handleHostHotkeys);

  // Click anywhere to close the scoreboard
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('projectorScoreboardSection');
    if (modal && modal.classList.contains('visible')) {
      stopRankingAnimationMode();
    }
  });
}

async function createLiveGame() {
  try {
    syncQuizFromUI();

    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    await ensureQuizMediaReady({ contextLabel: 'create live game', convertTtsToMp3: true, strictMediaCheck: true });
    const payload = normalizeQuizForLive(quiz);
    const data = await api('/api/create', {
      method: 'POST',
      body: {
        quiz: payload,
        options: {
          randomNames: isRandomNamesEnabled(),
        },
      },
    });

    live.host.pin = data.pin;
    live.host.token = data.hostToken;
    live.host.lastPhase = null;
    live.host.lastIndex = null;
    live.host.lastResponseCount = 0;
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.state = null;
    live.host.attemptsCache = null;
    live.host.attemptsFetchedAt = 0;
    live.host.isPrimaryAudioHost = true;

    stopFx('answering');
    if (livePinEl) livePinEl.textContent = data.pin;
    if (livePinBigEl) livePinBigEl.textContent = data.pin;
    if (livePinHudEl) livePinHudEl.textContent = data.pin;

    // --- NEW: Update QR Code ---
    const qrEl = document.querySelector('.hall-qr');
    if (qrEl && data.pin) {
      const joinUrl = `https://audiophrases.github.io/pinplay/?pin=${data.pin}`;
      qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`;
    }

    // --- NEW: Auto-expand and scroll to the Live Screen section ---
    if (liveScreenSectionToggleEl && liveScreenCardBodyEl) {
      setSectionCollapsed(liveScreenSectionToggleEl, liveScreenCardBodyEl, false);
      liveScreenSectionToggleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setStatus(hostStatusEl, 'Live game created. Share the PIN with students.', 'ok');

    startHostPolling();
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function copyTextSmart(text) {
  const value = String(text || '');
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement('input');
    input.value = value;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    input.remove();
    return !!ok;
  }
}

async function gradeAssignmentQuestion(code, attemptId, qIndex, points, correction = '', correctionAudioKey = '') {
  if (!createSessionPassword) throw new Error('Teacher password missing in session. Unlock again if needed.');
  await api('/api/assignments/grade', {
    method: 'POST',
    body: {
      password: createSessionPassword,
      code,
      attemptId,
      qIndex,
      points,
      correction,
      correctionAudioKey,
    },
  });
}

async function reopenAssignmentAttempt(code, attemptId) {
  if (!createSessionPassword) throw new Error('Teacher password missing in session. Unlock again if needed.');
  await api('/api/assignments/reopen-attempt', {
    method: 'POST',
    body: {
      password: createSessionPassword,
      code,
      attemptId,
    },
  });
}

async function setAssignmentActive(code, active) {
  if (!createSessionPassword) throw new Error('Teacher password missing in session. Unlock again if needed.');
  await api('/api/assignments/toggle-active', {
    method: 'POST',
    body: {
      password: createSessionPassword,
      code,
      active: !!active,
    },
  });
}

async function runAssignmentSelfCheck() {
  const startedAt = Date.now();
  const steps = [];
  const mark = (name, ok, info = '') => {
    steps.push(`${ok ? '✅' : '❌'} ${name}${info ? ` — ${info}` : ''}`);
  };

  try {
    if (!createSessionPassword) {
      const typed = await customPasswordPrompt('Teacher password (needed once for assignment API):');
      if (typed == null) return;
      createSessionPassword = String(typed || '');
    }
    if (!createSessionPassword) throw new Error('Teacher password is required.');

    if (assignmentSelfCheckBtn) assignmentSelfCheckBtn.disabled = true;
    if (assignmentStatusEl) assignmentStatusEl.textContent = 'Running assignment self-check...';

    const quiz = {
      title: 'SelfCheck Quiz',
      questions: [
        {
          id: 'selfcheck_q1',
          type: 'mcq',
          prompt: 'Self-check: select B',
          answers: ['A', 'B', 'C'],
          correctAnswer: 1,
          points: 1000,
          timeLimit: 0,
          isPoll: false,
        },
      ],
    };

    const created = await api('/api/assignments/create', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        title: `SelfCheck ${new Date().toISOString()}`,
        className: 'SELFTEST',
        attemptsLimit: 2,
        dueAt: null,
        quiz,
      },
    });
    const code = String(created?.assignment?.code || '').trim();
    if (!code) throw new Error('Create returned no code.');
    mark('Create assignment', true, code);

    await api(`/api/assignment/get?code=${encodeURIComponent(code)}`, { method: 'GET' });
    mark('Fetch assignment by code', true);

    const started = await api('/api/assignment/start', {
      method: 'POST',
      body: {
        code,
        studentKey: 'selfcheck_student',
        studentName: 'SelfCheck Student',
      },
    });
    const attemptId = String(started?.attempt?.id || '').trim();
    if (!attemptId) throw new Error('Start returned no attemptId.');
    mark('Start attempt', true, attemptId);

    await api('/api/assignment/answer', {
      method: 'POST',
      body: {
        code,
        attemptId,
        qIndex: 0,
        answer: 1,
      },
    });
    mark('Save answer', true);

    await api('/api/assignment/submit', {
      method: 'POST',
      body: { code, attemptId },
    });
    mark('Submit attempt', true);

    const results = await api('/api/assignments/results', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        feedbackMode: assignmentFeedbackMode,
        code,
      },
    });
    const hasAttempt = Array.isArray(results?.attempts) && results.attempts.some((a) => String(a?.id || '') === attemptId);
    if (!hasAttempt) throw new Error('Attempt not found in teacher results.');
    mark('Teacher results include attempt', true);

    await api('/api/assignments/reopen-attempt', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        feedbackMode: assignmentFeedbackMode,
        code,
        attemptId,
      },
    });
    mark('Reopen attempt', true);

    await api('/api/assignments/toggle-active', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        feedbackMode: assignmentFeedbackMode,
        code,
        active: false,
      },
    });
    mark('Close assignment', true);

    await api('/api/assignments/toggle-active', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        feedbackMode: assignmentFeedbackMode,
        code,
        active: true,
      },
    });
    mark('Reopen assignment', true);

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    if (assignmentStatusEl) {
      assignmentStatusEl.textContent = `Self-check passed in ${elapsed}s\n${steps.join('\n')}`;
    }

    await refreshAssignmentsList();
  } catch (err) {
    mark('Self-check failed', false, String(err?.message || err));
    if (assignmentStatusEl) assignmentStatusEl.textContent = steps.join('\n');
  } finally {
    if (assignmentSelfCheckBtn) assignmentSelfCheckBtn.disabled = false;
  }
}

async function fetchAssignmentAttemptDetail(code, attemptId) {
  try {
    const safeCode = String(code || '').trim().toUpperCase();
    const safeAttemptId = String(attemptId || '').trim();
    if (!safeCode || !safeAttemptId) throw new Error('Missing code/attemptId.');
    if (!createSessionPassword) throw new Error('Teacher password missing in session. Unlock again if needed.');

    if (assignmentGradingSummaryEl) assignmentGradingSummaryEl.textContent = `Loading grading detail for ${safeAttemptId}...`;
    if (assignmentGradingListEl) assignmentGradingListEl.innerHTML = '';

    const data = await api('/api/assignments/attempt', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        code: safeCode,
        attemptId: safeAttemptId,
      },
    });

    const items = Array.isArray(data?.gradingItems) ? data.gradingItems : [];
    if (assignmentGradingSummaryEl) assignmentGradingSummaryEl.textContent = `Grading ${safeAttemptId} · Items: ${items.length}`;
    if (!assignmentGradingListEl) return;

    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'No submitted answers yet.';
      assignmentGradingListEl.appendChild(li);
      return;
    }

    items.forEach((it) => {
      const li = document.createElement('li');

      const head = document.createElement('div');
      head.innerHTML = `<strong>Q${Number(it?.qIndex || 0) + 1} · ${escapeHtml(String(it?.qType || 'question'))}</strong>`;

      const prompt = document.createElement('div');
      prompt.className = 'small muted';
      prompt.textContent = String(it?.prompt || '').slice(0, 220);

      const answer = document.createElement('div');
      answer.className = 'small';

      // Voice record: show audio player instead of text
      if (String(it?.qType || '') === 'voice_record' && it?.answer && typeof it.answer === 'object' && it.answer.audioUrl) {
        const audioWrap = document.createElement('div');
        audioWrap.className = 'top-space';
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        let audioSrc = it.answer.audioUrl;
        if (!audioSrc.startsWith('http') && !audioSrc.startsWith('data:')) {
          const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
          audioSrc = `${base}/api/media/${audioSrc}`;
        }
        audio.src = audioSrc;
        audioWrap.appendChild(audio);
        if (it.answer.durationMs) {
          const dur = document.createElement('span');
          dur.className = 'small muted';
          dur.textContent = ` (${Math.round(it.answer.durationMs / 1000)}s)`;
          audioWrap.appendChild(dur);
        }
        answer.textContent = 'Answer: 🎙️ Voice recording';
        li.append(head, prompt, answer, audioWrap);
      } else {
        answer.textContent = `Answer: ${String(it?.answerText || '') || '(blank)'}`;
        li.append(head, prompt, answer);
      }
      if (it?.teacherGraded) {
        const row = document.createElement('div');
        row.className = 'row gap top-space';

        const pointsInput = document.createElement('input');
        pointsInput.type = 'number';
        pointsInput.min = '0';
        pointsInput.max = String(Number(it?.maxPoints || 1000));
        pointsInput.value = String(Number(it?.grade?.pointsAwarded || 0));
        pointsInput.style.width = '90px';

        const correctionInput = document.createElement('input');
        correctionInput.type = 'text';
        correctionInput.placeholder = 'Correction (optional)';
        correctionInput.value = String(it?.grade?.correction || '');
        correctionInput.style.maxWidth = '320px';

        let currentAudioKey = String(it?.grade?.correctionAudioKey || '');
        const audioStatus = document.createElement('span');
        audioStatus.className = 'small muted';
        audioStatus.style.marginLeft = '8px';

        const recordBtn = document.createElement('button');
        recordBtn.className = 'btn';
        recordBtn.style.padding = '4px 8px';
        recordBtn.innerHTML = '🎙️';
        recordBtn.title = 'Record voice comment';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn';
        saveBtn.textContent = it?.grade?.graded ? 'Update grade' : 'Save grade';

        let mediaRecorder = null;
        let audioChunks = [];

        recordBtn.addEventListener('click', async () => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            recordBtn.innerHTML = '🎙️';
            recordBtn.classList.remove('bad');
            return;
          }

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
            
            mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = async () => {
              const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
              stream.getTracks().forEach(t => t.stop());
              
              // Upload
              try {
                audioStatus.textContent = 'Uploading...';
                const ext = blob.type.includes('mp4') ? '.mp4' : '.webm';
                const fileName = `correction_${Date.now()}${ext}`;
                const formData = new FormData();
                formData.append('file', blob, fileName);
                formData.append('path', `voice_records/${fileName}`);

                const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
                const resp = await fetch(`${base}/api/media/upload`, { method: 'POST', body: formData });
                if (!resp.ok) throw new Error('Upload failed');
                const res = await resp.json();
                currentAudioKey = res.path || res.key || '';
                audioStatus.textContent = '🎙️ Recorded';
                renderAudioPreview();
              } catch (err) {
                audioStatus.textContent = '❌ Upload failed';
              }
            };

            mediaRecorder.start();
            recordBtn.innerHTML = '⏹️';
            recordBtn.classList.add('bad');
            audioStatus.textContent = 'Recording...';
          } catch (err) {
            alert('Mic access denied or error: ' + err.message);
          }
        });

        const previewWrap = document.createElement('div');
        previewWrap.className = 'top-space';
        previewWrap.style.display = 'none';

        function renderAudioPreview() {
          if (!currentAudioKey) {
            previewWrap.style.display = 'none';
            return;
          }
          previewWrap.innerHTML = '';
          previewWrap.style.display = 'block';
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.style.height = '30px';
          let src = currentAudioKey;
          if (!src.startsWith('http')) {
            const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
            src = `${base}/api/media/${src}`;
          }
          audio.src = src;
          previewWrap.appendChild(audio);
        }
        renderAudioPreview();

        saveBtn.addEventListener('click', async () => {
          try {
            saveBtn.disabled = true;
            await gradeAssignmentQuestion(safeCode, safeAttemptId, Number(it.qIndex || 0), Number(pointsInput.value || 0), String(correctionInput.value || ''), currentAudioKey);
            if (assignmentStatusEl) assignmentStatusEl.textContent = `Graded Q${Number(it.qIndex || 0) + 1} for ${safeAttemptId}.`;
            await fetchAssignmentResults(safeCode);
            await fetchAssignmentAttemptDetail(safeCode, safeAttemptId);
          } catch (err) {
            if (assignmentStatusEl) assignmentStatusEl.textContent = `Grade error: ${err.message}`;
          } finally {
            saveBtn.disabled = false;
          }
        });

        row.append(pointsInput, correctionInput, recordBtn, saveBtn, audioStatus);
        li.appendChild(row);
        li.appendChild(previewWrap);
      }

      assignmentGradingListEl.appendChild(li);
    });
  } catch (err) {
    if (assignmentGradingSummaryEl) assignmentGradingSummaryEl.textContent = `Grading error: ${err.message}`;
  }
}

function renderAssignmentResults(safeCode, data) {
  const assignment = data?.assignment || {};
  const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
  const filter = String(assignmentResultsFilterEl?.value || 'all');

  const filtered = attempts.filter((a) => {
    if (filter === 'submitted') return !!a?.submitted;
    if (filter === 'pending') return Number(a?.metrics?.pendingTeacherGradeCount || 0) > 0;
    return true;
  });

  if (assignmentResultsSummaryEl) {
    assignmentResultsSummaryEl.textContent = `${assignment?.title || safeCode} · Showing ${filtered.length}/${attempts.length} attempts`;
  }

  if (!assignmentResultsListEl) return;
  assignmentResultsListEl.innerHTML = '';
  if (!filtered.length) {
    const li = document.createElement('li');
    li.textContent = attempts.length ? 'No attempts match current filter.' : 'No attempts yet.';
    assignmentResultsListEl.appendChild(li);
    return;
  }

  filtered.forEach((a) => {
    const li = document.createElement('li');
    const totalScore = Number(a?.metrics?.totalScore ?? a?.metrics?.autoScore ?? 0);
    const top = document.createElement('div');
    const checked = a?.reviewedAt ? `<span style="background: #3b82f6; color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.7rem; font-weight: bold; margin-left: 8px; vertical-align: middle;" title="Student has reviewed feedback">REVIEWED</span>` : '';
    top.innerHTML = `<strong>${escapeHtml(String(a?.studentName || 'Student'))}</strong>${checked} · ${totalScore} pts`;

    const meta = document.createElement('div');
    meta.className = 'small muted';
    const answered = Number(a?.metrics?.answeredCount || 0);
    const pending = Number(a?.metrics?.pendingTeacherGradeCount || 0);
    const total = Number(a?.metrics?.totalQuestions || 0);
    const acc = Number.isFinite(Number(a?.metrics?.accuracy)) ? `${Number(a.metrics.accuracy)}%` : '—';
    meta.textContent = `Answered: ${answered}/${total} · Pending teacher: ${pending} · Accuracy: ${acc}`;

    const row = document.createElement('div');
    row.className = 'row gap top-space';
    const attemptId = String(a?.id || '');

    const gradeBtn = document.createElement('button');
    gradeBtn.className = 'btn';
    gradeBtn.textContent = 'Open grading';
    gradeBtn.addEventListener('click', () => fetchAssignmentAttemptDetail(safeCode, attemptId));
    row.appendChild(gradeBtn);

    if (a?.submitted) {
      const reopenBtn = document.createElement('button');
      reopenBtn.className = 'btn';
      reopenBtn.textContent = 'Reopen attempt';
      reopenBtn.addEventListener('click', async () => {
        try {
          reopenBtn.disabled = true;
          await reopenAssignmentAttempt(safeCode, attemptId);
          if (assignmentStatusEl) assignmentStatusEl.textContent = `Reopened attempt ${attemptId}.`;
          await fetchAssignmentResults(safeCode);
        } catch (err) {
          if (assignmentStatusEl) assignmentStatusEl.textContent = `Reopen error: ${err.message}`;
        } finally {
          reopenBtn.disabled = false;
        }
      });
      row.appendChild(reopenBtn);
    }

    li.append(top, meta, row);
    assignmentResultsListEl.appendChild(li);
  });
}

async function fetchAssignmentResults(code) {
  try {
    const safeCode = String(code || '').trim().toUpperCase();
    if (!safeCode) throw new Error('Assignment code required.');
    if (!createSessionPassword) throw new Error('Teacher password missing in session. Unlock again if needed.');

    if (assignmentResultsSummaryEl) assignmentResultsSummaryEl.textContent = `Loading results for ${safeCode}...`;
    if (assignmentResultsListEl) assignmentResultsListEl.innerHTML = '';

    const data = await api('/api/assignments/results', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        code: safeCode,
      },
    });

    assignmentResultsCache = { code: safeCode, data };
    renderAssignmentResults(safeCode, data);
  } catch (err) {
    if (assignmentResultsSummaryEl) assignmentResultsSummaryEl.textContent = `Results error: ${err.message}`;
  }
}

async function refreshAssignmentsList() {
  try {
    if (!createSessionPassword) {
      const typed = await customPasswordPrompt('Teacher password (needed once for assignment API):');
      if (typed == null) return;
      createSessionPassword = String(typed || '');
    }
    if (!createSessionPassword) throw new Error('Teacher password is required.');

    if (refreshAssignmentsBtn) refreshAssignmentsBtn.disabled = true;
    assignmentResultsCache = null;
    if (assignmentListEl) assignmentListEl.innerHTML = '';
    if (assignmentGradingListEl) assignmentGradingListEl.innerHTML = '';
    if (assignmentGradingSummaryEl) assignmentGradingSummaryEl.textContent = 'Open an attempt to grade teacher-graded answers.';

    const data = await api('/api/assignments/list', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        limit: 50,
      },
    });

    const list = Array.isArray(data?.assignments) ? data.assignments : [];
    if (!assignmentListEl) return;
    if (!list.length) {
      const li = document.createElement('li');
      li.textContent = 'No assignments yet.';
      assignmentListEl.appendChild(li);
      return;
    }

    const base = String(window.location.href || '').replace(/\/create\/?(?:index\.html)?(?:\?.*)?(?:#.*)?$/i, '/');
    list.forEach((a) => {
      const code = String(a?.code || '').trim();
      const link = `${base}?assignment=${encodeURIComponent(code)}`;
      const li = document.createElement('li');

      const title = document.createElement('div');
      title.innerHTML = `<strong>${escapeHtml(String(a?.title || 'Assignment'))}</strong> · ${escapeHtml(code)} · ${Number(a?.totalQuestions || 0)}q`;

      const meta = document.createElement('div');
      meta.className = 'small muted';
      const dueAt = Number(a?.dueAt || 0);
      const dueText = dueAt ? new Date(dueAt).toLocaleString() : 'No due date';
      const attemptsText = Number(a?.attemptsLimit) === 0 ? 'Unlimited' : String(Number(a?.attemptsLimit || 1));
      meta.textContent = `${String(a?.className || '').trim() || 'All classes'} · Attempts ${attemptsText} · ${dueText}`;

      const row = document.createElement('div');
      row.className = 'row gap top-space';

      const copyCodeBtn = document.createElement('button');
      copyCodeBtn.className = 'btn';
      copyCodeBtn.textContent = 'Copy code';
      copyCodeBtn.addEventListener('click', async () => {
        const ok = await copyTextSmart(code);
        if (assignmentStatusEl) assignmentStatusEl.textContent = ok ? `Copied code: ${code}` : 'Copy failed';
      });

      const copyLinkBtn = document.createElement('button');
      copyLinkBtn.className = 'btn';
      copyLinkBtn.textContent = 'Copy link';
      copyLinkBtn.addEventListener('click', async () => {
        const ok = await copyTextSmart(link);
        if (assignmentStatusEl) assignmentStatusEl.textContent = ok ? `Copied link for ${code}` : 'Copy failed';
      });

      const viewResultsBtn = document.createElement('button');
      viewResultsBtn.className = 'btn';
      viewResultsBtn.textContent = 'View results';
      viewResultsBtn.addEventListener('click', () => {
        fetchAssignmentResults(code);
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn';
      toggleBtn.textContent = a?.active ? 'Close assignment' : 'Reopen assignment';
      toggleBtn.addEventListener('click', async () => {
        try {
          toggleBtn.disabled = true;
          await setAssignmentActive(code, !a?.active);
          if (assignmentStatusEl) assignmentStatusEl.textContent = !a?.active
            ? `Assignment ${code} reopened.`
            : `Assignment ${code} closed.`;
          await refreshAssignmentsList();
        } catch (err) {
          if (assignmentStatusEl) assignmentStatusEl.textContent = `Toggle error: ${err.message}`;
        } finally {
          toggleBtn.disabled = false;
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Delete assignment ${code}? This cannot be undone.`)) return;
        try {
          deleteBtn.disabled = true;
          await api('/api/assignments/delete', {
            method: 'POST',
            body: {
              password: createSessionPassword,
              feedbackMode: assignmentFeedbackMode,
              code,
            },
          });
          if (assignmentStatusEl) assignmentStatusEl.textContent = `Assignment ${code} deleted.`;
          await refreshAssignmentsList();
        } catch (err) {
          if (assignmentStatusEl) assignmentStatusEl.textContent = `Delete error: ${err.message}`;
        } finally {
          deleteBtn.disabled = false;
        }
      });

      row.append(copyCodeBtn, copyLinkBtn, viewResultsBtn, toggleBtn, deleteBtn);
      li.append(title, meta, row);
      assignmentListEl.appendChild(li);
    });
  } catch (err) {
    if (assignmentStatusEl) assignmentStatusEl.textContent = `Assignment list error: ${err.message}`;
  } finally {
    if (refreshAssignmentsBtn) refreshAssignmentsBtn.disabled = false;
  }
}

async function toggleInstantFeedbackMode() {
  // Cycle through three modes: none → instant → end → none
  const modes = ['none', 'instant', 'end'];
  const currentIndex = modes.indexOf(assignmentFeedbackMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  assignmentFeedbackMode = modes[nextIndex];

  if (assignmentInstantFeedbackBtn) {
    const modeLabels = {
      'none': 'No feedback',
      'instant': 'Instant feedback',
      'end': 'End feedback'
    };
    assignmentInstantFeedbackBtn.textContent = modeLabels[assignmentFeedbackMode];
    assignmentInstantFeedbackBtn.classList.toggle('active', assignmentFeedbackMode !== 'none');
    assignmentInstantFeedbackBtn.setAttribute('aria-pressed', assignmentFeedbackMode !== 'none' ? 'true' : 'false');
  }
}


async function createAssignmentFromCurrentQuiz() {
  try {
    syncQuizFromUI();
    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    // Snapshot the current shared login/random-names toggle immediately on click.
    // The same control is also synced by live polling, so we should not re-read it
    // after async work and accidentally create the assignment with the wrong mode.
    const randomNamesEnabled = isRandomNamesEnabled();

    await ensureQuizMediaReady({ contextLabel: 'create assignment', convertTtsToMp3: true, strictMediaCheck: true });

    if (!createSessionPassword) {
      const typed = await customPasswordPrompt('Teacher password (needed once for assignment API):');
      if (typed == null) return;
      createSessionPassword = String(typed || '');
    }
    if (!createSessionPassword) throw new Error('Teacher password is required.');

    // 0 = unlimited (assignment stays open until teacher closes)
    const attemptsLimitRaw = Number(assignmentAttemptsEl?.value || 1);
    const attemptsLimit = attemptsLimitRaw === 0 ? 0 : Math.max(1, Math.min(10, attemptsLimitRaw));
    const className = String(assignmentClassEl?.value || '').trim();

    let dueAt = null;
    const dueText = String(assignmentDueAtEl?.value || '').trim();
    if (dueText) {
      const t = new Date(dueText).getTime();
      if (Number.isFinite(t) && t > 0) dueAt = Math.round(t);
    }

    const data = await api('/api/assignments/create', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        title: quiz.title,
        className,
        attemptsLimit,
        dueAt,
        randomNames: randomNamesEnabled,
        feedbackMode: assignmentFeedbackMode,
        quiz: normalizeQuizForLive(quiz),
      },
    });

    const code = String(data?.assignment?.code || '').trim();
    const base = String(window.location.href || '').replace(/\/create\/?(?:index\.html)?(?:\?.*)?(?:#.*)?$/i, '/');
    const link = `${base}?assignment=${encodeURIComponent(code)}`;
    const modeLabel = randomNamesEnabled ? 'Random names' : 'Login validation';
    const msg = `Assignment created ✅ Code: ${code}${className ? ` · Class: ${className}` : ''} · ${modeLabel}`;

    if (assignmentStatusEl) assignmentStatusEl.textContent = `${msg} · Link: ${link}`;
    setStatus(hostStatusEl, msg, 'ok');
    await refreshAssignmentsList();
  } catch (err) {
    if (assignmentStatusEl) assignmentStatusEl.textContent = `Assignment error: ${err.message}`;
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostStartGame() {
  try {
    ensureHostReady();
    await api('/api/host/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostApplyBuilderToLive() {
  try {
    ensureHostReady();
    syncQuizFromUI();
    const payload = normalizeQuizForLive(quiz);

    await api('/api/host/quiz/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin, quiz: payload },
    });

    setStatus(hostStatusEl, 'Live game updated from builder ✅', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function joinLiveGameAsHostByPin() {
  try {
    const pin = String(hostJoinPinEl?.value || '').trim();
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

    const data = await api('/api/host/join', {
      method: 'POST',
      body: { pin },
    });

    live.host.pin = data.pin;
    live.host.token = data.hostToken;
    live.host.lastPhase = null;
    live.host.lastIndex = null;
    live.host.lastResponseCount = 0;
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.state = null;
    live.host.attemptsCache = null;
    live.host.attemptsFetchedAt = 0;
    live.host.isPrimaryAudioHost = false;

    if (livePinEl) livePinEl.textContent = data.pin;
    if (livePinBigEl) livePinBigEl.textContent = data.pin;
    if (livePinHudEl) livePinHudEl.textContent = data.pin;

    // --- NEW: Update QR Code ---
    const qrEl = document.querySelector('.hall-qr');
    if (qrEl && data.pin) {
      const joinUrl = `https://audiophrases.github.io/pinplay/?pin=${data.pin}`;
      qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`;
    }

    // --- NEW: Auto-expand and scroll to the Live Screen section ---
    if (liveScreenSectionToggleEl && liveScreenCardBodyEl) {
      setSectionCollapsed(liveScreenSectionToggleEl, liveScreenCardBodyEl, false);
      liveScreenSectionToggleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setStatus(hostStatusEl, 'Joined as host by PIN. Controls are live.', 'ok');

    startHostPolling();
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

function cancelRankingAnimationFrame() {
  if (live.host.rankingAnimRafId != null) {
    cancelAnimationFrame(live.host.rankingAnimRafId);
    live.host.rankingAnimRafId = null;
  }
}

function scheduleRankingAnimationFrame() {
  if (live.host.rankingAnimRafId != null) return;
  live.host.rankingAnimRafId = requestAnimationFrame(() => {
    live.host.rankingAnimRafId = null;
    if (!live.host.rankingMode) return;
    renderHostState(live.host.state || {});
  });
}

function startRankingAnimationMode() {
  cancelRankingAnimationFrame();

  const state = live.host.state;
  if (!state || !Array.isArray(state.players) || !state.players.length) return;

  const toMap = {};
  state.players.forEach((p) => { toMap[p.id] = Number(p.score || 0); });

  const fromMap = {};
  state.players.forEach((p) => {
    const prev = Number(live.host.lastScoresByPlayer?.[p.id]);
    const end = Number(toMap[p.id] || 0);
    if (!Number.isFinite(prev) || prev === end) {
      fromMap[p.id] = 0;
    } else {
      fromMap[p.id] = prev;
    }
  });

  live.host.rankingAnimFrom = fromMap;
  live.host.rankingAnimTo = toMap;
  live.host.rankingAnimStartAt = Date.now();
  live.host.rankingMode = true;
  playFx('counter');

  // ✅ SHOW MODAL
  const modal = document.getElementById('projectorScoreboardSection');
  if (modal) modal.classList.add('visible');

  renderHostState(state);
}

function stopRankingAnimationMode() {
  live.host.rankingMode = false;
  cancelRankingAnimationFrame();
  stopFx('counter');

  // ✅ HIDE MODAL
  const modal = document.getElementById('projectorScoreboardSection');
  if (modal) modal.classList.remove('visible');

  if (live.host.state) renderHostState(live.host.state);
}

async function hostNextQuestion() {
  if (live.host.rankingMode) {
    stopRankingAnimationMode();
  }

  if (previewMode.active) {
    previewMode.index = Math.min(quiz.questions.length - 1, previewMode.index + 1);
    previewMode.showReveal = false;
    previewMode.answeredCurrent = false;
    previewMode.revealedResult = null;
    renderPreviewFrame();
    return;
  }

  try {
    ensureHostReady();
    await api('/api/host/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostPrevQuestion() {
  if (live.host.rankingMode) {
    stopRankingAnimationMode();
    return;
  }

  if (previewMode.active) {
    previewMode.index = Math.max(0, previewMode.index - 1);
    previewMode.showReveal = false;
    previewMode.answeredCurrent = false;
    previewMode.revealedResult = null;
    renderPreviewFrame();
    return;
  }

  try {
    ensureHostReady();
    await api('/api/host/prev', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostRevealQuestion() {
  if (previewMode.active) {
    previewMode.showReveal = !previewMode.showReveal;
    renderPreviewFrame();
    return;
  }

  try {
    ensureHostReady();
    await api('/api/host/reveal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

function isRandomNamesEnabled() {
  // UI active state means Login required, so random names is the inverse.
  return !randomNamesToggleEl?.classList.contains('active');
}

function setRandomNamesToggleState(enabled) {
  if (!randomNamesToggleEl) return;
  const loginRequired = !enabled;
  randomNamesToggleEl.classList.toggle('active', !!loginRequired);
  randomNamesToggleEl.textContent = 'Login';
  randomNamesToggleEl.title = loginRequired ? 'Login required (username + password)' : 'Random names assigned';
}

async function hostUpdateRandomNames() {
  if (!randomNamesToggleEl) return;
  const prev = isRandomNamesEnabled();
  const next = !prev;
  setRandomNamesToggleState(next);

  try {
    if (!live.host.pin || !live.host.token) return;
    await api('/api/host/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        randomNames: next,
      },
    });
    await pollHostState();
  } catch (err) {
    setRandomNamesToggleState(prev);
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

function shouldIgnoreHostHotkey(e) {
  if (!createWorkspace || createWorkspace.classList.contains('hidden')) return true;

  const el = e.target;
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (el.isContentEditable) return true;
  return ['input', 'textarea', 'select'].includes(tag);
}

function handleHostHotkeys(e) {
  const hotkeyTarget = e.target;
  const hotkeyTag = String(hotkeyTarget?.tagName || '').toLowerCase();
  const isEditableHotkeyTarget = !!hotkeyTarget?.isContentEditable || ['input', 'textarea', 'select'].includes(hotkeyTag);
  if (!isEditableHotkeyTarget && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault();
    runManualMediaCheck();
    return;
  }

  if (shouldIgnoreHostHotkey(e)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'l' || e.key === 'L') {
    e.preventDefault();
    createLiveGame();
    return;
  }

  if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    openLocalLibraryDialog();
    return;
  }

  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    openQuizFromDrive();
    return;
  }

  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    hostStartGame();
    return;
  }

  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    hostApplyBuilderToLive();
    return;
  }

  const modal = document.getElementById('projectorScoreboardSection');

  // If modal is visible and ANY key is pressed (except 'r'), close it.
  if (modal && modal.classList.contains('visible') && e.key !== 'r' && e.key !== 'R') {
    stopRankingAnimationMode();
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    if (modal && modal.classList.contains('visible')) {
      stopRankingAnimationMode();
    } else {
      startRankingAnimationMode();
    }
    return;
  }

  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    toggleTeacherSectionCollapseAll();
    return;
  }

  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    const q = live.host.state?.question;
    if (q && hasQuestionAudio(q)) {
      playQuestionAudio(q).then(() => {
        const s = live.host.state;
        if (s && s.phase === 'question' && !s.questionClosed && !live.host.hostVideoPlaying) {
          resumeFx('answering');
        }
      }).catch(() => {
        if (!live.host.hostVideoPlaying) resumeFx('answering');
      });
    }
    return;
  }

  if (previewMode.active) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      hostNextQuestion();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      hostPrevQuestion();
      return;
    }
  }

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleProjectorFullscreen();
    return;
  }

  const state = live.host.state;
  if (!state) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    hostPrevQuestion();
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    hostNextQuestion();
    return;
  }

  if (e.key === ' ' || e.code === 'Space') {
    if (state.phase !== 'question' || state.questionClosed) return;
    e.preventDefault();
    hostRevealQuestion();
  }
}

async function kickPlayer(playerId) {
  try {
    if (!playerId) return;
    ensureHostReady();
    await api('/api/host/kick', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });
    setStatus(hostStatusEl, 'Player removed.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function renamePlayer(playerId, currentName = '') {
  try {
    if (!playerId) return;
    ensureHostReady();

    const next = prompt('New student name:', String(currentName || '').trim());
    if (next == null) return;

    const name = String(next || '').trim();
    if (!name) throw new Error('Name cannot be empty.');

    await api('/api/host/rename', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        name,
      },
    });

    setStatus(hostStatusEl, `Renamed to ${name}.`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function adjustPlayerScore(playerId, currentName = '') {
  try {
    if (!playerId) return;
    ensureHostReady();

    const raw = prompt(`Adjust score for ${currentName || 'student'} (use + or -, e.g. +1000, -500):`, '+1000');
    if (raw == null) return;

    const delta = Number(String(raw).trim());
    if (!Number.isFinite(delta) || delta === 0) throw new Error('Please enter a non-zero number.');

    await api('/api/host/adjust-score', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        delta,
      },
    });

    setStatus(hostStatusEl, `Score adjusted (${delta > 0 ? '+' : ''}${Math.round(delta)}).`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function gradeOpenAnswer(playerId, points) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      const max = Number(live.host.state?.question?.points || 1000);
      const value = Number(points);
      const safePoints = Math.max(0, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)));
      setPreviewTeacherPatch(previewMode.index, playerId, {
        graded: true,
        pointsAwarded: safePoints,
      });
      setStatus(hostStatusEl, `Preview grade applied: ${safePoints} pts.`, 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    const max = Number(live.host.state?.question?.points || 1000);
    const value = Number(points);
    if (!Number.isFinite(value)) throw new Error('Points must be a number.');
    const safePoints = Math.max(0, Math.min(max, Math.round(value)));

    await api('/api/host/grade-open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        points: safePoints,
      },
    });

    setStatus(hostStatusEl, `Open answer graded: ${safePoints} pts.`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostHidePollResponse(playerId) {
  try {
    if (!playerId) return;
    ensureHostReady();

    await api('/api/host/poll/hide', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });

    setStatus(hostStatusEl, 'Poll response hidden (moved to Other).', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostHideOpenResponse(playerId) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      setPreviewTeacherPatch(previewMode.index, playerId, { hidden: true });
      setStatus(hostStatusEl, 'Preview hide applied.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    await api('/api/host/open/hide', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });

    setStatus(hostStatusEl, 'Open response hidden.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostSetOpenCorrection(playerId, currentText = '', studentAnswer = '') {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      const seed = String(currentText || '').trim() || String(studentAnswer || '').trim();
      const text = prompt('Preview correction/feedback for student:', seed);
      if (text == null) return;
      setPreviewTeacherPatch(previewMode.index, playerId, { correction: String(text || '').slice(0, 280) });
      setStatus(hostStatusEl, 'Preview correction saved.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    const seed = String(currentText || '').trim() || String(studentAnswer || '').trim();
    const text = prompt('Correction/feedback for student:', seed);
    if (text == null) return;

    await api('/api/host/open/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        correction: String(text || '').slice(0, 280),
      },
    });

    setStatus(hostStatusEl, 'Correction saved.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostToggleModelAnswer(playerId, nextValue) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      setPreviewTeacherPatch(previewMode.index, playerId, { modelAnswer: !!nextValue });
      setStatus(hostStatusEl, nextValue ? 'Preview: marked model answer.' : 'Preview: unmarked model answer.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    await api('/api/host/open/model', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        modelAnswer: !!nextValue,
      },
    });

    setStatus(hostStatusEl, nextValue ? 'Marked as model answer.' : 'Removed from model answers.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function pollHostState() {
  if (!live.host.pin || !live.host.token) return;
  try {
    const data = await api(`/api/host/state?pin=${encodeURIComponent(live.host.pin)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${live.host.token}` },
    });
    renderHostState(data);
    fetchHostAttempts({ force: false });
  } catch (err) {
    setStatus(hostStatusEl, `Host poll failed: ${err.message}`, 'bad');
    stopHostPolling();
  }
}

function formatHistoryAnswer(entry) {
  if (!entry) return '(no answer)';
  if (Array.isArray(entry.answerText)) return entry.answerText.join(' | ');
  return String(entry.answerText || '(no answer)');
}

function renderHostAnswerHistory(state) {
  if (!hostAnswerHistoryEl) return;
  hostAnswerHistoryEl.innerHTML = '';

  const blocks = Array.isArray(state?.answerHistory) ? state.answerHistory : [];
  if (!blocks.length) {
    const li = document.createElement('li');
    li.textContent = 'No answers yet.';
    hostAnswerHistoryEl.appendChild(li);
    return;
  }

  blocks.forEach((block) => {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.className = 'small';
    title.innerHTML = `<strong>Q${Number(block.qIndex) + 1}</strong> - ${escapeHtml(String(block.prompt || '').slice(0, 90) || '(no prompt)')}`;
    li.appendChild(title);

    const entries = Array.isArray(block.entries) ? block.entries : [];
    if (!entries.length) {
      const muted = document.createElement('div');
      muted.className = 'small muted';
      muted.textContent = 'No submissions on this question.';
      li.appendChild(muted);
    } else {
      const sub = document.createElement('ul');
      sub.className = 'list';
      entries.forEach((entry) => {
        const row = document.createElement('li');
        const verdict = entry.graded ? (entry.correct ? '✅' : '❌') : '⏳';
        const line = document.createElement('div');
        line.textContent = `${entry.name}: ${formatHistoryAnswer(entry)} ${verdict}${entry.graded ? ` (${Number(entry.pointsAwarded || 0)} pts)` : ''}`;
        row.appendChild(line);

        const currentQ = state?.question || null;
        if (currentQ?.type === 'voice_record' && entry.answer && entry.answer.audioUrl) {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.preload = 'metadata';
          audio.style.display = 'block';
          audio.style.marginTop = '.4rem';
          audio.style.marginBottom = '.4rem';
          audio.style.width = '100%';
          audio.style.maxWidth = '400px';
          let audioSrc = entry.answer.audioUrl;
          if (!audioSrc.startsWith('http')) audioSrc = (loadBackendUrl() || '') + '/' + audioSrc;
          audio.src = audioSrc;
          row.appendChild(audio);
        }

        const isCurrent = Number(block.qIndex) === Number(state?.currentIndex);
        const teacherGradedCurrent = isCurrent && currentQ && (currentQ.type === 'open' || currentQ.type === 'image_open' || currentQ.type === 'speaking' || currentQ.type === 'voice_record' || (currentQ.type === 'text' && !(currentQ.accepted || []).filter((x) => String(x || '').trim()).length));

        if (teacherGradedCurrent) {
          const actions = document.createElement('div');
          actions.className = 'row gap top-space';

          const maxPoints = Number(currentQ?.points || 1000);

          const gradeBtn = document.createElement('button');
          gradeBtn.className = 'btn';
          gradeBtn.textContent = `+${maxPoints}`;
          gradeBtn.title = `Award full points (${maxPoints})`;
          gradeBtn.addEventListener('click', () => gradeOpenAnswer(entry.playerId, maxPoints));

          const zeroBtn = document.createElement('button');
          zeroBtn.className = 'btn';
          zeroBtn.textContent = '0';
          zeroBtn.title = 'Set 0 points';
          zeroBtn.addEventListener('click', () => gradeOpenAnswer(entry.playerId, 0));

          const corrBtn = document.createElement('button');
          corrBtn.className = 'btn';
          corrBtn.textContent = entry.correction ? 'Edit correction' : 'Add correction';
          corrBtn.addEventListener('click', () => hostSetOpenCorrection(entry.playerId, entry.correction || '', formatHistoryAnswer(entry)));

          const modelBtn = document.createElement('button');
          modelBtn.className = 'btn';
          modelBtn.textContent = entry.modelAnswer ? 'Unshow model' : 'Show as model';
          modelBtn.addEventListener('click', () => hostToggleModelAnswer(entry.playerId, !entry.modelAnswer));

          const hideBtn = document.createElement('button');
          hideBtn.className = 'btn';
          hideBtn.textContent = 'Hide';
          hideBtn.addEventListener('click', () => hostHideOpenResponse(entry.playerId));

          actions.append(gradeBtn, zeroBtn, corrBtn, modelBtn, hideBtn);
          row.appendChild(actions);
        }

        sub.appendChild(row);
      });
      li.appendChild(sub);
    }

    hostAnswerHistoryEl.appendChild(li);
  });
}

function getFilteredHostAttempts(students) {
  const classFilter = String(hostAttemptsClassFilterEl?.value || '').trim().toLowerCase();
  const search = String(hostAttemptsSearchEl?.value || '').trim().toLowerCase();

  return (Array.isArray(students) ? students : []).filter((s) => {
    const cls = String(s.className || '').trim().toLowerCase();
    const name = String(s.username || s.displayName || '').trim().toLowerCase();
    const email = String(s.email || '').trim().toLowerCase();
    const classOk = !classFilter || cls === classFilter;
    const searchOk = !search || name.includes(search) || email.includes(search) || cls.includes(search);
    return classOk && searchOk;
  });
}

function renderHostAttemptsSnapshot(data) {
  const students = Array.isArray(data?.students) ? data.students : [];
  const quizTitle = String(data?.quiz?.title || '').trim() || '(untitled quiz)';

  if (hostAttemptsClassFilterEl) {
    const current = String(hostAttemptsClassFilterEl.value || '');
    const classes = [...new Set(students.map((s) => String(s.className || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    hostAttemptsClassFilterEl.innerHTML = '<option value="">All classes</option>';
    classes.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      hostAttemptsClassFilterEl.appendChild(opt);
    });
    if (current && classes.includes(current)) hostAttemptsClassFilterEl.value = current;
  }

  const filtered = getFilteredHostAttempts(students);

  if (hostAttemptsSummaryEl) {
    hostAttemptsSummaryEl.textContent = `Quiz: ${quizTitle} · Showing ${filtered.length}/${students.length} students`;
  }

  if (!hostAttemptsListEl) return;
  hostAttemptsListEl.innerHTML = '';

  if (!filtered.length) {
    const li = document.createElement('li');
    li.textContent = students.length ? 'No students match current filters.' : 'No student attempt data yet.';
    hostAttemptsListEl.appendChild(li);
    return;
  }

  filtered.forEach((s) => {
    const li = document.createElement('li');
    li.className = 'attempt-item';

    const name = String(s.username || s.displayName || 'Student').trim();
    const className = String(s.className || '').trim();
    const classSuffix = className ? ` (${className})` : '';
    const accuracyValue = Number(s.accuracy);
    const accuracy = Number.isFinite(accuracyValue) ? `${accuracyValue}%` : '—';
    const signal = Number.isFinite(accuracyValue)
      ? (accuracyValue >= 80 ? '🟢' : (accuracyValue >= 55 ? '🟡' : '🔴'))
      : '⚪';

    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'btn attempt-row-btn';
    top.innerHTML = `<strong>${escapeHtml(name)}${escapeHtml(classSuffix)}</strong> · ${Number(s.scoreCurrent || 0)} pts · ${signal} ${accuracy}`;

    const detail = document.createElement('div');
    detail.className = 'small muted';
    const answered = Number(s.answeredCount || 0);
    const graded = Number(s.autoGradedCount || 0) + Number(s.teacherGradedCount || 0);
    const pending = Number(s.pendingTeacherGradeCount || 0);
    detail.textContent = `Answered: ${answered} · Graded: ${graded} · Pending: ${pending} · Accuracy: ${accuracy}`;

    const more = document.createElement('div');
    more.className = 'small muted hidden';
    const email = String(s.email || '').trim() || '—';
    const lastAnswerAt = Number(s.lastAnswerAt || 0);
    const lastAnswerText = lastAnswerAt ? new Date(lastAnswerAt).toLocaleString() : '—';
    more.textContent = `Email: ${email} · Auto pts: ${Number(s.pointsAuto || 0)} · Teacher pts: ${Number(s.pointsTeacher || 0)} · Last answer: ${lastAnswerText} · Events: ${Number(s.eventCount || 0)}`;

    top.addEventListener('click', () => {
      more.classList.toggle('hidden');
    });

    li.append(top, detail, more);
    hostAttemptsListEl.appendChild(li);
  });
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function exportHostAttemptsCsv() {
  const data = live.host.attemptsCache;
  const students = Array.isArray(data?.students) ? data.students : [];
  const filtered = getFilteredHostAttempts(students);
  if (!filtered.length) {
    setStatus(hostStatusEl, 'No rows to export for current filters.', 'bad');
    return;
  }

  const header = [
    'studentKey', 'username', 'className', 'email',
    'scoreCurrent', 'answeredCount', 'autoGradedCount', 'teacherGradedCount',
    'pendingTeacherGradeCount', 'correctCount', 'accuracy', 'pointsAuto', 'pointsTeacher', 'lastAnswerAt',
  ];

  const lines = [header.join(',')];
  filtered.forEach((s) => {
    const row = [
      s.studentKey, s.username || s.displayName || '', s.className || '', s.email || '',
      Number(s.scoreCurrent || 0), Number(s.answeredCount || 0), Number(s.autoGradedCount || 0), Number(s.teacherGradedCount || 0),
      Number(s.pendingTeacherGradeCount || 0), Number(s.correctCount || 0), Number(s.accuracy ?? ''), Number(s.pointsAuto || 0), Number(s.pointsTeacher || 0),
      Number(s.lastAnswerAt || 0) ? new Date(Number(s.lastAnswerAt)).toISOString() : '',
    ];
    lines.push(row.map(csvEscape).join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safePin = String(live.host.pin || 'pinplay').replace(/[^a-z0-9_-]/gi, '');
  a.href = url;
  a.download = `pinplay-attempts-${safePin}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus(hostStatusEl, `CSV exported (${filtered.length} rows).`, 'ok');
}

async function fetchHostAttempts({ force = false } = {}) {
  if (!live.host.pin || !live.host.token) return;
  if (live.host.attemptsLoading) return;

  const now = Date.now();
  if (!force && live.host.attemptsFetchedAt && now - live.host.attemptsFetchedAt < 6000) return;

  live.host.attemptsLoading = true;
  if (hostAttemptsRefreshBtn) hostAttemptsRefreshBtn.disabled = true;

  try {
    const data = await api(`/api/host/attempts?pin=${encodeURIComponent(live.host.pin)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${live.host.token}` },
    });

    live.host.attemptsCache = data;
    live.host.attemptsFetchedAt = Date.now();
    renderHostAttemptsSnapshot(data);
  } catch (err) {
    if (hostAttemptsSummaryEl) hostAttemptsSummaryEl.textContent = `Attempt snapshot error: ${err.message}`;
  } finally {
    live.host.attemptsLoading = false;
    if (hostAttemptsRefreshBtn) hostAttemptsRefreshBtn.disabled = false;
  }
}

function scheduleHostAdaptiveFit() {
  if (live.host.adaptiveFitRaf) cancelAnimationFrame(live.host.adaptiveFitRaf);
  live.host.adaptiveFitRaf = requestAnimationFrame(() => {
    live.host.adaptiveFitRaf = null;
    applyAdaptiveFitHost();
  });
}

function applyAdaptiveFitHost() {
  if (!hostQuestionCardEl || !hostQuestionWrap) return;

  const active = !hostQuestionWrap.classList.contains('hidden')
    && !!live.host.state
    && (live.host.state.phase === 'question' || live.host.state.phase === 'results');

  hostQuestionCardEl.classList.toggle('adaptive-active', active);

  hostQuestionCardEl.classList.remove('fit-l1', 'fit-l2', 'fit-l3', 'fit-l4', 'overflow-risk');
  hostQuestionWrap.classList.remove('adaptive-scaled');
  hostQuestionWrap.style.removeProperty('--adaptive-scale');

  if (!active) {
    hostQuestionCardEl.style.removeProperty('max-height');
    return;
  }

  const rect = hostQuestionCardEl.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 900;
  const available = Math.max(240, Math.floor(viewportH - rect.top - 10));
  hostQuestionCardEl.style.maxHeight = `${available}px`;

  const isOverflowing = () => (
    hostQuestionCardEl.scrollHeight > hostQuestionCardEl.clientHeight + 2
    || hostQuestionCardEl.scrollWidth > hostQuestionCardEl.clientWidth + 2
  );

  if (!isOverflowing()) return;
  hostQuestionCardEl.classList.add('fit-l1');
  if (!isOverflowing()) return;
  hostQuestionCardEl.classList.add('fit-l2');
  if (!isOverflowing()) return;
  hostQuestionCardEl.classList.add('fit-l3');
  if (!isOverflowing()) return;
  hostQuestionCardEl.classList.add('fit-l4');
  if (!isOverflowing()) return;

  const contentH = Math.max(1, hostQuestionWrap.scrollHeight);
  const scale = Math.max(0.66, Math.min(1, (available - 8) / contentH));
  if (scale < 0.995) {
    hostQuestionWrap.classList.add('adaptive-scaled');
    hostQuestionWrap.style.setProperty('--adaptive-scale', scale.toFixed(3));
  }

  if (isOverflowing()) {
    hostQuestionCardEl.classList.add('overflow-risk');
    console.warn('[PinPlay][fit][host] Overflow risk remains', {
      qType: live.host.state?.question?.type || null,
      qPromptLen: String(live.host.state?.question?.prompt || '').length,
      scrollH: hostQuestionCardEl.scrollHeight,
      clientH: hostQuestionCardEl.clientHeight,
    });
  }
}

function renderHostState(state) {
  const prevState = live.host.state;
  // Keep a stable "previous question" score snapshot for R count-up.
  // Important: do not keep overwriting while already in results, otherwise from==to and animation looks static.
  if (prevState && Array.isArray(prevState.players) && state?.phase !== 'results') {
    const snap = {};
    prevState.players.forEach((p) => { snap[p.id] = Number(p.score || 0); });
    live.host.lastScoresByPlayer = snap;
  }
  live.host.state = state;

  const phaseChanged = live.host.lastPhase !== state.phase || live.host.lastIndex !== state.currentIndex;

  if (phaseChanged) {
    live.host.seenReactionKeys = new Set();
    if (liveReactionsEl) liveReactionsEl.innerHTML = '';
    if (projectorReactionsEl) projectorReactionsEl.innerHTML = '';
    // Moving to another phase/question must cut any ongoing question audio immediately.
    stopQuestionAudioPlayback();
    if (state.phase !== 'results') {
      live.host.finalRevealKey = null;
      live.host.finalRevealStartedAt = 0;
      live.host.finalRevealStagePlayed = { drumroll: false, final: false };
      stopFx('drumrollwinner');
    }
  }

  if (prevState && !prevState.questionClosed && state.questionClosed) {
    // Teacher revealed/closed current question: stop any still-playing clip.
    stopQuestionAudioPlayback();
  }

  if (livePhaseEl) livePhaseEl.textContent = state.phase;
  if (liveProgressEl) liveProgressEl.textContent = `${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (liveResponsesEl) liveResponsesEl.textContent = `${state.responseCount} / ${state.playerCount}`;
  renderReactionPop(state.reactions || []);
  if (livePinEl) livePinEl.textContent = state.pin || '-';
  if (livePinBigEl) {
    livePinBigEl.textContent = state.pin || '-';
    // --- NEW: Keep QR in sync with any PIN changes natively ---
    const qrEl = document.querySelector('.hall-qr');
    if (qrEl && state.pin) {
      const joinUrl = `https://audiophrases.github.io/pinplay/?pin=${state.pin}`;
      const expectedSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`;
      if (qrEl.src !== expectedSrc) qrEl.src = expectedSrc;
    }
  }
  if (livePinHudEl) livePinHudEl.textContent = state.pin || '-';

  if (projectorAnswersEl) projectorAnswersEl.textContent = `👥 Answers: ${state.responseCount} / ${state.playerCount}`;
  if (projectorProgressEl) projectorProgressEl.textContent = `❓ ${state.currentIndex + 1} / ${state.totalQuestions}`;
  if (projectorScoresEl) {
    const showScores = state.phase === 'results' || live.host.rankingMode;
    renderProjectorScores(showScores ? (state.players || []) : [], { animate: live.host.rankingMode });
  }

  if (randomNamesToggleEl && state.settings && typeof state.settings.randomNames === 'boolean') {
    setRandomNamesToggleState(!!state.settings.randomNames);
  }

  if (hostPlayersCountEl) hostPlayersCountEl.textContent = String(state.playerCount || 0);

  if (hostPlayersEl) {
    hostPlayersEl.innerHTML = '';

    let hostPlayersView = [...(state.players || [])];
    if (live.host.rankingMode) {
      const t = Date.now();
      const d = Math.max(200, Number(live.host.rankingAnimDurationMs || 2600));
      const elapsedMs = t - Number(live.host.rankingAnimStartAt || t);
      const p = Math.max(0, Math.min(1, elapsedMs / d));

      hostPlayersView = hostPlayersView.map((pl) => {
        const from = Number(live.host.rankingAnimFrom?.[pl.id] ?? pl.score ?? 0);
        const to = Number(live.host.rankingAnimTo?.[pl.id] ?? pl.score ?? 0);
        const score = computeCrazyCountScore(to, p, elapsedMs);
        return { ...pl, score, _from: from, _to: to };
      });

      const climbWindowMs = 1000;
      if (elapsedMs >= d - climbWindowMs) {
        hostPlayersView.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      } else {
        hostPlayersView.sort((a, b) => Number(b._from || 0) - Number(a._from || 0));
      }

      if (p < 1) {
        scheduleRankingAnimationFrame();
      } else {
        stopFx('counter');
      }
    }

    hostPlayersView.forEach((p) => {
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'row spread';

      const name = document.createElement('span');
      const classLabel = String(p?.identity?.className || '').trim();
      const userLabel = String(p?.identity?.username || '').trim();
      const idSuffix = classLabel ? ` (${classLabel})` : '';
      const userSuffix = userLabel && userLabel.trim().toLowerCase() !== String(p.name || '').trim().toLowerCase() ? ` · @${userLabel}` : '';
      name.textContent = `${p.name}${idSuffix}${userSuffix} - ${p.score} pts${p.answeredCurrent ? ' [answered]' : ''}`;

      const actions = document.createElement('div');
      actions.className = 'row gap';

      const rename = document.createElement('button');
      rename.className = 'btn';
      rename.dataset.renamePlayer = p.id;
      rename.dataset.currentName = p.name || '';
      rename.textContent = 'Rename';

      const points = document.createElement('button');
      points.className = 'btn';
      points.dataset.adjustPlayer = p.id;
      points.dataset.currentName = p.name || '';
      points.textContent = 'Points';

      const kick = document.createElement('button');
      kick.className = 'btn';
      kick.dataset.kickPlayer = p.id;
      kick.textContent = 'Remove';

      actions.append(rename, points, kick);
      row.append(name, actions);
      li.appendChild(row);
      hostPlayersEl.appendChild(li);
    });

    if (!state.players?.length) {
      const li = document.createElement('li');
      li.textContent = 'No students joined yet.';
      hostPlayersEl.appendChild(li);
    }
  }

  renderHostAnswerHistory(state);

  let actionHint = 'Game finished.';
  if (state.phase === 'lobby') {
    actionHint = 'Lobby open. Students can join with PIN.';
  } else if (state.phase === 'question') {
    if (state.questionClosed) {
      if (state.questionCloseReason === 'all_answered') actionHint = 'Everyone answered. Reveal shown.';
      else if (state.questionCloseReason === 'timeout') actionHint = 'Time up. Reveal shown.';
      else actionHint = 'Question closed. Reveal shown.';
    } else {
      actionHint = 'Question running.';
    }
  }

  setStatus(hostStatusEl, actionHint, 'ok');

  const openSig = Array.isArray(state.openResponses)
    ? state.openResponses
      .map((r) => `${r.playerId}:${r.modelAnswer ? 1 : 0}:${String(r.correction || '').trim()}`)
      .join('|')
    : '';
  const modelSig = Array.isArray(state.modelResponses)
    ? state.modelResponses
      .map((r) => `${r.playerId}:${String(r.correction || '').trim()}`)
      .join('|')
    : '';

  const questionRenderKey = [
    state.phase,
    state.currentIndex,
    state.questionClosed ? 1 : 0,
    state.questionClosedAt || 0,
    state.responseCount || 0,
    state.playerCount || 0,
    state.question?.type || '',
    state.question?.prompt || '',
    state.question?.isPoll ? 1 : 0,
    Array.isArray(state.openResponses) ? state.openResponses.length : 0,
    Array.isArray(state.pollResponses) ? state.pollResponses.length : 0,
    Array.isArray(state.modelResponses) ? state.modelResponses.length : 0,
    openSig,
    modelSig,
  ].join(':');

  if (live.host.lastQuestionRenderKey !== questionRenderKey) {
    renderHostQuestion(state);
    live.host.lastQuestionRenderKey = questionRenderKey;
  }

  updateHallScene(state);
  updateHostTimer(state);
  scheduleHostAdaptiveFit();

  if (phaseChanged && state.phase === 'question' && !state.questionClosed) {
    stopFx('answering');
    // If question has audio, prime the ambient but don't play it yet - it will resume after audio ends
    if (hasQuestionAudio(state.question) || normalizeQuestionMedia(state.question?.media).kind === 'video') {
      const qIndex = state.currentIndex;
      const answeringKey = `answering_q${Number.isFinite(qIndex) ? qIndex : 'preview'}`;
      primeAnsweringFx(answeringKey);
      stopFx('answering'); // Stop immediately so it doesn't play yet
    } else {
      playFx('answering');
    }
    animatePulse(hostQuestionWrap || hostCardEl || hallCardEl);
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
  }

  const revealKey =
    state.phase === 'question' && state.questionClosed
      ? `${state.currentIndex}:${state.questionClosedAt || 0}:${state.questionCloseReason || ''}`
      : null;

  if (state.phase !== 'question' || state.questionClosed) {
    stopFx('answering');
  }

  if (state.phase === 'results' && live.host.lastPhase !== 'results') {
    stopFx('answering');
    stopFx('answered');
    stopFx('final');
    stopFx('drumrollwinner');

    // ✅ AUTO-SHOW MODAL FOR FINAL RESULTS
    const modal = document.getElementById('projectorScoreboardSection');
    if (modal) modal.classList.add('visible');
  }

  if (state.phase !== 'results') {
    stopFx('final');
  }

  if (revealKey && live.host.lastRevealKey !== revealKey) {
    stopFx('answering');
    playFx('answered');
    live.host.lastRevealKey = revealKey;
  }

  const hasQuestionVideo = normalizeQuestionMedia(state.question?.media).kind === 'video';
  if (state.phase === 'question' && !state.questionClosed && (hasQuestionAudio(state.question) || hasQuestionVideo)) {
    const hostAudioKey = `${state.currentIndex}:${state.questionStartedAt || 0}`;
    if (live.host.lastHostAudioKey !== hostAudioKey) {
      if (live.host.pendingAutoAudioTimer) {
        clearTimeout(live.host.pendingAutoAudioTimer);
        live.host.pendingAutoAudioTimer = null;
      }
      live.host.pendingAutoAudioTimer = setTimeout(() => {
        const s = live.host.state;
        if (!s || s.phase !== 'question' || s.questionClosed) return;
        const answeringKey = `answering_q${Number.isFinite(s.currentIndex) ? s.currentIndex : 'preview'}`;
        runHostQuestionMediaSequence(s.question, answeringKey).catch(() => { if (!live.host.hostVideoPlaying) resumeFx('answering'); });
      }, 3000);
      live.host.lastHostAudioKey = hostAudioKey;
    }
  }

  if (state.phase !== 'question' || state.questionClosed) {
    if (live.host.pendingAutoAudioTimer) {
      clearTimeout(live.host.pendingAutoAudioTimer);
      live.host.pendingAutoAudioTimer = null;
    }
  }

  if (state.phase !== 'question') {
    live.host.lastHostAudioKey = null;
  }

  live.host.lastPhase = state.phase;
  live.host.lastIndex = state.currentIndex;
  live.host.lastResponseCount = state.responseCount;
}

function renderHostQuestion(state) {
  const phase = state.phase;
  const question = state.question;
  const showReveal = !!state.questionClosed && (phase === 'question' || phase === 'results');

  const applyProjectorLayoutMode = (active, q = null) => {
    if (!hostQuestionCardEl) return;
    hostQuestionCardEl.classList.toggle('projector-question-active', !!active);

    const qType = String(q?.type || '').trim();
    if (qType) hostQuestionCardEl.dataset.qtype = qType;
    else delete hostQuestionCardEl.dataset.qtype;

    hostQuestionCardEl.classList.toggle('has-image', !!q?.imageData);
    hostQuestionCardEl.classList.toggle('poll-mode', !!q?.isPoll);
  };

  const renderPollSummary = () => {
    const summary = state.pollSummary;
    if (!summary || !Array.isArray(summary.items) || !summary.items.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No poll answers submitted.';
      hostQuestionAnswersEl.appendChild(p);
      return;
    }

    const max = Math.max(1, ...summary.items.map((x) => Number(x.count || 0)));

    const textLikeTypes = new Set(['text', 'open', 'image_open', 'error_hunt', 'context_gap', 'match_pairs', 'puzzle']);
    const isTextLike = textLikeTypes.has(String(summary.type || ''));
    const mode = isTextLike ? String(live.host.pollViewMode || 'bar') : 'bar';

    if (isTextLike) {
      const toggle = document.createElement('div');
      toggle.className = 'row gap top-space';
      const barBtn = document.createElement('button');
      barBtn.type = 'button';
      barBtn.className = `btn ${mode === 'bar' ? 'active' : ''}`;
      barBtn.textContent = 'Bar view';
      barBtn.addEventListener('click', () => {
        live.host.pollViewMode = 'bar';
        renderHostQuestion(state);
      });

      const cloudBtn = document.createElement('button');
      cloudBtn.type = 'button';
      cloudBtn.className = `btn ${mode === 'cloud' ? 'active' : ''}`;
      cloudBtn.textContent = 'Cloud view';
      cloudBtn.addEventListener('click', () => {
        live.host.pollViewMode = 'cloud';
        renderHostQuestion(state);
      });

      toggle.append(barBtn, cloudBtn);
      hostQuestionAnswersEl.appendChild(toggle);
    }

    if (isTextLike && mode === 'cloud') {
      const cloud = document.createElement('div');
      cloud.className = 'poll-word-cloud';
      summary.items.slice(0, 20).forEach((item) => {
        const chip = document.createElement('span');
        chip.className = 'poll-word-chip';
        chip.textContent = String(item.label || '(blank)');
        const weight = Number(item.count || 0) / max;
        const size = Math.round(14 + weight * 20);
        chip.style.fontSize = `${size}px`;
        chip.title = `${item.count} vote(s)`;
        cloud.appendChild(chip);
      });
      hostQuestionAnswersEl.appendChild(cloud);
    }

    if (mode === 'bar') {
      const list = document.createElement('div');
      list.className = 'answers-grid';

      summary.items.slice(0, 15).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'answer-row';
        const label = document.createElement('span');
        label.textContent = String(item.label || '(blank)');
        const barWrap = document.createElement('div');
        barWrap.style.height = '10px';
        barWrap.style.borderRadius = '999px';
        barWrap.style.background = 'rgba(96,93,255,.14)';
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.borderRadius = '999px';
        bar.style.background = 'linear-gradient(90deg,#605dff,#8b5cf6)';
        bar.style.width = `${Math.max(6, (Number(item.count || 0) / max) * 100)}%`;
        barWrap.appendChild(bar);
        const count = document.createElement('strong');
        count.textContent = String(item.count || 0);
        row.append(label, barWrap, count);
        list.appendChild(row);
      });

      if (Number(summary.otherCount || 0) > 0) {
        const row = document.createElement('div');
        row.className = 'answer-row';
        const label = document.createElement('span');
        label.textContent = 'Other';
        const barWrap = document.createElement('div');
        barWrap.style.height = '10px';
        barWrap.style.borderRadius = '999px';
        barWrap.style.background = 'rgba(156,163,175,.2)';
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.borderRadius = '999px';
        bar.style.background = 'linear-gradient(90deg,#6b7280,#4b5563)';
        bar.style.width = `${Math.max(6, (Number(summary.otherCount || 0) / max) * 100)}%`;
        barWrap.appendChild(bar);
        const count = document.createElement('strong');
        count.textContent = String(summary.otherCount || 0);
        row.append(label, barWrap, count);
        list.appendChild(row);
      }

      hostQuestionAnswersEl.appendChild(list);
    }

    const raw = Array.isArray(state.pollResponses) ? state.pollResponses : [];
    if (raw.length) {
      const modTitle = document.createElement('p');
      modTitle.className = 'small top-space';
      modTitle.textContent = 'Moderation (host only):';
      hostQuestionAnswersEl.appendChild(modTitle);

      raw.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'row spread gap';
        row.style.border = '1px solid var(--line)';
        row.style.borderRadius = '.5rem';
        row.style.padding = '.35rem .45rem';

        const txt = document.createElement('span');
        txt.textContent = `${r.name}: ${formatPollAnswerForHost(r.answer)}`;

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = r.hidden ? 'Hidden' : 'Hide';
        btn.disabled = !!r.hidden;
        btn.addEventListener('click', () => hostHidePollResponse(r.playerId));

        row.append(txt, btn);
        hostQuestionAnswersEl.appendChild(row);
      });
    }
  };

  if (!hostQuestionWrap || !hostQuestionPromptEl || !hostQuestionAnswersEl || !hostQuestionHintEl) return;

  const appendBigReveal = (text) => {
    const value = String(text || '').trim();
    if (!value) return;
    const ans = document.createElement('div');
    ans.className = 'project-text-reveal';
    ans.textContent = value;
    hostQuestionAnswersEl.appendChild(ans);
  };

  if (phase === 'results') {
    applyProjectorLayoutMode(false, null);
    hostQuestionWrap.classList.remove('hidden');
    hostQuestionPromptEl.textContent = '🏁 Final ranking reveal';
    hostQuestionAnswersEl.innerHTML = '';
    hostQuestionHintEl.textContent = 'Final reveal mode.';
    return;
  }

  const inQuestionIntro = phase === 'question' && !showReveal;
  if (!inQuestionIntro) {
    hostQuestionCardEl?.classList.remove('intro-active');
    live.host.questionIntroKey = null;
    live.host.questionIntroStartedAt = 0;
    live.host.questionIntroDone = false;
  }

  if (!question) {
    applyProjectorLayoutMode(false, null);
    hostQuestionCardEl?.classList.remove('intro-active');
    hostQuestionWrap.classList.add('hidden');
    hostQuestionPromptEl.textContent = '';
    hostQuestionAnswersEl.innerHTML = '';
    hostQuestionHintEl.textContent = 'Question will appear here when game starts.';
    return;
  }

  hostQuestionWrap.classList.remove('hidden');
  applyProjectorLayoutMode(phase === 'question', question);
  const qIcon = iconForType(question.type);
  const qPrompt = question.prompt || '(No question text)';

  if (inQuestionIntro) {
    // Use index-only key for intro stability: some backends/relays may jitter questionStartedAt,
    // which can repeatedly reset the intro and leave the splash stuck forever.
    const introKey = `${state.currentIndex}`;
    if (live.host.questionIntroKey !== introKey) {
      live.host.questionIntroKey = introKey;
      live.host.questionIntroStartedAt = Date.now();
      live.host.questionIntroDone = false;
    }

    if (!live.host.questionIntroDone) {
      const elapsed = Date.now() - Number(live.host.questionIntroStartedAt || Date.now());
      if (elapsed < 1000) {
        hostQuestionCardEl?.classList.add('intro-active');
        hostQuestionWrap.classList.add('center-stage');
        hostQuestionPromptEl.textContent = '';
        hostQuestionHintEl.textContent = '';
        hostQuestionAnswersEl.innerHTML = '';

        const points = Number(question.points || 0).toLocaleString('en-US');
        const splash = document.createElement('div');
        splash.className = 'question-intro-points';
        splash.textContent = `🎯 ${points} points`;
        hostQuestionAnswersEl.appendChild(splash);
        requestAnimationFrame(() => {
          // Force one more render pass during intro even when host state payload is unchanged.
          live.host.lastQuestionRenderKey = null;
          renderHostState(live.host.state || {});
        });
        return;
      }

      if (elapsed < 2000) {
        hostQuestionCardEl?.classList.add('intro-active');
        hostQuestionWrap.classList.add('center-stage');
        hostQuestionPromptEl.textContent = qIcon ? `${qIcon} ${qPrompt}` : qPrompt;
        hostQuestionHintEl.textContent = '';
        hostQuestionAnswersEl.innerHTML = '';
        requestAnimationFrame(() => {
          // Force one more render pass during intro even when host state payload is unchanged.
          live.host.lastQuestionRenderKey = null;
          renderHostState(live.host.state || {});
        });
        return;
      }

      live.host.questionIntroDone = true;
    }
  }

  hostQuestionCardEl?.classList.remove('intro-active');
  hostQuestionWrap.classList.remove('center-stage');
  hostQuestionPromptEl.textContent = qIcon ? `${qIcon} ${qPrompt}` : qPrompt;
  hostQuestionAnswersEl.innerHTML = '';

  // Remove old audio buttons if any
  const oldAudioRow = hostQuestionPromptEl.parentNode?.querySelector('.audio-controls-row');
  if (oldAudioRow) oldAudioRow.remove();

  // Audio controls removed - use 'p' key to play instead

  const hostMediaCfg = toVideoEmbedConfig(question.media || {});
  const hasHostVideo = normalizeQuestionMedia(question.media).kind === 'video' && !!hostMediaCfg.src;
  const hasSharedImage = !hasHostVideo && question.type !== 'pin' && !!question.imageData;
  hostQuestionAnswersEl.classList.toggle('has-question-image', hasSharedImage);

  if (!hasHostVideo && question.type !== 'pin' && question.type !== 'image_open' && question.imageData) {
    const preview = document.createElement('div');
    preview.className = 'pin-preview question-image-preview';
    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Question image';
    img.dataset.zoomable = '1';
    preview.appendChild(img);
    hostQuestionAnswersEl.appendChild(preview);
  }

  const hostMedia = normalizeQuestionMedia(question.media);
  if (hostMedia.kind === 'video' && (hostMedia.url || hostMedia.embedUrl)) {
    const config = toVideoEmbedConfig(hostMedia);
    const wrap = document.createElement('div');
    wrap.className = 'top-space question-video-wrap';
    if (config.src) {
      if (config.provider === 'direct') {
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        video.src = config.src;
        video.className = 'question-video-el';
        video.addEventListener('play', () => {
          live.host.hostVideoPlaying = true;
          stopFx('answering');
        });
        video.addEventListener('pause', () => {
          live.host.hostVideoPlaying = false;
          const s = live.host.state;
          if (s && s.phase === 'question' && !s.questionClosed) resumeFx('answering');
        });
        video.addEventListener('ended', () => {
          live.host.hostVideoPlaying = false;
          const s = live.host.state;
          if (s && s.phase === 'question' && !s.questionClosed) resumeFx('answering');
        });
        wrap.appendChild(video);
      } else {
        const iframe = document.createElement('iframe');
        iframe.src = config.src;
        iframe.allowFullscreen = true;
        iframe.className = 'question-video-el';
        wrap.appendChild(iframe);
      }
    }
    hostQuestionAnswersEl.appendChild(wrap);
  }

  if (question.isPoll) {
    hostQuestionHintEl.textContent = showReveal ? 'Poll results (anonymous)' : 'Poll mode: no points, no correct answer.';
    if (showReveal) renderPollSummary();
    return;
  }

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const correctSet = new Set(Array.isArray(question.correctIndexes) ? question.correctIndexes : []);

    // Shuffle answer order for presentation (seeded Fisher-Yates for consistent order across host/student)
    const seed = Math.abs([...((question.prompt || '') + (question.id || ''))].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) || 1;
    const indices = (question.answers || []).map((_, i) => i);
    let sr = seed;
    for (let s = indices.length - 1; s > 0; s--) {
      sr = (sr * 16807) % 2147483647;
      const j = sr % (s + 1);
      [indices[s], indices[j]] = [indices[j], indices[s]];
    }

    indices.forEach((origIdx, displayNum) => {
      const a = question.answers[origIdx];
      const row = document.createElement('label');
      row.className = 'answer-row';
      if (showReveal && correctSet.has(origIdx)) row.classList.add('answer-row-correct');

      const txt = document.createElement('span');
      txt.textContent = a.text;

      row.append(txt);
      hostQuestionAnswersEl.appendChild(row);
    });



    hostQuestionHintEl.textContent = question.type === 'audio' ? 'Audio question.' : '';
    return;
  }

  const isTeacherGradedText = question.type === 'text' && !(question.accepted || []).filter((x) => String(x || '').trim()).length;

  if (question.type === 'text' && !isTeacherGradedText) {
    hostQuestionHintEl.textContent = showReveal ? '' : '';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'voice_record' || isTeacherGradedText) {
    hostQuestionHintEl.textContent = '';

    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      hostQuestionAnswersEl.appendChild(preview);
    }

    const models = Array.isArray(state.modelResponses) && state.modelResponses.length
      ? state.modelResponses
      : (Array.isArray(state.openResponses) ? state.openResponses.filter((r) => !!r.modelAnswer) : []);

    // Do not mirror model answers into projectorCorrectEl here.
    // Keep only the standard visible model list below (prevents duplicate model rendering).
    if (projectorCorrectEl) {
      projectorCorrectEl.textContent = '';
    }

    if (!models.length) return;

    // Fallback visible list (same behavior as the prior working state)
    models.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      const text = document.createElement('span');
      const corr = String(r.correction || '').trim();
      text.textContent = corr || `${r.answer}`;
      row.append(text);
      hostQuestionAnswersEl.appendChild(row);
    });
    return;
  }

  if (question.type === 'context_gap') {
    hostQuestionHintEl.textContent = '';
    if (showReveal) {
      let correct = String(state.correctAnswer || question.correctAnswer || '').trim();
      if (!correct) {
        const prompt = String(question.prompt || '').trim();
        const gaps = question.gaps || [];
        let gapIdx = 0;
        const markerRe = /(\_{2,}|\[\s*\])/g;
        correct = prompt.replace(markerRe, (match) => {
          const raw = gaps[gapIdx++] || '';
          const first = raw.split(',')[0].trim();
          return first || match;
        });
      }
      appendBigReveal(correct);
    }
    return;
  }

  if (question.type === 'match_pairs') {
    hostQuestionHintEl.textContent = '';
    const pairsWrap = document.createElement('div');
    pairsWrap.className = 'match-pairs-content-wrap';
    pairsWrap.style.width = '100%';
    if (!showReveal) {
      renderMatchPairsPreview(pairsWrap, question.leftItems || [], question.rightOptions || []);
    } else {
      renderMatchPairsReveal(pairsWrap, question.pairs || []);
    }
    hostQuestionAnswersEl.appendChild(pairsWrap);
    return;
  }

  if (question.type === 'error_hunt') {
    hostQuestionHintEl.textContent = '';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'puzzle') {
    hostQuestionHintEl.textContent = '';
    if (question.options?.length) {
      const bank = document.createElement('div');
      bank.className = 'row gap';
      bank.style.flexWrap = 'wrap';
      bank.style.justifyContent = 'center';

      question.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn puzzle-bank-btn';
        btn.dataset.puzzleBankPiece = opt;
        btn.dataset.puzzleBankId = String(idx);
        btn.textContent = opt;
        bank.appendChild(btn);
      });

      hostQuestionAnswersEl.appendChild(bank);
    }
    if (showReveal) {
      const items = Array.isArray(question.items)
        ? question.items.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
      if (items.length) {
        renderPuzzleRevealTokens(hostQuestionAnswersEl, items);
      } else {
        appendBigReveal(state.correctAnswer);
      }
    }
    if (projectorCorrectEl) projectorCorrectEl.textContent = '';
    return;
  }

  if (question.type === 'slider') {
    hostQuestionHintEl.textContent = '';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'pin') {
    hostQuestionHintEl.textContent = showReveal ? 'Correct zone highlighted.' : '';
    if (question.imageData) {
      const wrap = document.createElement('div');
      wrap.className = 'pin-preview';
      wrap.style.maxWidth = '680px';
      wrap.style.margin = '0 auto';

      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Pin question image';

      wrap.appendChild(img);

      if (showReveal) {
        const picksLayer = document.createElement('div');
        picksLayer.className = 'pin-picks-layer';

        syncPicksLayerBounds(wrap, picksLayer, img);

        const zones = Array.isArray(question.zones) && question.zones.length
          ? question.zones
          : (question.zone ? [question.zone] : []);
        zones.slice(0, 12).forEach((z) => {
          const zone = document.createElement('div');
          zone.className = 'pin-zone';
          zone.style.left = `${Number(z.x || 50)}%`;
          zone.style.top = `${Number(z.y || 50)}%`;
          zone.style.width = `${Math.max(2, Number(z.r || 15) * 2)}%`;
          zone.style.height = `${Math.max(2, Number(z.r || 15) * 2)}%`;
          picksLayer.appendChild(zone);

          const arrow = document.createElement('div');
          arrow.className = 'pin-arrow';
          arrow.style.left = `${Number(z.x || 50)}%`;
          arrow.style.top = `${Math.max(0, Number(z.y || 50) - Number(z.r || 15) - 6)}%`;
          arrow.textContent = '↓';
          picksLayer.appendChild(arrow);
        });

        wrap.appendChild(picksLayer);
      }

      hostQuestionAnswersEl.appendChild(wrap);
    }
    return;
  }

  hostQuestionHintEl.textContent = '';
}

function computeCrazyCountScore(toScore, p, elapsedMs) {
  const target = Math.max(0, Math.round(Number(toScore || 0)));
  if (p >= 1) return target;

  const targetStr = String(target);
  const len = targetStr.length;
  const chars = targetStr.split('');

  for (let posFromRight = 0; posFromRight < len; posFromRight++) {
    const idx = len - 1 - posFromRight;
    const stopAt = 0.5 + (posFromRight * (0.45 / Math.max(1, len - 1))); // right -> left stop
    if (p < stopAt) {
      chars[idx] = String(Math.floor((elapsedMs / 22 + (idx + 1) * 3) % 10));
    }
  }

  const n = Number(chars.join(''));
  return Number.isFinite(n) ? n : target;
}

function buildProjectorScoreItem(rank, name, score, medal = '🏅') {
  const li = document.createElement('li');
  li.classList.add('projector-score-item', `rank-${Math.min(rank, 4)}`);

  const left = document.createElement('span');
  left.className = 'projector-score-left';
  left.textContent = `${medal} ${rank}. ${name}`;

  const right = document.createElement('span');
  right.className = 'projector-score-value';
  right.textContent = `${score} pts`;

  li.append(left, right);
  return li;
}

function renderProjectorScores(players, opts = {}) {
  if (!projectorScoresEl) return;
  projectorScoresEl.innerHTML = '';

  if (!players.length) {
    const li = document.createElement('li');
    li.textContent = 'No players yet.';
    projectorScoresEl.appendChild(li);
    return;
  }

  const inFinalResults = live.host.state?.phase === 'results' && !live.host.rankingMode;
  if (inFinalResults) {
    const sorted = [...players].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const revealCount = Math.min(7, sorted.length);
    const revealSlice = sorted.slice(0, revealCount);
    const revealKey = revealSlice.map((p) => `${p.id}:${Number(p.score || 0)}`).join('|');

    if (live.host.finalRevealKey !== revealKey) {
      live.host.finalRevealKey = revealKey;
      live.host.finalRevealStartedAt = Date.now();
      live.host.finalRevealStagePlayed = { drumroll: false, final: false };
      stopFx('counter');
      stopFx('answered');
      stopFx('final');
      stopFx('drumrollwinner');
    }

    const revealTiming = {
      winnerHornMs: 7000,
      drumrollTotalMs: 10000,
    };

    const elapsed = Date.now() - Number(live.host.finalRevealStartedAt || Date.now());
    const firstRevealMs = revealCount > 1 ? 1000 : revealTiming.winnerHornMs;
    const stepMs = revealCount > 1
      ? (revealTiming.winnerHornMs - firstRevealMs) / (revealCount - 1)
      : 0;

    if (!live.host.finalRevealStagePlayed.drumroll) {
      playFx('drumrollwinner');
      live.host.finalRevealStagePlayed.drumroll = true;
    }

    const title = document.createElement('li');
    title.textContent = '🏁 FINAL RANKING REVEAL';
    title.classList.add('projector-score-item', 'rank-1');
    projectorScoresEl.appendChild(title);

    const medalForRank = (rank) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return '🏅';
    };

    // Reveal from 7 -> 1 in time, but render as 1..N so new better ranks appear above previous ones.
    for (let rank = 1; rank <= revealCount; rank++) {
      const revealAt = firstRevealMs + (revealCount - rank) * stepMs;
      if (elapsed < revealAt) continue;
      const p = revealSlice[rank - 1];
      if (!p) continue;
      projectorScoresEl.appendChild(buildProjectorScoreItem(rank, p.name, p.score, medalForRank(rank)));
    }

    const finalStartMs = revealTiming.drumrollTotalMs;
    if (elapsed >= finalStartMs && !live.host.finalRevealStagePlayed.final) {
      stopFx('drumrollwinner');
      playFx('final');
      live.host.finalRevealStagePlayed.final = true;
    }

    if (elapsed < finalStartMs) {
      scheduleRankingAnimationFrame();
    }
    return;
  }

  let viewPlayers = [...players];
  if (opts.animate && live.host.rankingMode) {
    const t = Date.now();
    const d = Math.max(200, Number(live.host.rankingAnimDurationMs || 2600));
    const elapsedMs = t - Number(live.host.rankingAnimStartAt || t);
    const p = Math.max(0, Math.min(1, elapsedMs / d));

    viewPlayers = viewPlayers.map((pl) => {
      const from = Number(live.host.rankingAnimFrom?.[pl.id] ?? pl.score ?? 0);
      const to = Number(live.host.rankingAnimTo?.[pl.id] ?? pl.score ?? 0);
      const score = computeCrazyCountScore(to, p, elapsedMs);
      return { ...pl, score, _from: from, _to: to };
    });

    const climbWindowMs = 1000;
    if (elapsedMs >= d - climbWindowMs) {
      viewPlayers.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    } else {
      viewPlayers.sort((a, b) => Number(b._from || 0) - Number(a._from || 0));
    }

    if (p < 1) {
      scheduleRankingAnimationFrame();
    } else {
      stopFx('counter');
    }
  }

  viewPlayers.slice(0, 10).forEach((p, i) => {
    const medals = ['🥇', '🥈', '🥉'];
    const prefix = medals[i] || '🏅';
    projectorScoresEl.appendChild(buildProjectorScoreItem(i + 1, p.name, p.score, prefix));
  });
}

function renderReactionPop(reactions) {
  if (!Array.isArray(reactions) || !reactions.length) return;

  reactions.forEach((r) => {
    const emoji = String(r?.emoji || '').trim();
    if (!emoji) return;

    const key = `${r.playerId || 'p'}:${r.at || 0}:${emoji}`;
    if (live.host.seenReactionKeys.has(key)) return;
    live.host.seenReactionKeys.add(key);

    [liveReactionsEl, projectorReactionsEl].forEach((container) => {
      if (!container) return;
      const pop = document.createElement('span');
      pop.className = 'reaction-pop-item';
      pop.textContent = emoji;
      pop.style.left = `${Math.round(8 + Math.random() * 84)}%`;
      pop.style.setProperty('--reaction-base-bottom', `${Math.round(6 + Math.random() * 18)}%`);
      pop.style.animationDelay = `${Math.round(Math.random() * 80)}ms`;
      container.appendChild(pop);
      setTimeout(() => pop.remove(), 1800);
    });
  });
}

function updateHostTimer(state) {
  if (!projectorTimerEl) return;

  const setHostTimerBar = (remainingSec, limitSec, active = true) => {
    if (!hostTimerBarFill) return;
    const limit = Math.max(1, Number(limitSec || 1));
    const remaining = Math.max(0, Number(remainingSec || 0));
    const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
    hostTimerBarFill.style.width = `${pct}%`;
    hostTimerBarFill.parentElement?.classList.toggle('active', !!active && pct > 0);
  };

  if (state.phase !== 'question' || !state.question) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.timerAnchorAtMs = null;
    live.host.timerInitialRemainingMs = null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = '⏱️ Time: -';
    setHostTimerBar(0, 1, false);
    return;
  }

  const rawLimitSec = Number(state.question.timeLimit);
  const hasTimeLimit = Number.isFinite(rawLimitSec) ? rawLimitSec > 0 : true;
  const limitSec = hasTimeLimit ? Math.max(1, rawLimitSec || 20) : null;

  if (state.questionClosed) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = Number(state.currentIndex || 0);
    live.host.timerStartedAtMs = Number(state.questionStartedAt || 0) || null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = hasTimeLimit ? '⏱️ Time: 0s' : '⏱️ Time: No limit';
    setHostTimerBar(0, limitSec || 1, false);
    return;
  }

  if (!hasTimeLimit) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = Number(state.currentIndex || 0);
    live.host.timerStartedAtMs = Number(state.questionStartedAt || 0) || null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = '⏱️ Time: No limit';
    setHostTimerBar(0, 1, false);
    return;
  }

  const questionIndex = Number(state.currentIndex || 0);
  const startedAt = Number(state.questionStartedAt || 0);
  const deadlineFromState = Number(state.questionDeadlineAt || 0);
  const serverNow = Number(state.serverNow || 0);
  const now = Date.now();

  live.host.timerForIndex = questionIndex;
  live.host.timerStartedAtMs = startedAt || null;

  if (deadlineFromState > 0) {
    const driftMs = serverNow > 0 ? (now - serverNow) : 0;
    live.host.timerDeadlineMs = deadlineFromState + driftMs;
  } else {
    live.host.timerDeadlineMs = (startedAt > 0 ? startedAt : now) + limitSec * 1000;
  }

  live.host.timerLimitSec = limitSec;

  const deadlineMs = Number(live.host.timerDeadlineMs || 0);
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
    projectorTimerEl.textContent = `⏱️ Time: ${limitSec}s`;
    setHostTimerBar(limitSec, limitSec, true);
    return;
  }

  const capMs = limitSec * 1000;
  const remainingMsRaw = Math.max(0, deadlineMs - Date.now());
  const remainingMs = Math.min(capMs, remainingMsRaw);
  const remaining = Math.ceil(remainingMs / 1000);
  projectorTimerEl.textContent = `⏱️ Time: ${remaining}s`;
  setHostTimerBar(remainingMs / 1000, limitSec, true);
  startHostTimerTicker();
}

function startHostTimerTicker() {
  if (live.host.timerTicker) return;
  live.host.timerTicker = setInterval(() => {
    if (!projectorTimerEl) return;
    const deadlineMs = Number(live.host.timerDeadlineMs || 0);
    const limitSec = Math.max(1, Number(live.host.timerLimitSec || 20));
    if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) return;

    const capMs = limitSec * 1000;
    const remainingMsRaw = Math.max(0, deadlineMs - Date.now());
    const remainingMs = Math.min(capMs, remainingMsRaw);
    const remaining = Math.ceil(remainingMs / 1000);
    projectorTimerEl.textContent = `⏱️ Time: ${remaining}s`;

    if (hostTimerBarFill) {
      const pct = Math.max(0, Math.min(100, (remainingMs / capMs) * 100));
      hostTimerBarFill.style.width = `${pct}%`;
      hostTimerBarFill.parentElement?.classList.toggle('active', pct > 0);
    }
  }, 200);
}

function stopHostTimerTicker() {
  if (live.host.timerTicker) clearInterval(live.host.timerTicker);
  live.host.timerTicker = null;
  live.host.timerLimitSec = null;
  live.host.timerAnchorAtMs = null;
  live.host.timerInitialRemainingMs = null;
}

function toggleProjectorFullscreen() {
  const target = hostQuestionWrap?.closest('.card') || document.getElementById('hostQuestionCard');
  if (!target) return;

  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    target.requestFullscreen?.().catch(() => { });
  }
}

function syncFullscreenButtonLabel() {
  if (!projectorFullscreenBtn) return;
  projectorFullscreenBtn.textContent = document.fullscreenElement ? '🗗 Exit fullscreen' : '🖥️ Fullscreen';
}

function updateHallScene(state) {
  if (!hallCardEl || !hallHintEl) return;

  const scoreboardSection = document.getElementById('projectorScoreboardSection');

  if (state.phase === 'lobby') {
    // 1. FIX: Force the lobby to become visible!
    hallCardEl.classList.remove('hidden');
    hallCardEl.classList.add('hall-live');
    hallHintEl.textContent = '';

    // Hide hint text and scoreboard during lobby
    if (hostQuestionHintEl) hostQuestionHintEl.style.display = 'none';

    // Render lobby player chips inside the hall card
    if (hallLobbyPlayersEl) {
      const players = Array.isArray(state.players) ? state.players : [];
      const isRandomNames = !!(state.settings && state.settings.randomNames);
      // Build a key to avoid unnecessary DOM rebuilds
      const chipKey = players.map(p => `${p.id}:${p.name}`).join('|') + ':' + (isRandomNames ? '1' : '0');
      if (hallLobbyPlayersEl.dataset.chipKey !== chipKey) {
        hallLobbyPlayersEl.dataset.chipKey = chipKey;
        hallLobbyPlayersEl.innerHTML = '';
        players.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'hall-player-chip';
          if (isRandomNames) {
            const dice = document.createElement('span');
            dice.className = 'hall-dice-btn';
            dice.textContent = '🎲';
            chip.appendChild(dice);
          }
          const nameSpan = document.createElement('span');
          nameSpan.textContent = p.name || 'Player';
          chip.appendChild(nameSpan);
          hallLobbyPlayersEl.appendChild(chip);
        });
      }
    }

    playHallMusic();
    return;
  }

  // 2. FIX: Force the lobby to hide when the quiz actually starts!
  hallCardEl.classList.add('hidden');
  hallCardEl.classList.remove('hall-live');
  stopHallMusic();

  // Restore hint text and scoreboard when quiz is active
  if (hostQuestionHintEl) hostQuestionHintEl.style.display = '';

  // Clear lobby player chips
  if (hallLobbyPlayersEl) {
    hallLobbyPlayersEl.innerHTML = '';
    hallLobbyPlayersEl.dataset.chipKey = '';
  }

  if (state.phase === 'question') {
    hallHintEl.textContent = 'Question in progress.';
  } else if (state.phase === 'results') {
    hallHintEl.textContent = 'Game finished.';
  } else {
    hallHintEl.textContent = '';
  }
}

function playHallMusic() {
  if (!live.host.isPrimaryAudioHost) return;
  if (!audioFx.hall) return;
  if (!audioFx.hall.paused) return;
  audioFx.hall.currentTime = 0;
  audioFx.hall.play().catch(() => { });
}

function stopHallMusic() {
  if (!audioFx.hall) return;
  audioFx.hall.pause();
}

function playFxWithVolume(name, volume = 1) {
  if (!live.host.isPrimaryAudioHost) return;
  const a = audioFx[name];
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, Number(volume || 0)));
    a.play().catch(() => { });
  } catch {
    // ignore missing files/autoplay errors
  }
}

function playFx(name) {
  if (!live.host.isPrimaryAudioHost) return;

  if (name === 'answering') {
    if (!answeringFxPool.length) return;
    let idx = Math.floor(Math.random() * answeringFxPool.length);
    if (answeringFxPool.length > 1 && idx === live.host.lastAnsweringFxIndex) {
      idx = (idx + 1) % answeringFxPool.length;
    }
    live.host.lastAnsweringFxIndex = idx;
    const a = answeringFxPool[idx];
    live.host.currentAnsweringFx = a;
    try {
      a.currentTime = 0;
      a.play().catch(() => { });
    } catch {
      // ignore missing files or autoplay errors
    }
    return;
  }

  const a = audioFx[name];
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => { });
  } catch {
    // ignore missing files or autoplay errors
  }
}

function stopFx(name) {
  if (name === 'answering') {
    const a = live.host.currentAnsweringFx;
    if (!a) return;
    try {
      a.pause();
      // Don't reset currentTime — allow resume later
    } catch {
      // ignore
    }
    return;
  }

  const a = audioFx[name];
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
  } catch {
    // ignore
  }
}

function resetFx(name) {
  if (name === 'answering') {
    const a = live.host.currentAnsweringFx;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      // ignore
    }
    live.host.currentAnsweringFx = null;
    live.host.lastAnsweringFxIndex = -1;
    live.host.currentAnsweringFxKey = null;
    return;
  }

  const a = audioFx[name];
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
  } catch {
    // ignore
  }
}

function isHostVideoPlaying() {
  const el = document.querySelector('#hostQuestionAnswers .question-video-el');
  return !!(el && el.tagName === 'VIDEO' && !el.paused && !el.ended);
}

function resumeFx(name) {
  if (name === 'answering') {
    if (isHostVideoPlaying()) return;
    const a = live.host.currentAnsweringFx;
    if (!a) return;
    try {
      a.play().catch(() => { });
    } catch {
      // ignore
    }
    return;
  }

  const a = audioFx[name];
  if (!a) return;
  try {
    a.play().catch(() => { });
  } catch {
    // ignore
  }
}

function primeAnsweringFx(answeringKey) {
  if (!live.host.isPrimaryAudioHost) return null;
  if (!answeringFxPool.length) return null;

  if (live.host.currentAnsweringFx && live.host.currentAnsweringFxKey === answeringKey) {
    return live.host.currentAnsweringFx;
  }

  resetFx('answering');

  let idx = Math.floor(Math.random() * answeringFxPool.length);
  if (answeringFxPool.length > 1 && idx === live.host.lastAnsweringFxIndex) {
    idx = (idx + 1) % answeringFxPool.length;
  }

  live.host.lastAnsweringFxIndex = idx;
  live.host.currentAnsweringFx = answeringFxPool[idx];
  live.host.currentAnsweringFxKey = answeringKey;

  try {
    live.host.currentAnsweringFx.pause();
    live.host.currentAnsweringFx.currentTime = 0;
  } catch {
    // ignore
  }

  return live.host.currentAnsweringFx;
}

function isFxPlaying(name) {
  if (name === 'answering') {
    const a = live.host.currentAnsweringFx;
    return a && !a.paused;
  }

  const a = audioFx[name];
  return a && !a.paused;
}

function animatePulse(el) {
  if (!el) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
}

function startHostPolling() {
  stopHostPolling();
  live.host.pollTimer = setInterval(pollHostState, 1000);
}

function stopHostPolling() {
  if (live.host.pollTimer) clearInterval(live.host.pollTimer);
  live.host.pollTimer = null;
  live.host.state = null;
  live.host.timerStartedAtMs = null;
  live.host.attemptsLoading = false;
  stopHostTimerTicker();
}
async function joinLiveGame() {
  try {
    const pin = String(joinPinEl.value || '').trim();
    const name = String(joinNameEl.value || '').trim() || 'Student';
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

    const data = await api('/api/join', {
      method: 'POST',
      body: { pin, name },
    });

    live.player.pin = pin;
    live.player.id = data.playerId;
    live.player.token = data.playerToken;
    live.player.renderKey = null;
    live.player.submittedForIndex = null;
    live.player.currentQuestion = null;
    live.player.pinSelection = null;
    live.player.pinSelections = [];

    setStatus(joinStatusEl, `Joined as ${data.name || name} ✅`, 'ok');
    startPlayerPolling();
    await pollPlayerState();
  } catch (err) {
    setStatus(joinStatusEl, err.message, 'bad');
  }
}

async function pollPlayerState() {
  if (!live.player.pin || !live.player.id || !live.player.token) return;

  try {
    const data = await api(
      `/api/player/state?pin=${encodeURIComponent(live.player.pin)}&playerId=${encodeURIComponent(live.player.id)}`,
      {
        method: 'GET',
        headers: { 'X-Player-Token': live.player.token },
      },
    );

    renderPlayerState(data);
  } catch (err) {
    setStatus(joinStatusEl, `Join poll failed: ${err.message}`, 'bad');
    stopPlayerPolling();
  }
}

function getStudentAnswerTextFromUI() {
  const textInput = joinAnswersEl?.querySelector('input[type="text"], textarea');
  if (textInput && typeof textInput.value === 'string') return String(textInput.value || '').trim();

  const errorHuntChips = joinAnswersEl?.querySelectorAll('[data-error-token]');
  if (errorHuntChips && errorHuntChips.length > 0) {
    return [...errorHuntChips].map(el => el.dataset.tokenText || el.textContent || '').join(' ').trim();
  }

  const selected = [...(joinAnswersEl?.querySelectorAll('[data-puzzle-piece], input:checked + span') || [])]
    .map((el) => String(el.textContent || '').trim())
    .filter(Boolean)
    .join(' ');
  return selected;
}

function escapeHtmlText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildCorrectionDiffHtml(correction, original) {
  const origWords = new Set(String(original || '').toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
  const tokens = String(correction || '').match(/\s+|[^\s]+/g) || [];
  return tokens.map((tok) => {
    const safe = escapeHtmlText(tok);
    const core = (tok.match(/[\p{L}\p{N}']+/u) || [null])[0];
    const word = core ? String(core).toLowerCase() : null;
    if (!word || origWords.has(word)) return safe;
    return `<span class="join-correction-diff">${safe}</span>`;
  }).join('');
}

function renderPlayerState(state) {
  joinProgressEl.textContent = `Question ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  joinScoreEl.textContent = `Score: ${state.score}`;

  const renderJoinReveal = () => {
    // Target the broader container to avoid flex-wrap collisions
    const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
    if (!wrap) return;
    let revealEl = wrap.querySelector('[data-join-correct-reveal="1"]');

    const question = state.question;
    const isPoll = !!question?.isPoll;
    const show = !!state.questionClosed && !isPoll;
    const needsReveal = question && ['text', 'puzzle', 'error_hunt', 'match_pairs'].includes(question.type);

    if (!show || !needsReveal) {
      if (revealEl) revealEl.remove();
      return;
    }

    let correctText = String(state.correctAnswer || '').trim();

    if (!correctText) {
      if (question.type === 'text') correctText = (question.accepted || []).join(' | ');
      if (question.type === 'puzzle') correctText = (question.items || []).join(' ➔ ');
      if (question.type === 'match_pairs') correctText = (question.pairs || []).map(p => `${p.left} ➔ ${p.right}`).join(' | ');
      if (question.type === 'error_hunt') correctText = question.corrected || '';
    }

    if (!correctText) {
      if (revealEl) revealEl.remove();
      return;
    }

    // If it doesn't exist, create it once
    if (!revealEl) {
      revealEl = document.createElement('div');
      revealEl.className = 'student-answer-reveal';
      revealEl.dataset.joinCorrectReveal = '1';

      const title = document.createElement('div');
      title.className = 'student-answer-reveal-title';
      title.textContent = 'Correct Answer';

      const content = document.createElement('div');
      content.className = 'student-answer-reveal-content';

      revealEl.append(title, content);

      // Better placement: drop it right above the submit button section
      const submissionWrap = document.getElementById('joinSubmission');
      if (wrap.id === 'joinQuestionInteractive' && submissionWrap) {
        wrap.insertBefore(revealEl, submissionWrap);
      } else {
        wrap.appendChild(revealEl);
      }
    }

    // Only update DOM if text actually changed
    const contentEl = revealEl.querySelector('.student-answer-reveal-content');
    if (contentEl && contentEl.textContent !== correctText) {
      contentEl.textContent = correctText;
    }
  };


  const renderInlineCorrection = (text = '') => {
    const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
    if (!wrap) return;
    wrap.querySelectorAll('[data-join-correction-inline="1"]').forEach((el) => el.remove());
    const corr = String(text || '').trim();
    if (!corr) return;

    const studentText = getStudentAnswerTextFromUI();
    const p = document.createElement('div');
    p.dataset.joinCorrectionInline = '1';

    // Reuse the modern block, but color it for a teacher correction (red)
    p.className = 'student-answer-reveal';
    p.style.background = '#fef2f2';
    p.style.borderColor = '#fca5a5';
    p.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.06)';

    const title = document.createElement('div');
    title.className = 'student-answer-reveal-title';
    title.style.color = '#dc2626';
    title.textContent = 'Teacher Feedback';

    const content = document.createElement('div');
    content.className = 'student-answer-reveal-content';
    content.style.color = '#7f1d1d';
    content.innerHTML = `${buildCorrectionDiffHtml(corr, studentText)}`;

    p.append(title, content);

    const submissionWrap = document.getElementById('joinSubmission');
    if (wrap.id === 'joinQuestionInteractive' && submissionWrap) {
      wrap.insertBefore(p, submissionWrap);
    } else {
      wrap.appendChild(p);
    }
  };

  if (state.phase !== 'question' || !state.question) {
    const oldOverlay = document.getElementById('matchPairsCenterOverlay');
    if (oldOverlay) oldOverlay.remove();
    joinQuestionWrap.classList.add('hidden');

    if (state.phase === 'lobby') {
      setStatus(joinStatusEl, 'Waiting for teacher to start…', 'ok');
    } else if (state.phase === 'results') {
      setStatus(joinStatusEl, 'Game finished 🎉', 'ok');
      renderLeaderboardInJoin(state.leaderboard || []);
    }
    renderJoinReveal();
    return;
  }

  joinQuestionWrap.classList.remove('hidden');

  const key = `${state.phase}:${state.currentIndex}:${Number(state.questionStartedAt || 0)}`;
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    live.player.pinSelections = [];
    renderJoinQuestion(state.question);
    setStatus(joinFeedbackEl, '', '');
  }

  const questionClosed = !!state.questionClosed;
  const isPoll = !!state.question?.isPoll;
  const fullscreenLocked = isQuestionMediaFullscreenActive();
  joinSubmitBtn.disabled = questionClosed || state.answeredCurrent || fullscreenLocked;

  if (questionClosed) {
    const closeReason = String(state.questionCloseReason || '').trim();
    const closedMsg = closeReason === 'all_answered'
      ? 'Everyone answered. Waiting for next question…'
      : (closeReason === 'manual_reveal' ? 'Teacher closed the question. Waiting for next question…' : 'Time is up. Waiting for next question…');

    const rr = state.revealedResult || null;
    if (rr?.graded === true) {
      setStatus(joinFeedbackEl, rr.correct ? `Graded ✓ (+${Number(rr.pointsAwarded || 0)})` : `Graded ✗ (+${Number(rr.pointsAwarded || 0)})`, rr.correct ? 'ok' : 'bad');
    } else {
      setStatus(joinFeedbackEl, isPoll ? '🗳️ Poll closed. Results on projector.' : closedMsg, 'ok');
    }
    setStatus(joinStatusEl, isPoll ? 'Poll closed.' : 'Question closed.', 'ok');
  } else if (joinSubmitBtn.disabled) {
    const rr = state.revealedResult || null;
    if (rr?.graded === true) {
      setStatus(joinFeedbackEl, rr.correct ? `Graded ✓ (+${Number(rr.pointsAwarded || 0)})` : `Graded ✗ (+${Number(rr.pointsAwarded || 0)})`, rr.correct ? 'ok' : 'bad');
    } else {
      setStatus(joinFeedbackEl, 'Answer submitted. Waiting for next question…', 'ok');
    }
    setStatus(joinStatusEl, 'Answer received.', 'ok');
  } else {
    setStatus(joinStatusEl, 'Question live!', 'ok');
  }
  if (fullscreenLocked) {
    setStatus(joinStatusEl, 'Exit fullscreen to answer.', 'bad');
  }

  const rrNow = state.revealedResult;
  const correctionText = rrNow?.correction || '';
  renderInlineCorrection(String(correctionText || ''));

  renderJoinReveal();
}

function renderJoinQuestion(question) {
  const oldOverlay = document.getElementById('matchPairsCenterOverlay');
  if (oldOverlay) oldOverlay.remove();

  // context_gap renders the sentence inline with blanks, so avoid duplicating the same text above.
  joinPromptEl.textContent = question.type === 'context_gap' ? '' : (question.prompt || '(No question text)');
  joinAnswersEl.innerHTML = '';

  const mediaCfgForImage = toVideoEmbedConfig(question.media || {});
  const hasQuestionVideo = normalizeQuestionMedia(question.media).kind === 'video' && !!mediaCfgForImage.src;
  const hasSharedImage = !hasQuestionVideo && question.type !== 'pin' && !!question.imageData;
  const hasAnyImage = !hasQuestionVideo && (hasSharedImage || ((question.type === 'image_open' || question.type === 'pin') && !!question.imageData));
  joinAnswersEl.classList.toggle('has-question-image', hasSharedImage);
  if (joinPromptEl) joinPromptEl.classList.toggle('with-image', hasAnyImage);

  if (question.isPoll) {
    const note = document.createElement('p');
    note.className = 'small';
    note.textContent = 'Poll mode: anonymous results, no points.';
    joinAnswersEl.appendChild(note);
  }

  if (!hasQuestionVideo && question.type !== 'pin' && question.type !== 'image_open' && question.type !== 'match_pairs' && question.imageData) {
    const preview = document.createElement('div');
    preview.className = 'pin-preview question-image-preview';
    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Question image';
    img.dataset.zoomable = '1';
    preview.appendChild(img);
    joinAnswersEl.appendChild(preview);
  }

  const allowStudentVideo = false; // Live mode: video should stay on host/projector only.
  const videoMedia = normalizeQuestionMedia(question.media);
  if (allowStudentVideo && videoMedia.kind === 'video' && (videoMedia.url || videoMedia.embedUrl)) {
    const config = toVideoEmbedConfig(videoMedia);
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'top-space question-video-wrap';
    if (config.provider === 'direct' && config.src) {
      const v = document.createElement('video');
      v.controls = true;
      v.preload = 'metadata';
      v.src = config.src;
      v.className = 'question-video-el';
      v.addEventListener('loadedmetadata', () => {
        v.currentTime = config.start || 0;
      }, { once: true });
      v.addEventListener('timeupdate', () => {
        if (config.end != null && v.currentTime >= config.end) v.pause();
      });
      mediaWrap.appendChild(v);
    } else if (config.src) {
      const iframe = document.createElement('iframe');
      iframe.src = config.src;
      iframe.allowFullscreen = true;
      iframe.className = 'question-video-el';
      mediaWrap.appendChild(iframe);
    } else {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'Video could not be embedded.';
      mediaWrap.appendChild(p);
    }
    joinAnswersEl.appendChild(mediaWrap);
  }

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const isMulti = question.type === 'multi';

    question.answers.forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      if (!isMulti) input.name = 'join-answer';
      input.value = String(idx);
      input.dataset.joinAnswer = '1';

      const text = document.createElement('span');
      text.textContent = a.text;

      row.append(input, text);
      joinAnswersEl.appendChild(row);
    });



    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
    }
    return;
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'voice_record' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      joinAnswersEl.appendChild(preview);
    }

    if (question.type === 'context_gap') {
      const count = Math.max(1, Math.min(10, Number(question.gapCount || 1)));
      renderInlineContextGapInputs(joinAnswersEl, question.prompt, count, 'joinGap');
    } else if (question.type === 'error_hunt') {
      const required = getErrorHuntRequired(question);
      const info = document.createElement('p');
      info.className = 'small';
      info.textContent = `Find ${required} wrong token(s), then rewrite.`;
      joinAnswersEl.appendChild(info);

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'row gap';
      tokenWrap.style.flexWrap = 'wrap';
      const tokens = String(question.prompt || '').split(/\s+/).filter(Boolean);
      tokens.forEach((tok, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn error-token-chip';
        b.dataset.errorToken = String(i);
        b.dataset.tokenText = tok;
        b.dataset.originalText = tok;
        b.textContent = tok;

        const normalizeToken = (txt) => String(txt || '').replace(/\s+/g, '').toLowerCase();
        const makeEditable = () => {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = b.dataset.tokenText || b.textContent || '';
          input.style.minWidth = '80px';
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              input.blur();
            }
          });
          input.addEventListener('blur', () => {
            const newText = String(input.value || '').trim();
            if (newText) {
              const nextBtn = b.nextElementSibling?.dataset?.tokenText ? b.nextElementSibling : null;
              const mergedCandidate = (b.dataset.tokenText || '') + (nextBtn ? nextBtn.dataset.tokenText || '' : '');
              if (nextBtn && normalizeToken(newText) === normalizeToken(mergedCandidate)) {
                nextBtn.remove();
              }
              b.dataset.tokenText = newText;
              b.textContent = newText;

              // Auto-set active state if edited
              const origToken = String(b.dataset.originalText || '').trim();
              if (origToken && newText !== origToken) {
                b.classList.add('active');
              } else if (origToken && newText === origToken) {
                b.classList.remove('active');
              }
            }
            b.classList.remove('editing');
            if (b.contains(input)) b.removeChild(input);
          });
          b.classList.add('editing');
          b.innerHTML = '';
          b.appendChild(input);
          input.focus();
          input.select();
        };

        b.addEventListener('click', (e) => {
          if (b.classList.contains('editing')) return;
          if (e.altKey || e.metaKey || e.ctrlKey) {
            makeEditable();
            return;
          }
          const isActive = b.classList.contains('active');
          if (isActive) {
            b.classList.remove('active');
            return;
          }
          const activeCount = tokenWrap.querySelectorAll('[data-error-token].active').length;
          if (activeCount >= required) return;
          b.classList.add('active');
        });

        b.addEventListener('dblclick', () => makeEditable());

        tokenWrap.appendChild(b);
      });
      joinAnswersEl.appendChild(tokenWrap);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinErrorRewrite';
      input.maxLength = 160;
      input.placeholder = 'Rewrite the corrected sentence';
      input.className = 'top-space';
      input.addEventListener('input', () => { input.dataset.fromTokens = '0'; });
      joinAnswersEl.appendChild(input);
      enableInlineErrorTokenEditing(tokenWrap, '[data-error-token]', input);
    } else if (question.type === 'match_pairs') {
      const leftItems = Array.isArray(question.leftItems) ? question.leftItems : [];
      const rightOptions = Array.isArray(question.rightOptions) ? question.rightOptions : [];
      if (question.imageData) {
        const overlay = document.createElement('div');
        overlay.id = 'matchPairsCenterOverlay';
        overlay.className = 'match-pairs-center-overlay host-mode';
        const imgWrap = document.createElement('div');
        imgWrap.className = 'match-pairs-img-wrap';
        const img = document.createElement('img');
        img.src = question.imageData;
        img.dataset.zoomable = '1';
        imgWrap.appendChild(img);
        const pairsWrap = document.createElement('div');
        pairsWrap.className = 'match-pairs-content-wrap';
        renderMatchPairsColumns(pairsWrap, leftItems, rightOptions, 'joinPair');
        overlay.append(imgWrap, pairsWrap);
        joinAnswersEl.appendChild(overlay);
      } else {
        renderMatchPairsColumns(joinAnswersEl, leftItems, rightOptions, 'joinPair');
      }
    } else if (question.type === 'speaking') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Speak your answer in class, then tap Submit answer so teacher can grade you.';
      joinAnswersEl.appendChild(note);
    } else if (question.type === 'voice_record') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Voice recording is available in assignment mode.';
      joinAnswersEl.appendChild(note);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinTextAnswer';
      input.maxLength = 120;
      input.placeholder = (question.type === 'open' || question.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (joinSubmitBtn?.disabled) return;
        submitLiveAnswer();
      });
      joinAnswersEl.appendChild(input);
    }

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
    }
    return;
  }

  if (question.type === 'puzzle') {
    const options = (question.options || []).slice(0, 12);
    createPuzzleDnd(joinAnswersEl, options, 'joinPuzzlePieces');

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
    }
    return;
  }

  if (question.type === 'slider') {
    const wrap = document.createElement('div');
    wrap.className = 'slider-inline-wrap';
    const value = Number(question.min || 0);
    wrap.innerHTML = `
      <input id="joinSlider" type="range" min="${question.min}" max="${question.max}" step="1" value="${value}" />
      <div id="joinSliderValue" class="slider-big-val">${value}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}</div>
    `;
    joinAnswersEl.appendChild(wrap);

    const slider = document.getElementById('joinSlider');
    const out = document.getElementById('joinSliderValue');
    slider.addEventListener('input', () => {
      out.textContent = `Selected: ${slider.value}${question.unit ? ` ${question.unit}` : ''}`;
    });
    return;
  }

  if (question.type === 'pin') {
    if (!question.imageData) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No image set for this question.';
      joinAnswersEl.appendChild(p);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';
    wrap.dataset.livePinSelect = 'join';

    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Pin question image';

    const picksLayer = document.createElement('div');
    picksLayer.className = 'pin-picks-layer';

    syncPicksLayerBounds(wrap, picksLayer, img);

    const zonesCount = question.zoneCount || (Array.isArray(question.zones) && question.zones.length ? question.zones.length : 1);
    const pinMode = String(question.pinMode || 'all');
    let required = 1;
    if (pinMode === 'all') required = Math.max(1, Math.min(12, zonesCount));
    else if (pinMode === 'any') required = 1;
    else { const n = parseInt(pinMode, 10); if (n >= 1) required = Math.max(1, Math.min(zonesCount, n)); }

    const countLabel = document.createElement('div');
    countLabel.className = 'pin-count-big';
    countLabel.textContent = `0 / ${required}`;

    wrap.append(img, picksLayer);
    joinAnswersEl.appendChild(wrap);
    joinAnswersEl.appendChild(countLabel);

    const renderPicks = () => {
      picksLayer.innerHTML = '';
      const picks = live.player.pinSelections || [];
      countLabel.textContent = `${Math.min(picks.length, required)} / ${required}`;
      picks.forEach((p) => {
        const dot = document.createElement('div');
        dot.className = 'pin-dot';
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
        picksLayer.appendChild(dot);
      });
    };

    attachPinPicker(wrap, (point) => {
      const picks = live.player.pinSelections || [];
      const nearIdx = picks.findIndex((p) => distance2D(p.x, p.y, point.x, point.y) <= 4);
      if (nearIdx >= 0) picks.splice(nearIdx, 1);
      else if (picks.length < required) picks.push(point);
      live.player.pinSelections = picks;
      live.player.pinSelection = picks[0] || null;
      renderPicks();
    });

    renderPicks();
    return;
  }
}

function isQuestionMediaFullscreenActive() {
  const fsEl = document.fullscreenElement;
  if (!fsEl) return false;
  if (fsEl.tagName === 'IFRAME' || fsEl.tagName === 'VIDEO') return true;
  return !!fsEl.closest?.('#joinAnswers');
}

async function runManualMediaCheck() {
  try {
    syncQuizFromUI();
    await ensureQuizMediaReady({ contextLabel: 'manual media check', convertTtsToMp3: true, strictMediaCheck: true });
    renderBuilder();
    setStatus(hostStatusEl, 'Media check complete ✅', 'ok');
  } catch (err) {
    setStatus(hostStatusEl, err?.message || 'Media check failed.', 'bad');
  }
}

async function submitLiveAnswer() {
  try {
    if (previewMode.active) {
      setStatus(joinFeedbackEl, 'Preview mode: use teacher controls.', 'ok');
      return;
    }

    if (!live.player.pin || !live.player.id || !live.player.token) throw new Error('Join first.');

    const answer = readJoinAnswer();
    if (answer === null || answer === '') throw new Error('Choose/type an answer first.');

    const data = await api('/api/answer', {
      method: 'POST',
      headers: { 'X-Player-Token': live.player.token },
      body: {
        pin: live.player.pin,
        playerId: live.player.id,
        answer,
      },
    });

    live.player.submittedForIndex = data.currentIndex;
    joinSubmitBtn.disabled = true;

    if (data.correct) {
      setStatus(joinFeedbackEl, `Correct ✅ (+${data.pointsAwarded})`, 'ok');
    } else {
      setStatus(joinFeedbackEl, 'Not correct ❌', 'bad');
    }

    joinScoreEl.textContent = `Score: ${data.score}`;
  } catch (err) {
    const msg = String(err?.message || 'Could not submit answer.');
    if (msg.includes('Question is closed') || msg.includes('Question is not active')) {
      setStatus(joinFeedbackEl, 'Question is closed. Waiting for next one…', 'ok');
      if (joinSubmitBtn) joinSubmitBtn.disabled = true;
      return;
    }
    setStatus(joinFeedbackEl, msg, 'bad');
  }
}

function readJoinAnswer() {
  const q = live.player.currentQuestion;
  if (!q) return null;

  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const checked = joinAnswersEl.querySelector('input[name="join-answer"]:checked');
    return checked ? Number(checked.value) : null;
  }

  if (q.type === 'multi') {
    const selected = [...joinAnswersEl.querySelectorAll('input[data-join-answer]:checked')].map((el) => Number(el.value));
    return selected.length ? selected : null;
  }

  if (q.type === 'text' || q.type === 'open' || q.type === 'image_open') {
    const text = document.getElementById('joinTextAnswer');
    return text ? text.value : '';
  }

  if (q.type === 'speaking') {
    return '__spoken__';
  }

  if (q.type === 'voice_record') {
    return '__voice_record__';
  }

  if (q.type === 'context_gap') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-gap]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'error_hunt') {
    const rewrite = String(document.getElementById('joinErrorRewrite')?.value || '').trim();
    if (!rewrite) return null;
    const selected = [...joinAnswersEl.querySelectorAll('[data-error-token].active')].map((el) => Number(el.dataset.errorToken));
    const required = getErrorHuntRequired(q);
    if (selected.length !== required) return null;
    return { rewrite, selectedTokens: selected };
  }

  if (q.type === 'match_pairs') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-pair]')];
    const values = fields.map((el) => String(el.value || '').trim());
    if (!values.every(Boolean)) return null;
    const leftItems = Array.isArray(q.leftItems) ? q.leftItems : [];
    return values.map((right, i) => ({ left: String(leftItems[i] || ''), right }));
  }

  if (q.type === 'puzzle') {
    const pieces = [...joinAnswersEl.querySelectorAll('[data-puzzle-piece]')].map((el) => String(el.dataset.puzzlePiece || '').trim()).filter(Boolean);
    return pieces.length ? pieces : null;
  }

  if (q.type === 'slider') {
    const slider = document.getElementById('joinSlider');
    if (!slider) return null;
    return Number(slider.value);
  }

  if (q.type === 'pin') {
    const picks = Array.isArray(live.player.pinSelections) ? live.player.pinSelections : [];
    return picks.length ? picks : null;
  }

  return null;
}

function startPlayerPolling() {
  stopPlayerPolling();
  live.player.pollTimer = setInterval(pollPlayerState, 2000);
}

function stopPlayerPolling() {
  if (live.player.pollTimer) clearInterval(live.player.pollTimer);
  live.player.pollTimer = null;
}

function renderLeaderboardInJoin(leaderboard) {
  joinQuestionWrap.classList.add('hidden');
  joinAnswersEl.innerHTML = '';
  joinPromptEl.textContent = '';

  if (!leaderboard?.length) return;

  const ul = document.createElement('ul');
  ul.className = 'list';

  leaderboard.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${p.name} - ${p.score} pts`;
    ul.appendChild(li);
  });

  joinAnswersEl.appendChild(ul);
}

function startPreviewMode() {
  syncQuizFromUI();
  if (!quiz.questions?.length) {
    setStatus(hostStatusEl, 'Add at least 1 question first.', 'bad');
    return;
  }

  previewMode.active = true;
  previewMode.prevPrimaryAudioHost = live.host.isPrimaryAudioHost;
  // Preview runs locally, so allow audio even when not the primary live host.
  live.host.isPrimaryAudioHost = true;
  previewMode.simStudentCount = 14;
  previewMode.simNames = randomPreviewNames(14);
  previewMode.simClassSeed = Date.now();
  previewMode.index = Math.max(0, Math.min(previewMode.index, quiz.questions.length - 1));
  previewMode.showReveal = false;
  previewMode.answeredCurrent = false;
  previewMode.revealedResult = null;
  previewMode.simStudentCount = 14;
  previewMode.simProfile = 'balanced';
  previewMode.simTimingProfile = 'staggered';
  previewMode.simTextQualityProfile = 'acceptable';
  previewMode.simEdgeCaseProfile = 'none';
  live.player.renderKey = null;
  live.player.currentQuestion = null;
  live.player.pinSelection = null;
  live.player.pinSelections = [];

  if (previewExitBtn) previewExitBtn.classList.remove('hidden');
  if (previewRerollBtn) previewRerollBtn.classList.remove('hidden');
  if (previewResimBtn) previewResimBtn.classList.remove('hidden');
  if (previewJumpInputEl) {
    previewJumpInputEl.classList.remove('hidden');
    previewJumpInputEl.value = String(Number(previewMode.index || 0) + 1);
  }
  if (previewJumpBtn) previewJumpBtn.classList.remove('hidden');

  // --- NEW: Auto-expand the Live Screen section so Preview is visible ---
  if (liveScreenSectionToggleEl && liveScreenCardBodyEl) {
    setSectionCollapsed(liveScreenSectionToggleEl, liveScreenCardBodyEl, false);
  }

  renderPreviewFrame();
  setStatus(hostStatusEl, 'Unified preview active: fixed baseline (14 mixed simulated students).', 'ok');
  hostQuestionCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stopPreviewMode() {
  previewMode.active = false;
  if (previewMode.prevPrimaryAudioHost != null) {
    live.host.isPrimaryAudioHost = !!previewMode.prevPrimaryAudioHost;
    previewMode.prevPrimaryAudioHost = null;
  }
  previewMode.showReveal = false;
  previewMode.answeredCurrent = false;
  previewMode.revealedResult = null;
  if (previewExitBtn) previewExitBtn.classList.add('hidden');
  if (previewRerollBtn) previewRerollBtn.classList.add('hidden');
  if (previewResimBtn) previewResimBtn.classList.add('hidden');
  if (previewJumpInputEl) previewJumpInputEl.classList.add('hidden');
  if (previewJumpBtn) previewJumpBtn.classList.add('hidden');
  if (studentPreviewStackCardEl) studentPreviewStackCardEl.classList.add('hidden');
  setStatus(joinFeedbackEl, '', '');
  setStatus(hostStatusEl, 'Preview mode closed.', 'ok');
}

// ---------- Student Preview (opens as assignment in new tab) ----------
async function launchStudentPreviewAssignment() {
  try {
    syncQuizFromUI();
    if (!quiz.title?.trim()) {
      setStatus(hostStatusEl, 'Add a quiz title first.', 'bad');
      return;
    }
    if (!quiz.questions?.length) {
      setStatus(hostStatusEl, 'Add at least 1 question first.', 'bad');
      return;
    }

    const btn = document.getElementById('studentPreviewBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating…'; }
    setStatus(hostStatusEl, 'Creating preview assignment…', 'ok');

    if (!createSessionPassword) {
      createSessionPassword = prompt('Enter teacher password to create preview:');
      if (!createSessionPassword) {
        if (btn) { btn.disabled = false; btn.textContent = '🧑‍🎓 Preview'; }
        setStatus(hostStatusEl, 'Preview cancelled.', 'bad');
        return;
      }
    }

    await ensureQuizMediaReady({ contextLabel: 'student preview', convertTtsToMp3: true, strictMediaCheck: false });

    const payload = normalizeQuizForLive(quiz);
    const data = await api('/api/assignments/create', {
      method: 'POST',
      body: {
        password: createSessionPassword,
        title: `[Preview] ${quiz.title}`,
        className: '__preview__',
        attemptsLimit: 0,
        dueAt: null,
        randomNames: true,
        feedbackMode: 'instant',
        quiz: payload,
      },
    });

    const code = data?.assignment?.code;
    if (!code) throw new Error('No assignment code returned.');

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/create\/?$/, '/');
    const previewUrl = `${baseUrl}?assignment=${encodeURIComponent(code)}`;
    window.open(previewUrl, '_blank');

    setStatus(hostStatusEl, `Preview assignment created: ${code}. Opening in new tab…`, 'ok');
  } catch (err) {
    setStatus(hostStatusEl, `Preview failed: ${err?.message || err}`, 'bad');
  } finally {
    const btn = document.getElementById('studentPreviewBtn');
    if (btn) { btn.disabled = false; btn.textContent = '🧑‍🎓 Preview'; }
  }
}

function buildPreviewHostQuestion(q) {
  if (!q) return null;
  const base = {
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    timeLimit: q.timeLimit,
    isPoll: !!q.isPoll,
    imageData: String(q.imageData || '') || undefined,
    pinMode: ['any', 'all'].includes(String(q.pinMode)) ? String(q.pinMode) : (parseInt(String(q.pinMode), 10) >= 1 ? String(q.pinMode) : 'all'),
    zoneCount: Array.isArray(q.zones) ? q.zones.length : (q.zone ? 1 : 1),
  };

  if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
    const answers = (q.answers || []).map((a) => ({ text: String(a.text || ''), isCorrect: !!a.correct }));
    return { ...base, answers, correctIndexes: answers.map((a, i) => (a.isCorrect ? i : null)).filter((x) => x !== null) };
  }

  if (q.type === 'text') return { ...base, accepted: q.accepted || [] };
  if (q.type === 'puzzle') return { ...base, options: q.items || [], items: q.items || [] };
  if (q.type === 'slider') return { ...base, min: q.min, max: q.max, target: q.target, margin: q.margin, unit: q.unit };
  if (q.type === 'context_gap') return { ...base, gapCount: Number((q.gaps || []).filter(Boolean).length || 0) };
  if (q.type === 'match_pairs') {
    return {
      ...base,
      leftItems: (q.pairs || []).map((p) => String(p.left || '')).filter(Boolean),
      rightOptions: (q.pairs || []).map((p) => String(p.right || '')).filter(Boolean),
      pairs: q.pairs || [],
    };
  }
  if (q.type === 'error_hunt') return { ...base, corrected: q.corrected, correctedVariants: q.correctedVariants, requiredErrors: q.requiredErrors };
  return base;
}

function evaluatePreviewAnswer(q, answer) {
  if (!q) return { correct: false };
  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const selected = Number(answer);
    const correctIndex = (q.answers || []).findIndex((a) => !!a.correct);
    return { correct: Number.isFinite(selected) && selected === correctIndex };
  }
  if (q.type === 'multi') {
    const selected = Array.isArray(answer) ? answer.map(Number).filter(Number.isFinite) : [];
    const expected = (q.answers || []).map((a, i) => (a.correct ? i : null)).filter((x) => x !== null);
    return { correct: selected.length === expected.length && selected.every((i) => expected.includes(i)) };
  }
  if (q.type === 'text') {
    const guess = normalizeTextAnswer(answer);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    return { correct: accepted.length ? accepted.includes(guess) : false };
  }
  if (q.type === 'open' || q.type === 'image_open' || q.type === 'speaking' || q.type === 'voice_record') return { correct: false, graded: false };
  if (q.type === 'context_gap') {
    return { correct: isContextGapCorrect(answer, q.gaps || []) };
  }
  if (q.type === 'match_pairs') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    return { correct: isMatchPairsCorrect(guess, q.pairs || []) };
  }
  if (q.type === 'error_hunt') {
    const rewrite = String(answer?.rewrite || '').trim();
    return { correct: isErrorHuntRewriteCorrect(rewrite, q) };
  }
  if (q.type === 'puzzle') {
    const expected = (q.items || []).map(normalizeTextAnswer).filter(Boolean);
    const got = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    return { correct: got.length === expected.length && JSON.stringify(got) === JSON.stringify(expected) };
  }
  if (q.type === 'slider') {
    const value = Number(answer);
    const tol = sliderTolerance(q.margin, q.min, q.max);
    return { correct: Number.isFinite(value) && Math.abs(value - Number(q.target)) <= tol };
  }
  if (q.type === 'pin') {
    const zones = normalizePinZones(q);
    const picksRaw = Array.isArray(answer) ? answer : (answer && Number.isFinite(Number(answer.x)) && Number.isFinite(Number(answer.y)) ? [answer] : []);
    const picks = picksRaw
      .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!picks.length) return { correct: false };
    const pinMode = String(q.pinMode || 'all');
    let required = 1;
    if (pinMode === 'all') required = zones.length;
    else if (pinMode === 'any') required = 1;
    else { const n = parseInt(pinMode, 10); if (n >= 1) required = Math.max(1, Math.min(zones.length, n)); }
    const coveredCount = zones.filter((z) => picks.some((p) => distance2D(p.x, p.y, Number(z.x), Number(z.y)) <= Number(z.r))).length;
    const ok = coveredCount >= required;
    return { correct: ok };
  }
  return { correct: false };
}

function hashStringInt(text = '') {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

function seededUnit(key = '') {
  return (hashStringInt(key) % 10000) / 10000;
}

function previewCorrectRatio(profile) {
  if (profile === 'mostly_correct') return 0.75;
  if (profile === 'mostly_wrong') return 0.25;
  return 0.5;
}

function previewAnsweredRatio(timingProfile) {
  if (timingProfile === 'instant') return 1;
  if (timingProfile === 'last_second') return 0.4;
  if (timingProfile === 'mixed_late') return 0.55;
  return 0.7;
}

function applyPreviewEdgeCase(players, edgeCase = 'none') {
  const next = (players || []).map((p) => ({ ...p }));
  if (edgeCase === 'no_submissions') {
    next.forEach((p) => {
      p.answeredCurrent = false;
      p.previewResult = 'none';
      p.previewBet = 0;
    });
    return next;
  }
  if (edgeCase === 'all_correct') {
    next.forEach((p, i) => {
      p.answeredCurrent = true;
      p.score = Math.max(0, 1000 - (i * 20));
      p.previewResult = 'correct';
      p.previewBet = p.previewBet || 1;
    });
    return next;
  }
  if (edgeCase === 'all_wrong') {
    next.forEach((p) => {
      p.answeredCurrent = true;
      p.score = 0;
      p.previewResult = 'wrong';
      p.previewBet = p.previewBet || 1;
    });
    return next;
  }
  return next;
}

function randomPreviewNames(count = 14) {
  const first = ['Nova', 'Leo', 'Mia', 'Kai', 'Iris', 'Nora', 'Adam', 'Luna', 'Eric', 'Sara', 'Dani', 'Pol', 'Aina', 'Hugo', 'Noa', 'Jan', 'Laia', 'Marc', 'Clara', 'Pau'];
  const last = ['Orion', 'Vega', 'Cosmo', 'Stellar', 'Comet', 'Nebula', 'Meteor', 'Pulse', 'Quantum', 'Drift', 'Ray', 'Orbit'];
  const out = [];
  const used = new Set();
  const target = Math.max(1, Math.min(60, Number(count || 14)));
  while (out.length < target) {
    const name = `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push(name);
  }
  return out;
}

function buildPreviewPlayersSim(count, profile, timingProfile, points = 1000) {
  const total = Math.max(1, Math.min(60, Number(count || 10)));
  const ratio = previewCorrectRatio(profile);
  const answeredRatio = previewAnsweredRatio(timingProfile);
  const answeredCut = Math.max(1, Math.round(total * answeredRatio));
  const players = [];
  for (let i = 0; i < total; i++) {
    const rank = i + 1;
    const answeredCurrent = rank <= answeredCut;
    const roll = seededUnit(`${previewMode.simQuestionSeed}:${rank}:roll`);
    const correct = answeredCurrent && (roll < ratio);
    const hasBet = answeredCurrent && seededUnit(`${previewMode.simQuestionSeed}:${rank}:bet`) < 0.4;
    const betPool = [1, 2, 3];
    const bet = hasBet ? betPool[Math.floor(seededUnit(`${previewMode.simQuestionSeed}:${rank}:betv`) * betPool.length)] : 0;
    // Simulate score and incorporate their mathematical bet consequence
    let score = 1000;
    if (answeredCurrent) {
      if (correct) {
        const baseAwarded = Math.max(0, points - (rank * 20));
        const bonusRate = bet === 1 ? 0.15 : (bet === 2 ? 0.25 : (bet === 3 ? 0.4 : 0));
        score += Math.round(baseAwarded * (1 + bonusRate));
      } else {
        const penaltyRate = bet === 1 ? 0.05 : (bet === 2 ? 0.15 : (bet === 3 ? 0.4 : 0));
        score -= Math.round(points * penaltyRate);
      }
    }

    players.push({
      id: `p${rank}`,
      name: previewMode.simNames?.[i] || `Student ${rank}`,
      score: Math.max(0, score),
      answeredCurrent,
      previewResult: answeredCurrent ? (correct ? 'correct' : 'wrong') : 'none',
      previewBet: bet,
    });
  }
  return players;
}

function buildPreviewTextAnswer(name, quality, prompt = '') {
  const topic = String(prompt || 'the topic').split(/[.?!]/)[0].trim() || 'the topic';
  if (quality === 'excellent') return `${name}: Clear, accurate answer with strong example about ${topic}.`;
  if (quality === 'weak') return `${name}: maybe about ${topic}, not sure...`;
  if (quality === 'empty') return '';
  return `${name}: Correct idea with simple explanation about ${topic}.`;
}

function getPreviewTeacherPatch(qIndex, playerId) {
  const byQ = previewMode.simTeacherByQ || {};
  const qKey = String(Number(qIndex || 0));
  return byQ?.[qKey]?.[String(playerId || '')] || null;
}

function setPreviewTeacherPatch(qIndex, playerId, patch) {
  const qKey = String(Number(qIndex || 0));
  const pKey = String(playerId || '');
  if (!previewMode.simTeacherByQ[qKey]) previewMode.simTeacherByQ[qKey] = {};
  previewMode.simTeacherByQ[qKey][pKey] = {
    ...(previewMode.simTeacherByQ[qKey][pKey] || {}),
    ...(patch || {}),
  };
}

function buildPreviewOpenResponses(question, simPlayers, quality) {
  const teacherGraded = question && (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'voice_record' || (question.type === 'text' && !(question.accepted || []).filter((x) => String(x || '').trim()).length));
  if (!teacherGraded) return [];

  return simPlayers
    .filter((p) => p.answeredCurrent)
    .map((p, idx) => {
      const q = quality === 'acceptable' && idx % 4 === 0 ? 'excellent' : quality;
      const answer = question.type === 'speaking'
        ? '__spoken__'
        : question.type === 'voice_record'
        ? '__voice_record__'
        : buildPreviewTextAnswer(p.name, q, question.prompt || '');
      const base = {
        playerId: p.id,
        name: p.name,
        answer,
        graded: false,
        pointsAwarded: 0,
        hidden: false,
        correction: '',
        modelAnswer: false,
      };
      const patch = getPreviewTeacherPatch(previewMode.index, p.id);
      return patch ? { ...base, ...patch } : base;
    });
}

function summarizePreviewStudentAnswer(question, player, openResponseMap = null) {
  if (!question || !player?.answeredCurrent) return '(no submission)';

  if (openResponseMap && (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'voice_record' || question.type === 'text')) {
    const txt = String(openResponseMap.get(player.id) || '').trim();
    if (txt) return txt;
  }

  const ok = player.previewResult === 'correct';
  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const correctIdx = Math.max(0, answers.findIndex((a) => !!a.isCorrect));
    const wrongIdx = Math.max(0, answers.findIndex((a, i) => !a.isCorrect && i !== correctIdx));
    const idx = ok ? correctIdx : wrongIdx;
    return `option ${idx + 1}: ${String(answers[idx]?.text || '').trim() || '(blank option)'}`;
  }
  if (question.type === 'multi') return ok ? 'multi: full correct set' : 'multi: partial/wrong set';
  if (question.type === 'context_gap') return ok ? 'gaps: all correct' : 'gaps: one or more wrong';
  if (question.type === 'match_pairs') return ok ? 'pairs: all matched' : 'pairs: mismatched pairs';
  if (question.type === 'error_hunt') return ok ? 'rewrite: corrected sentence' : 'rewrite: needs fixes';
  if (question.type === 'open' || question.type === 'image_open') return ok ? 'open: strong response' : 'open: basic response';
  if (question.type === 'speaking') return ok ? 'speaking: clear oral response' : 'speaking: oral response needs improvement';
  if (question.type === 'voice_record') return ok ? 'voice: clear recording' : 'voice: recording needs review';
  if (question.type === 'slider') {
    const min = Number(question.min || 0);
    const max = Number(question.max || 100);
    const target = Number(question.target || ((min + max) / 2));
    const spread = Math.max(1, Math.round((max - min) * 0.12));
    const value = ok ? target : Math.min(max, target + spread);
    return `slider value: ${value}${question.unit ? ` ${question.unit}` : ''}`;
  }
  if (question.type === 'pin') return ok ? 'pin: inside valid zone' : 'pin: outside valid zone';
  if (question.type === 'puzzle') return ok ? 'puzzle: correct order' : 'puzzle: wrong order';
  return ok ? 'correct submission' : 'incorrect submission';
}

function renderPreviewStudentStack(sim) {
  if (!studentPreviewStackEl) return;
  studentPreviewStackEl.innerHTML = '';
  const list = sim?.hostState?.players || [];
  const openResponseMap = new Map((sim?.hostState?.openResponses || []).map((r) => [String(r.playerId || ''), String(r.answer || '')]));

  if (studentPreviewSummaryEl) {
    const correct = list.filter((p) => p.previewResult === 'correct').length;
    const wrong = list.filter((p) => p.previewResult === 'wrong').length;
    const none = list.filter((p) => p.previewResult === 'none').length;
    const bets = list.filter((p) => Number(p.previewBet || 0) > 0).length;
    const submitted = list.length - none;
    const phase = previewMode.showReveal ? 'reveal' : 'question';
    const qSeed = String(previewMode.simQuestionSeed || 0).slice(-6);
    studentPreviewSummaryEl.textContent = `Summary: ${submitted}/${list.length} submitted · ${correct} correct · ${wrong} wrong · ${none} no submission · ${bets} with bet · phase: ${phase} · seed:${qSeed}`;
  }

  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card top-space';
    const status = p.previewResult === 'correct'
      ? 'submitted ✅'
      : (p.previewResult === 'wrong' ? 'submitted ❌' : 'no submission');
    const bet = Number(p.previewBet || 0);
    const betTxt = bet > 0 ? ` · bet x${bet}` : '';
    const answerText = summarizePreviewStudentAnswer(sim?.hostState?.question, p, openResponseMap);
    const stateChip = p.previewResult === 'correct'
      ? '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#e8f8ee;color:#0f5e26;">correct</span>'
      : (p.previewResult === 'wrong'
        ? '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#fdeaea;color:#8b1e1e;">wrong</span>'
        : '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#f1f5f9;color:#334155;">no submit</span>');
    const betChip = bet > 0
      ? `<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#fef3c7;color:#7c2d12;">bet x${bet}</span>`
      : '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#f1f5f9;color:#334155;">no bet</span>';
    card.innerHTML = `<div class="row spread gap"><strong>${escapeHtml(p.name)}</strong><span class="small">#${i + 1}</span></div><div class="row gap top-space">${stateChip}${betChip}</div><div class="small">Score: ${Number(p.score || 0)} · ${status}${betTxt}</div><div class="small muted">Answer: ${escapeHtml(answerText)}</div>`;
    studentPreviewStackEl.appendChild(card);
  });
}

function buildPreviewAnswerHistory(question, simPlayers, openResponses) {
  const q = question || {};
  const openMap = new Map((openResponses || []).map((r) => [String(r.playerId || ''), r]));
  const entries = (simPlayers || []).map((p) => {
    const r = openMap.get(String(p.id || ''));
    const graded = !!r?.graded;
    const pointsAwarded = Number(r?.pointsAwarded || 0);
    const answerText = r ? String(r.answer || '') : summarizePreviewStudentAnswer(q, p, new Map((openResponses || []).map((x) => [String(x.playerId || ''), String(x.answer || '')])));
    return {
      playerId: p.id,
      name: p.name,
      answerText,
      correct: p.previewResult === 'correct',
      graded,
      pointsAwarded,
      hidden: false,
      correction: String(r?.correction || ''),
      modelAnswer: !!r?.modelAnswer,
    };
  });

  return [{
    qIndex: Number(previewMode.index || 0),
    prompt: String(q.prompt || ''),
    type: String(q.type || ''),
    entries,
  }];
}

function previewCloseReasonForSeed(seed) {
  const n = Number(seed || 0) % 3;
  if (n === 0) return 'manual_reveal';
  if (n === 1) return 'all_answered';
  return 'timeout';
}

function buildPreviewSimulationState(question) {
  const safeQuestion = buildPreviewHostQuestion(question);
  previewMode.simQuestionSeed = hashStringInt(`${previewMode.simClassSeed}:${previewMode.index}:${question?.id || question?.prompt || ''}`);
  const simPlayersBase = buildPreviewPlayersSim(
    previewMode.simStudentCount,
    previewMode.simProfile,
    previewMode.simTimingProfile,
    Number(question?.points || 1000),
  );
  const simPlayers = applyPreviewEdgeCase(simPlayersBase, previewMode.simEdgeCaseProfile);
  const answeredCount = simPlayers.filter((p) => p.answeredCurrent).length;
  const me = simPlayers[0] || { name: 'Preview Student', score: 0, answeredCurrent: false };

  const openResponses = buildPreviewOpenResponses(question, simPlayers, previewMode.simTextQualityProfile);
  const now = Date.now();
  const qLimit = Number(question?.timeLimit || 0);
  const startedAt = now - 4000;
  const deadlineAt = qLimit > 0 ? (startedAt + (qLimit * 1000)) : null;
  const closeReason = previewMode.showReveal ? previewCloseReasonForSeed(previewMode.simQuestionSeed) : null;
  const hostState = {
    phase: 'question',
    currentIndex: previewMode.index,
    totalQuestions: quiz.questions.length,
    responseCount: answeredCount,
    playerCount: simPlayers.length,
    question: safeQuestion,
    questionStartedAt: startedAt,
    questionDeadlineAt: deadlineAt,
    questionClosed: !!previewMode.showReveal,
    questionClosedAt: previewMode.showReveal ? now : null,
    questionCloseReason: closeReason,
    correctAnswer: '',
    pollSummary: null,
    openResponses,
    answerHistory: buildPreviewAnswerHistory(question, simPlayers, openResponses),
    players: simPlayers,
    reactions: [],
  };

  const studentState = {
    phase: 'question',
    name: me.name,
    currentIndex: previewMode.index,
    totalQuestions: quiz.questions.length,
    score: Number(me.score || 0),
    answeredCurrent: previewMode.answeredCurrent || !!me.answeredCurrent,
    question: safeQuestion,
    questionClosed: !!previewMode.showReveal,
    questionStartedAt: startedAt,
    questionDeadlineAt: deadlineAt,
    questionClosedAt: previewMode.showReveal ? now : null,
    questionCloseReason: closeReason,
    correctAnswer: previewMode.showReveal ? hostCorrectSummary(question) : '', // <--- FIX: Ensure the correct text is actually forwarded
    revealedResult: previewMode.revealedResult,
    leaderboard: simPlayers.slice(0, 10).map((p) => ({ name: p.name, score: p.score })),
  };

  return { hostState, studentState };
}

function renderPreviewFrame() {
  if (!previewMode.active) return;
  const q = quiz.questions[previewMode.index];
  if (!q) return;

  const sim = buildPreviewSimulationState(q);

  if (studentPreviewStackCardEl) studentPreviewStackCardEl.classList.remove('hidden');
  if (liveProgressEl) liveProgressEl.textContent = `Progress: ${previewMode.index + 1} / ${quiz.questions.length}`;
  if (livePhaseEl) {
    const reason = sim.hostState.questionClosed ? ` · close=${sim.hostState.questionCloseReason || 'manual_reveal'}` : '';
    livePhaseEl.textContent = `Phase: question${reason}`;
  }
  if (liveResponsesEl) liveResponsesEl.textContent = `Answers this round: ${sim.hostState.responseCount} / ${sim.hostState.playerCount}`;
  if (projectorAnswersEl) projectorAnswersEl.textContent = `👥 Answers: ${sim.hostState.responseCount} / ${sim.hostState.playerCount}`;
  renderProjectorScores(sim.hostState.players || []);
  // Skip intro animation in preview — render question content immediately
  live.host.questionIntroDone = true;
  renderHostQuestion(sim.hostState);
  renderHostAnswerHistory(sim.hostState);
  renderPreviewStudentStack(sim);
}

function ensureHostReady() {
  if (!live.host.pin || !live.host.token) throw new Error('Create a live game first.');
}

// ---------- Solo mode ----------
function bindSoloEvents() {
  if (!startBtn || !submitBtn || !nextBtn || !playAgainBtn || !lobbyCard || !gameCard || !resultCard) {
    return;
  }

  startBtn.addEventListener('click', () => {
    syncQuizFromUI();
    if (!quiz.title?.trim()) return alert('Add a quiz title first.');
    if (!quiz.questions.length) return alert('Add at least 1 question.');

    soloGame = {
      student: studentNameEl.value.trim() || 'Student',
      index: 0,
      score: 0,
      answered: false,
      pinSelection: null,
      puzzleOptions: null,
    };

    lobbyCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    gameCard.classList.remove('hidden');
    renderSoloQuestion();
  });

  submitBtn.addEventListener('click', () => {
    if (!soloGame || soloGame.answered) return;

    const q = quiz.questions[soloGame.index];
    const result = evaluateSoloQuestion(q);

    const basePoints = Number(q.points || 1000);
    let pts = 0;

    // FIX: Apply Solo Mode Bet Math
    if (result.correct) {
      pts = live.player.selectedBet === 3 ? Math.round(basePoints * 1.4) : basePoints;
      soloGame.score += pts;
      setStatus(feedbackEl, `Correct ✅ (+${pts})`, 'ok');
    } else {
      pts = live.player.selectedBet === 3 ? -Math.round(basePoints * 0.4) : 0; // <-- FIXED: Changed from 0.3 to 0.4
      soloGame.score += pts;
      const ptsText = pts < 0 ? ` (${pts} pts)` : '';
      setStatus(feedbackEl, `Not quite ❌ ${result.hint || ''}${ptsText}`.trim(), 'bad');
    }

    soloGame.answered = true;
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    scoreEl.textContent = `Score: ${soloGame.score}`;

    const betBtn = document.getElementById('betIndicator');
    if (betBtn) betBtn.disabled = true;
  });

  nextBtn.addEventListener('click', () => {
    if (!soloGame) return;
    soloGame.index += 1;
    soloGame.answered = false;

    if (soloGame.index >= quiz.questions.length) {
      finishSoloGame();
      return;
    }

    renderSoloQuestion();
  });

  playAgainBtn.addEventListener('click', () => {
    soloGame = null;
    resultCard.classList.add('hidden');
    gameCard.classList.add('hidden');
    lobbyCard.classList.remove('hidden');
    refreshLocalPin();
  });
}

function renderSoloQuestion() {
  const q = quiz.questions[soloGame.index];
  progressEl.textContent = `Question ${soloGame.index + 1} / ${quiz.questions.length}`;
  scoreEl.textContent = `Score: ${soloGame.score}`;
  qPromptEl.textContent = q.prompt || '(No question text)';

  soloGame.pinSelection = null;
  soloGame.puzzleOptions = null;

  // FIX: Reset bet button cleanly
  live.player.selectedBet = 0;
  betSelected = false;
  const betBtn = document.getElementById('betIndicator');
  if (betBtn) {
    betBtn.classList.remove('selected');
    betBtn.disabled = false;
  }

  setStatus(feedbackEl, '', '');
  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');

  answersEl.innerHTML = '';

  if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
    const isMulti = q.type === 'multi';

    (q.answers || []).forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      if (!isMulti) input.name = 'solo-answer';
      input.value = String(idx);
      input.dataset.soloAnswer = '1';

      const text = document.createElement('span');
      text.textContent = a.text || '(blank)';

      row.append(input, text);
      answersEl.appendChild(row);
    });



    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'text' || q.type === 'open' || q.type === 'image_open' || q.type === 'speaking' || q.type === 'voice_record' || q.type === 'context_gap' || q.type === 'error_hunt') {
    if (q.type === 'image_open' && q.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = q.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      answersEl.appendChild(preview);
    }

    if (q.type === 'context_gap') {
      const count = Math.max(1, Math.min(10, Number((q.gaps || []).filter(Boolean).length || 1)));
      renderInlineContextGapInputs(answersEl, q.prompt, count, 'soloGap');
    } else if (q.type === 'error_hunt') {
      const required = getErrorHuntRequired(q);
      const info = document.createElement('p');
      info.className = 'small';
      info.textContent = `Find ${required} wrong token(s), then rewrite.`;
      answersEl.appendChild(info);

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'row gap';
      tokenWrap.style.flexWrap = 'wrap';
      const tokens = String(q.prompt || '').split(/\s+/).filter(Boolean);
      tokens.forEach((tok, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn error-token-chip';
        b.dataset.soloErrorToken = String(i);
        b.dataset.tokenText = tok;
        b.dataset.originalText = tok;
        b.textContent = tok;

        const normalizeToken = (txt) => String(txt || '').replace(/\s+/g, '').toLowerCase();
        const makeEditable = () => {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = b.dataset.tokenText || b.textContent || '';
          input.style.minWidth = '80px';
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              input.blur();
            }
          });
          input.addEventListener('blur', () => {
            const newText = String(input.value || '').trim();
            if (newText) {
              const nextBtn = b.nextElementSibling?.dataset?.tokenText ? b.nextElementSibling : null;
              const mergedCandidate = (b.dataset.tokenText || '') + (nextBtn ? nextBtn.dataset.tokenText || '' : '');
              if (nextBtn && normalizeToken(newText) === normalizeToken(mergedCandidate)) {
                nextBtn.remove();
              }
              b.dataset.tokenText = newText;
              b.textContent = newText;

              // Auto-set active state if edited
              const origToken = String(b.dataset.originalText || '').trim();
              if (origToken && newText !== origToken) {
                b.classList.add('active');
              } else if (origToken && newText === origToken) {
                b.classList.remove('active');
              }
            }
            b.classList.remove('editing');
            if (b.contains(input)) b.removeChild(input);
          });
          b.classList.add('editing');
          b.innerHTML = '';
          b.appendChild(input);
          input.focus();
          input.select();
        };

        b.addEventListener('click', (e) => {
          if (b.classList.contains('editing')) return;
          if (e.altKey || e.metaKey || e.ctrlKey) {
            makeEditable();
            return;
          }
          const isActive = b.classList.contains('active');
          if (isActive) {
            b.classList.remove('active');
            return;
          }
          const activeCount = tokenWrap.querySelectorAll('[data-solo-error-token].active').length;
          if (activeCount >= required) return;
          b.classList.add('active');
        });

        b.addEventListener('dblclick', () => makeEditable());

        tokenWrap.appendChild(b);
      });
      answersEl.appendChild(tokenWrap);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'soloErrorRewrite';
      input.maxLength = 160;
      input.placeholder = 'Rewrite the corrected sentence';
      input.className = 'top-space';
      input.addEventListener('input', () => { input.dataset.fromTokens = '0'; });
      answersEl.appendChild(input);
      enableInlineErrorTokenEditing(tokenWrap, '[data-solo-error-token]', input);
    } else if (q.type === 'match_pairs') {
      const leftItems = (q.pairs || []).map((p) => String(p.left || '').trim()).filter(Boolean);
      const rightOptions = shuffle((q.pairs || []).map((p) => String(p.right || '').trim()).filter(Boolean));
      if (q.imageData) {
        const overlay = document.createElement('div');
        overlay.id = 'matchPairsCenterOverlay';
        overlay.className = 'match-pairs-center-overlay host-mode';
        const imgWrap = document.createElement('div');
        imgWrap.className = 'match-pairs-img-wrap';
        const img = document.createElement('img');
        img.src = q.imageData;
        img.dataset.zoomable = '1';
        imgWrap.appendChild(img);
        const pairsWrap = document.createElement('div');
        pairsWrap.className = 'match-pairs-content-wrap';
        renderMatchPairsColumns(pairsWrap, leftItems, rightOptions, 'soloPair');
        overlay.append(imgWrap, pairsWrap);
        answersEl.appendChild(overlay);
      } else {
        renderMatchPairsColumns(answersEl, leftItems, rightOptions, 'soloPair');
      }
    } else if (q.type === 'speaking') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Speaking question: answer orally and get graded by teacher in live mode.';
      answersEl.appendChild(note);
    } else if (q.type === 'voice_record') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Voice recording: available in assignment mode.';
      answersEl.appendChild(note);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'soloTextAnswer';
      input.maxLength = 120;
      input.placeholder = (q.type === 'open' || q.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';
      answersEl.appendChild(input);
    }

    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'puzzle') {
    const options = (q.options || shuffle([...(q.items || []).filter(Boolean)])).slice(0, 12);
    soloGame.puzzleOptions = options;
    createPuzzleDnd(answersEl, options, 'soloPuzzlePieces');

    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'slider') {
    const wrap = document.createElement('div');
    wrap.className = 'slider-inline-wrap';
    const value = Number(q.min || 0);
    wrap.innerHTML = `
      <input id="soloSlider" type="range" min="${q.min}" max="${q.max}" step="1" value="${value}" />
      <div id="soloSliderValue" class="slider-big-val">${value}${q.unit ? ` ${escapeHtml(q.unit)}` : ''}</div>
    `;
    answersEl.appendChild(wrap);

    const slider = document.getElementById('soloSlider');
    const out = document.getElementById('soloSliderValue');
    slider.addEventListener('input', () => {
      out.textContent = `${slider.value}${q.unit ? ` ${escapeHtml(q.unit)}` : ''}`;
    });
    return;
  }

  if (q.type === 'pin') {
    if (!q.imageData) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No image set for this question.';
      answersEl.appendChild(p);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';

    const img = document.createElement('img');
    img.src = q.imageData;
    img.alt = 'Pin question image';

    const picksLayer = document.createElement('div');
    picksLayer.className = 'pin-picks-layer';

    syncPicksLayerBounds(wrap, picksLayer, img);

    const zonesCount = q.zoneCount || (Array.isArray(q.zones) && q.zones.length ? q.zones.length : 1);
    const pinMode = String(q.pinMode || 'all');
    let required = 1;
    if (pinMode === 'all') required = Math.max(1, Math.min(12, zonesCount));
    else if (pinMode === 'any') required = 1;
    else { const n = parseInt(pinMode, 10); if (n >= 1) required = Math.max(1, Math.min(zonesCount, n)); }

    const countLabel = document.createElement('div');
    countLabel.className = 'pin-count-big';
    countLabel.textContent = `0 / ${required}`;

    wrap.append(img, picksLayer);
    answersEl.appendChild(wrap);
    answersEl.appendChild(countLabel);

    const renderPicks = () => {
      picksLayer.innerHTML = '';
      const picks = soloGame.pinSelections || [];
      countLabel.textContent = `${Math.min(picks.length, required)} / ${required}`;
      picks.forEach((p) => {
        const dot = document.createElement('div');
        dot.className = 'pin-dot';
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
        picksLayer.appendChild(dot);
      });
    };

    soloGame.pinSelections = [];

    attachPinPicker(wrap, (point) => {
      const picks = soloGame.pinSelections || [];
      const nearIdx = picks.findIndex((p) => distance2D(p.x, p.y, point.x, point.y) <= 4);
      if (nearIdx >= 0) picks.splice(nearIdx, 1);
      else if (picks.length < required) picks.push(point);
      soloGame.pinSelections = picks;
      soloGame.pinSelection = picks[0] || null;
      renderPicks();
    });

    renderPicks();
  }
}
function evaluateSoloQuestion(q) {
  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const checked = answersEl.querySelector('input[name="solo-answer"]:checked');
    if (!checked) return { correct: false, hint: 'Select an answer first.' };

    const selected = Number(checked.value);
    const correctIndex = (q.answers || []).findIndex((a) => !!a.correct);
    return { correct: selected === correctIndex };
  }

  if (q.type === 'multi') {
    const selected = [...answersEl.querySelectorAll('input[data-solo-answer]:checked')].map((el) => Number(el.value));
    if (!selected.length) return { correct: false, hint: 'Select at least one answer.' };

    const expected = (q.answers || [])
      .map((a, idx) => (a.correct ? idx : null))
      .filter((x) => x !== null);

    const sameLength = selected.length === expected.length;
    const sameSet = sameLength && selected.every((idx) => expected.includes(idx));
    return { correct: sameSet, hint: sameSet ? '' : 'You must select all correct answers (and no wrong ones).' };
  }

  if (q.type === 'text') {
    const val = document.getElementById('soloTextAnswer')?.value || '';
    const guess = normalizeTextAnswer(val);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);

    if (!accepted.length) return { correct: false, hint: 'No accepted answers set.' };
    return { correct: accepted.includes(guess), hint: `Accepted: ${accepted.slice(0, 2).join(' / ')}` };
  }

  if (q.type === 'open' || q.type === 'image_open') {
    const val = String(document.getElementById('soloTextAnswer')?.value || '').trim();
    if (!val) return { correct: false, hint: 'Type an answer first.' };
    return { correct: false, hint: 'Open answer needs teacher grading in live mode.' };
  }

  if (q.type === 'speaking') {
    return { correct: false, hint: 'Speaking answer is teacher-graded in live mode.' };
  }

  if (q.type === 'voice_record') {
    return { correct: false, hint: 'Voice recording is teacher-graded.' };
  }

  if (q.type === 'context_gap') {
    const guess = [...answersEl.querySelectorAll('[data-solo-gap]')].map((el) => String(el.value || ''));
    const expectedOptions = contextGapExpectedOptions(q.gaps || []);
    if (!guess.length || guess.filter((x) => normalizeTextAnswer(x)).length !== expectedOptions.length) {
      return { correct: false, hint: 'Complete all blanks.' };
    }
    const expectedHint = expectedOptions.map((opts) => opts.join(' / ')).join(' | ');
    return { correct: isContextGapCorrect(guess, q.gaps || []), hint: `Expected: ${expectedHint}` };
  }

  if (q.type === 'match_pairs') {
    const guess = [...answersEl.querySelectorAll('[data-solo-pair]')].map((el) => normalizeTextAnswer(el.value)).filter(Boolean);
    const expected = (q.pairs || []).map((p) => normalizeTextAnswer(p.right)).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false, hint: 'Match all pairs first.' };
    return { correct: isMatchPairsCorrect(guess, q.pairs || []), hint: `Expected: ${expected.join(' | ')}` };
  }

  if (q.type === 'error_hunt') {
    const rewrite = String(document.getElementById('soloErrorRewrite')?.value || '').trim();
    if (!rewrite) return { correct: false, hint: 'Rewrite the sentence first.' };
    const selected = [...answersEl.querySelectorAll('[data-solo-error-token].active')];
    const required = getErrorHuntRequired(q);
    if (selected.length !== required) return { correct: false, hint: `Select exactly ${required} token(s).` };
    const ok = isErrorHuntRewriteCorrect(rewrite, q);
    return { correct: ok, hint: ok ? '' : `Expected: ${getCorrectedVariantsList(q.corrected, q.correctedVariants)[0] || ''}` };
  }

  if (q.type === 'puzzle') {
    const pieces = [...answersEl.querySelectorAll('[data-puzzle-piece]')].map((el) => String(el.dataset.puzzlePiece || '').trim()).filter(Boolean);
    if (!pieces.length) return { correct: false, hint: 'Arrange the pieces first.' };

    const expected = (q.items || []).map(normalizeTextAnswer).filter(Boolean);
    const got = pieces.map(normalizeTextAnswer);
    return { correct: JSON.stringify(expected) === JSON.stringify(got) };
  }

  if (q.type === 'slider') {
    const slider = document.getElementById('soloSlider');
    if (!slider) return { correct: false, hint: 'Move the slider first.' };

    const value = Number(slider.value);
    const tol = sliderTolerance(q.margin, q.min, q.max);
    const diff = Math.abs(value - Number(q.target));
    const ok = diff <= tol;
    return {
      correct: ok,
      hint: ok ? '' : `Correct around ${q.target}${q.unit ? ` ${q.unit}` : ''} (±${round(tol, 2)})`,
    };
  }

  if (q.type === 'pin') {
    if (!soloGame.pinSelection && (!soloGame.pinSelections || !soloGame.pinSelections.length)) return { correct: false, hint: 'Tap/click the image first.' };
    const zones = Array.isArray(q.zones) && q.zones.length ? q.zones : [q.zone || { x: 50, y: 50, r: 15 }];
    const picks = soloGame.pinSelections || (soloGame.pinSelection ? [soloGame.pinSelection] : []);
    const hits = zones.filter((z) => {
      return picks.some((p) => distance2D(p.x, p.y, Number(z.x || 50), Number(z.y || 50)) <= Number(z.r || 15));
    }).length;
    const pinMode = String(q.pinMode || 'all');
    let required = 1;
    if (pinMode === 'all') required = zones.length;
    else if (pinMode === 'any') required = 1;
    else { const n = parseInt(pinMode, 10); if (n >= 1) required = Math.max(1, Math.min(zones.length, n)); }
    const ok = hits >= required;
    return { correct: ok, hint: ok ? '' : (required > 1 ? `Try closer to all ${required} target areas.` : 'Try closer to a target area.') };
  }

  return { correct: false };
}

function finishSoloGame() {
  gameCard.classList.add('hidden');
  resultCard.classList.remove('hidden');

  const totalPossible = quiz.questions.reduce((sum, q) => sum + Number(q.points || 1000), 0);
  finalScoreEl.textContent = `${soloGame.student}, you scored ${soloGame.score} / ${totalPossible}.`;
}

function refreshLocalPin() {
  if (!pinValueEl) return;
  pinValueEl.textContent = String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- API ----------
async function api(path, opts = {}) {
  const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
  if (!base) throw new Error('Backend URL is not configured.');

  const method = opts.method || 'GET';
  const headers = {
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

// ---------- Data ----------
function createEmptyQuiz() {
  return {
    version: 1,
    title: '',
    ttsLanguage: 'NONE',
    language: '',
    readAllQuestionsAloud: false,
    questions: [],
  };
}

function collapseAllQuestions(targetQuiz) {
  if (!targetQuiz || !Array.isArray(targetQuiz.questions)) return;
  targetQuiz.questions.forEach((q) => {
    if (!q) return;
    q.collapsed = true;
  });
}

function makeMcqQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'mcq',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
    answers: [
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
    ],
  };
}

function makeMultiQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'multi',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
    answers: [
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: false },
    ],
  };
}

function makeTfQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'tf',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
    answers: [
      { text: 'True', correct: true },
      { text: 'False', correct: false },
    ],
  };
}

function makeTextQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'text',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
    accepted: ['', '', ''],
  };
}

function makeOpenQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'open',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeSpeakingQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'speaking',
    prompt: 'Speak your answer when called by the teacher.',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeVoiceRecordQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'voice_record',
    prompt: 'Record your spoken answer.',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeImageOpenQuestion() {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'image_open',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    imageData: '',
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeContextGapQuestion() {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'context_gap',
    prompt: 'Complete the paragraph: ...',
    points: 1000,
    timeLimit: 0,
    gaps: ['', '', ''],
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeMatchPairsQuestion() {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'match_pairs',
    prompt: 'Match each item with the correct pair.',
    points: 1000,
    timeLimit: 0,
    media: makeDefaultQuestionMedia(),
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makeErrorHuntQuestion() {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'error_hunt',
    prompt: 'She say that she go to school yesterday.',
    corrected: 'She said that she went to school yesterday.',
    points: 1000,
    timeLimit: 0,
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
  };
}

function makePuzzleQuestion(opts = {}) {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'puzzle',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    audioEnabled: opts.withAudio !== undefined ? !!opts.withAudio : quiz.readAllQuestionsAloud,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    items: ['', '', ''],
    media: makeDefaultQuestionMedia(),
  };
}

function makeAudioQuestion() {
  const ttsLanguage = quiz.ttsLanguage || DEFAULT_EDGE_TTS_LANGUAGE;
  const language = quiz.ttsLanguage === 'NONE' ? '' : (quiz.language || DEFAULT_EDGE_TTS_VOICE);
  return {
    id: crypto.randomUUID(),
    type: 'audio',
    prompt: '',
    audioEnabled: true,
    audioMode: 'tts',
    audioText: '',
    ttsLanguage,
    language,
    audioData: '',
    media: makeDefaultQuestionMedia(),
    points: 1000,
    timeLimit: 0,
    answers: [
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ],
  };
}

function makeSliderQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'slider',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    min: 0,
    max: 100,
    target: 50,
    margin: 'medium',
    unit: '',
    media: makeDefaultQuestionMedia(),
  };
}

function makePinQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'pin',
    prompt: '',
    points: 1000,
    timeLimit: 0,
    imageData: '',
    zones: [],
    pinMode: 'all',
    media: makeDefaultQuestionMedia(),
  };
}

function normalizePinZones(question) {
  let source = [];
  if (Array.isArray(question?.zones) && question.zones.length) {
    source = question.zones;
  } else if (question?.zone) {
    source = [question.zone];
  }

  return source
    .slice(0, 12)
    .map((z) => ({
      x: round(clamp(Number(z?.x ?? 50), 0, 100), 1),
      y: round(clamp(Number(z?.y ?? 50), 0, 100), 1),
      r: round(clamp(Number(z?.r ?? 7), 1, 100), 1),
    }));
}

function normalizeQuizForLive(raw) {
  const quizTtsLanguage = normalizeTtsLanguage(raw.ttsLanguage);
  const quizVoice = normalizeTtsVoice(raw.language, quizTtsLanguage);
  const normalized = {
    version: 1,
    title: String(raw.title || '').slice(0, 1200),
    ttsLanguage: quizTtsLanguage,
    language: quizVoice,
    readAllQuestionsAloud: !!raw.readAllQuestionsAloud,
    questions: [],
  };

  (raw.questions || []).forEach((q) => {
    const questionLangSeed = q.ttsLanguage || (q.language ? guessTtsLanguageFromVoice(q.language) : quizTtsLanguage);
    const questionTtsLanguage = normalizeTtsLanguage(questionLangSeed);
    const preferredQuestionVoice = q.language || (questionTtsLanguage === 'OTHER' ? quizVoice : '');
    const questionVoice = normalizeTtsVoice(preferredQuestionVoice, questionTtsLanguage);
    const base = {
      id: String(q.id || crypto.randomUUID()),
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 1200),
      points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
      timeLimit: normalizeTimeLimitValue(q.timeLimit, q.type),
      isPoll: !!q.isPoll,
      audioEnabled: !!q.audioEnabled || q.type === 'audio',
      audioMode: ['tts', 'file'].includes(String(q.audioMode || '')) ? String(q.audioMode) : 'tts',
      audioText: String(q.audioText || '').slice(0, 1200),
      ttsLanguage: questionTtsLanguage,
      language: questionVoice,
      audioData: String(q.audioData || ''),
      imageKeyword: String(q.imageKeyword || '').trim().slice(0, 140),
      videoKeyword: String(q.videoKeyword || '').trim().slice(0, 140),
      videoProviderPreference: ['youtube', 'vimeo', 'direct'].includes(String(q.videoProviderPreference || '')) ? String(q.videoProviderPreference) : '',
      imageData: String(q.imageData || ''),
      media: normalizeQuestionMedia(q.media),
    };

    if (base.ttsLanguage === 'OTHER' && !String(q.language || '').trim() && !String(raw.language || '').trim()) {
      base._ttsVoiceMissing = true;
    }

    if (['mcq', 'multi', 'audio'].includes(q.type)) {
      const answers = (q.answers || [])
        .slice(0, 10)
        .map((a) => ({ text: String(a.text || '').slice(0, 90), correct: !!a.correct }))
        .filter((a) => a.text.trim().length > 0);
      if (answers.length < 2) return;

      if (q.type === 'multi') {
        let correctCount = answers.filter((a) => a.correct).length;
        if (correctCount < 2) {
          for (let i = 0; i < answers.length && correctCount < 2; i++) {
            if (!answers[i].correct) {
              answers[i].correct = true;
              correctCount++;
            }
          }
        }
      } else if (!answers.some((a) => a.correct)) {
        answers[0].correct = true;
      }

      normalized.questions.push({
        ...base,
        answers,
      });
      return;
    }

    if (q.type === 'tf') {
      const tfTrue = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'true');
      const tfFalse = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'false');
      const answers = [
        { text: 'True', correct: tfTrue ? !!tfTrue.correct : !!q.answers?.[0]?.correct },
        { text: 'False', correct: tfFalse ? !!tfFalse.correct : !!q.answers?.[1]?.correct },
      ];
      if (!answers.some((a) => a.correct)) answers[0].correct = true;
      normalized.questions.push({ ...base, answers });
      return;
    }

    if (q.type === 'text') {
      const accepted = (q.accepted || []).slice(0, 20).map((x) => String(x || '').slice(0, 120));
      normalized.questions.push({ ...base, accepted });
      return;
    }

    if (q.type === 'open') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'speaking') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'voice_record') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'image_open') {
      if (!q.imageData) return;
      normalized.questions.push({ ...base, imageData: String(q.imageData || '') });
      return;
    }

    if (q.type === 'context_gap') {
      const gaps = (q.gaps || []).map((x) => String(x || '').slice(0, 120)).filter(Boolean).slice(0, 10);
      if (gaps.length < 1) return;
      normalized.questions.push({ ...base, gaps });
      return;
    }

    if (q.type === 'match_pairs') {
      const pairs = (q.pairs || [])
        .map((p) => ({ left: String(p?.left || '').slice(0, 72).trim(), right: String(p?.right || '').slice(0, 72).trim() }))
        .filter((p) => p.left && p.right)
        .slice(0, 10);
      if (pairs.length < 2) return;
      normalized.questions.push({ ...base, pairs });
      return;
    }

    if (q.type === 'error_hunt') {
      const variants = getCorrectedVariantsList(q.corrected, q.correctedVariants).map((v) => v.slice(0, 160)).filter(Boolean);
      const corrected = variants[0] || '';
      if (!corrected) return;
      const requiredErrors = Number(q.requiredErrors || 0) || undefined;
      normalized.questions.push({ ...base, corrected, correctedVariants: variants, requiredErrors });
      return;
    }

    if (q.type === 'puzzle') {
      const items = (q.items || []).map((x) => String(x || '').slice(0, 90)).filter(Boolean).slice(0, 12);
      if (items.length < 3) return;
      normalized.questions.push({ ...base, items });
      return;
    }

    if (q.type === 'slider') {
      const min = Number(q.min ?? 0);
      const max = Number(q.max ?? 100);
      const fixedMin = Math.min(min, max);
      const fixedMax = Math.max(min, max);

      normalized.questions.push({
        ...base,
        min: fixedMin,
        max: fixedMax,
        target: clamp(Number(q.target ?? fixedMin), fixedMin, fixedMax),
        margin: ['none', 'low', 'medium', 'high', 'maximum'].includes(q.margin) ? q.margin : 'medium',
        unit: String(q.unit || '').slice(0, 20),
      });
      return;
    }

    if (q.type === 'pin') {
      if (!q.imageData) return;
      const zones = normalizePinZones(q);
      normalized.questions.push({
        ...base,
        imageData: String(q.imageData || ''),
        zones,
        zone: zones[0],
        pinMode: ['any', 'all'].includes(String(q.pinMode)) ? String(q.pinMode) : (parseInt(String(q.pinMode), 10) >= 1 ? String(q.pinMode) : 'all'),
        zoneCount: zones.length,
      });
      return;
    }
  });

  if (!normalized.questions.length) {
    throw new Error('No valid questions for live game.');
  }

  return normalized;
}

function collectMissingOtherTtsVoiceIssues(targetQuiz) {
  const issues = [];
  if (!targetQuiz || !Array.isArray(targetQuiz.questions)) return issues;
  targetQuiz.questions.forEach((q, idx) => {
    if (!q || !supportsQuestionAudio(q.type)) return;
    if (String(q.audioMode || '').toLowerCase() !== 'tts') return;
    const ttsLanguage = normalizeTtsLanguage(q.ttsLanguage || targetQuiz.ttsLanguage);
    if (ttsLanguage !== 'OTHER') return;
    const rawVoice = String(q.language || '').trim();
    if (!rawVoice || !isLikelyEdgeVoiceId(rawVoice)) {
      issues.push(`Q${idx + 1}`);
    }
  });
  return issues;
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Blob read error'));
    reader.readAsDataURL(blob);
  });
}

async function validateImageDataUrl(dataUrl, timeoutMs = 6000) {
  const src = String(dataUrl || '').trim();
  if (!/^data:image\//i.test(src)) throw new Error('Image is not a valid data URL.');

  await new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('Image load timed out.')), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Image failed to decode.')); };
    img.src = src;
  });
}

async function validateAudioDataUrl(dataUrl, timeoutMs = 8000) {
  const src = String(dataUrl || '').trim();
  if (!/^data:audio\//i.test(src)) throw new Error('Audio is not a valid audio data URL.');

  await new Promise((resolve, reject) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      try { audio.load(); } catch { }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timed out.'));
    }, timeoutMs);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      cleanup();
      resolve(true);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('Audio failed to decode.'));
    };
    audio.src = src;
  });
}

async function generateMp3FromTts({ text, voice }) {
  const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
  if (!base) throw new Error('Backend URL is not configured.');

  const safeText = String(text || '').trim().slice(0, 1200);
  if (!safeText) return '';

  const safeVoice = normalizeTtsVoice(voice, DEFAULT_EDGE_TTS_LANGUAGE);

  const res = await fetch(`${base}/api/tts/edge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: safeText, voice: safeVoice, rate: '+0%' }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Edge TTS failed (${res.status}).`);
  }

  const blob = await res.blob();
  return blobToDataUrl(blob);
}

async function ensureQuizMediaReady({ contextLabel = 'quiz action', convertTtsToMp3 = true, strictMediaCheck = true, uploadToR2 = true } = {}) {
  normalizeQuizAudioDefaults(quiz);
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const quizLanguage = normalizeTtsLanguage(quiz.ttsLanguage);
  const readAllQuestionsAloud = !!quiz.readAllQuestionsAloud;
  let converted = 0;
  let uploaded = 0;
  let mediaAutoUpdated = false;

  // Show progress indicator (defined early so setProgress is available everywhere)
  const progressEl = document.getElementById('mediaProgressEl');
  const setProgress = (msg, status = 'checking') => {
    if (progressEl) {
      progressEl.textContent = msg;
      progressEl.className = `media-progress show-popup ${status}`;
    }
  };

  // Auto-fill missing images for questions with imageKeyword set
  const missingVideo = questions.filter((q) => {
    if (!q || q.type === 'pin') return false;
    if (normalizeQuestionMedia(q.media).kind === 'video') return false;
    return !!String(q.videoKeyword || '').trim();
  }).length;
  if (missingVideo > 0) {
    setProgress(`🎬 Auto-searching videos for ${missingVideo} question(s)...`);
    const result = await autoFillVideos(quiz, ({ index, total, status }) => {
      setProgress(`🎬 Searching videos: ${index + 1}/${total} — ${status}`);
    });
    if (result.filled > 0) {
      mediaAutoUpdated = true;
      setProgress(`✅ Auto-filled ${result.filled} video(s)`);
    } else {
      setProgress('⚠️ Video auto-fill found no matches or backend search was unavailable', 'bad');
    }
  } else {
    const noKeywordVideos = questions.filter((q) => q && q.type !== 'pin' && normalizeQuestionMedia(q.media).kind !== 'video' && !String(q.videoKeyword || '').trim()).length;
    if (noKeywordVideos > 0) {
      setProgress(`ℹ️ Skipped video auto-fill for ${noKeywordVideos} question(s): missing videoKeyword`, 'checking');
    }
  }

  const missingImages = questions.filter(q => q && !q.imageData && q.imageKeyword && normalizeQuestionMedia(q.media).kind !== 'video').length;
  if (missingImages > 0) {
    setProgress(`🔍 Auto-searching images for ${missingImages} question(s)...`);
    const result = await autoFillImages(quiz, ({ index, total, status }) => {
      setProgress(`🔍 Searching images: ${index + 1}/${total} — ${status}`);
    });
    if (result.filled > 0) {
      mediaAutoUpdated = true;
      setProgress(`✅ Auto-filled ${result.filled} image(s)`);
    }
  }

  const quizId = quiz._r2QuizId || `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  quiz._r2QuizId = quizId;
  const r2Base = `${loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev'}/api/media`;

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q || typeof q !== 'object') continue;

    // Upload base64 images to R2, replace with URL
    if (q.imageData && q.imageData.startsWith('data:') && uploadToR2) {
      setProgress(`🔄 Uploading Q${i + 1} image to cloud...`);
      try {
        const token = ensureQuestionImageVersion(q);
        const key = `${quizId}/images/q${i}-${token}${mimeToExt(q.imageData)}`;
        await uploadMediaToR2(q.imageData, key);
        q.imageData = `${r2Base}/${key}?v=${encodeURIComponent(token)}`;
        uploaded += 1;
      } catch (err) {
        console.warn(`Q${i + 1} image upload failed:`, err);
      }
    }

    if (q.imageData && q.imageData.startsWith('data:')) {
      if (strictMediaCheck) {
        try { await validateImageDataUrl(q.imageData); } catch (err) { throw new Error(`Q${i + 1} image check failed: ${err.message}`); }
      }
    }

    const overrideText = String(q.audioText || '').trim();

    if (supportsQuestionAudio(q.type)) {
      const langForQuestion = overrideText
        ? normalizeTtsLanguage(q.ttsLanguage || quizLanguage)
        : quizLanguage;
      q.ttsLanguage = langForQuestion;
      q.language = normalizeTtsVoice(q.language, langForQuestion);
    }

    const wantsTts = String(q.audioMode || '').toLowerCase() === 'tts';
    const promptText = String(q.prompt || '').trim();
    const ttsText = (overrideText || promptText).slice(0, 1200);
    const shouldGenerateQuizWide = readAllQuestionsAloud && supportsQuestionAudio(q.type);

    // If hearing is disabled, skip TTS generation
    const hearingDisabled = (quizLanguage === 'NONE') || (String(q.ttsLanguage || '').toUpperCase() === 'NONE');

    // Auto-regenerate TTS if question text changed
    if (q.audioMode === 'file' && q.audioData && q._lastPrompt && q._lastPrompt !== promptText) {
      setProgress(`🔄 Regenerating Q${i + 1} audio (text changed)...`);
      q.audioMode = 'tts'; // Force TTS regeneration
      q.audioData = null;
      q._ttsGenerated = false;
      q._userAudioUploaded = false;
      converted += 1;
    }
    q._lastPrompt = promptText;

    // Skip TTS generation if audio was already generated/uploaded and text hasn't changed
    const alreadyHasAudio = q.audioData && q._ttsGenerated && q.audioMode === 'file';
    if (!hearingDisabled && convertTtsToMp3 && (shouldGenerateQuizWide || wantsTts) && ttsText && !alreadyHasAudio) {
      setProgress(`🔄 Generating Q${i + 1} audio...`);
      try {
        const audioData = await generateMp3FromTts({ text: ttsText, voice: q.language || getVoiceForTtsLanguage(quizLanguage) });
        if (audioData) {
          // Upload to R2, replace with URL
          if (uploadToR2) {
            setProgress(`🔄 Uploading Q${i + 1} audio to cloud...`);
            try {
              const key = `${quizId}/audio/q${i}.mp3`;
              await uploadMediaToR2(audioData, key);
              q.audioData = `${r2Base}/${key}`;
            } catch (err) {
              console.warn(`Q${i + 1} audio upload failed, keeping data URL:`, err);
              q.audioData = audioData; // fallback to data URL
            }
          } else {
            q.audioData = audioData;
          }
          q.audioMode = 'file';
          q.audioEnabled = true;
          q._ttsGenerated = true;
          q._userAudioUploaded = false;
          uploaded += 1;
        }
      } catch (err) {
        throw new Error(`Q${i + 1} TTS->MP3 failed: ${err.message}`);
      }
    }

    // Validate audio: skip for TTS mode, disabled audio, R2 URLs, or empty
    if (q.audioData && strictMediaCheck && q.audioData.startsWith('data:')) {
      const audioMode = String(q.audioMode || '').toLowerCase();
      if (audioMode !== 'tts' && audioMode !== 'none' && q.audioEnabled !== false) {
        try { await validateAudioDataUrl(q.audioData); } catch (err) { throw new Error(`Q${i + 1} audio check failed: ${err.message}`); }
      }
    }
  }

  // Update progress
  if (uploaded > 0 || converted > 0 || mediaAutoUpdated) {
    renderBuilder();
    setProgress(`✅ Media synced: ${uploaded} uploaded, ${converted} generated`, 'ok');
  } else if (strictMediaCheck) {
    setProgress('✅ Media ready', 'ok');
  } else {
    if (progressEl) progressEl.classList.remove('show-popup');
  }

  // Auto-hide progress after 3s (Replace the old style.display code at the bottom)
  setTimeout(() => { if (progressEl) progressEl.classList.remove('show-popup'); }, 3000);
}

// Upload base64 data to R2 via Worker API
async function uploadMediaToR2(dataUrl, key) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');

  const mime = match[1];
  const binaryStr = atob(match[2]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  const form = new FormData();
  form.append('file', blob, key.split('/').pop());
  form.append('path', key);

  const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
  const res = await fetch(`${base}/api/media/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return await res.json();
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

function makeDefaultQuestionMedia() {
  return {
    kind: 'none',
    provider: 'youtube',
    url: '',
    embedUrl: '',
    startAt: 0,
    endAt: null,
  };
}

function normalizeQuestionMedia(rawMedia) {
  const raw = rawMedia && typeof rawMedia === 'object' ? rawMedia : {};
  const rawUrl = String(raw.url || '').trim();
  const rawEmbed = String(raw.embedUrl || '').trim();
  const kind = (raw.kind === 'video' || rawUrl || rawEmbed) ? 'video' : 'none';
  const provider = ['youtube', 'vimeo', 'direct'].includes(String(raw.provider || '')) ? String(raw.provider) : detectVideoProvider(raw.url || raw.embedUrl || '');
  const url = rawUrl.slice(0, 2000);
  const embedUrl = rawEmbed.slice(0, 2000);
  const startAt = Math.max(0, Number(raw.startAt || 0) || 0);
  let endAt = raw.endAt == null || raw.endAt === '' ? null : Number(raw.endAt);
  if (!Number.isFinite(endAt) || endAt <= startAt) endAt = null;
  return {
    kind,
    provider,
    url,
    embedUrl,
    startAt: round(startAt, 3),
    endAt: endAt == null ? null : round(endAt, 3),
  };
}

function makeImageRevisionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureQuestionImageVersion(question, fallbackToken = '') {
  if (!question || typeof question !== 'object') return '';
  const existing = String(question._imageVersion || '').trim();
  if (existing) return existing;
  const next = String(fallbackToken || makeImageRevisionToken());
  question._imageVersion = next;
  return next;
}

function replaceQuestionImageData(question, nextImageData) {
  if (!question || typeof question !== 'object') return;
  question.imageData = String(nextImageData || '');
  if (question.imageData) {
    if (question.type !== 'pin') {
      question.media = makeDefaultQuestionMedia();
    }
    question._imageVersion = makeImageRevisionToken();
    return;
  }
  question._imageVersion = '';
}

function loadQuiz() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isStorageQuotaError(err) {
  if (!err) return false;
  const name = String(err.name || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  return name.includes('quota') || msg.includes('exceeded the quota') || msg.includes('quota exceeded');
}

/**
 * Auto-fill missing images for questions that have no imageData but have an imageKeyword set.
 * If imageKeyword is empty, the question is skipped (creator doesn't want an auto-image).
 * Uses the existing Openverse + Pexels search pipeline. Takes the first result.
 * @param {object} quizData - The quiz object
 * @param {function} onProgress - Optional callback({ index, total, status })
 * @returns {{ filled: number, skipped: number }}
 */
async function autoFillImages(quizData, onProgress) {
  const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
  let filled = 0;
  let skipped = 0;
  const beUrl = (loadBackendUrl() || '').replace(/\/+$/, '');

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || q.imageData || normalizeQuestionMedia(q.media).kind === 'video') { skipped++; continue; }
    // Only use the explicit imageKeyword field — if empty, skip (creator doesn't want auto-image)
    const rawQuery = String(q.imageKeyword || '').trim().slice(0, 140);
    if (!rawQuery) { skipped++; continue; }
    // Quote multi-word queries so they're searched as a phrase
    const query = rawQuery.includes(' ') ? `"${rawQuery}"` : rawQuery;

    onProgress?.({ index: i, total: questions.length, status: 'Searching...' });

    try {
      // 1) Try Openverse first (browser-side)
      let imageUrl = '';
      try {
        const ovUrl = new URL('https://api.openverse.org/v1/images/');
        ovUrl.searchParams.set('q', query);
        ovUrl.searchParams.set('page_size', '5');
        ovUrl.searchParams.set('page', '1');
        ovUrl.searchParams.set('mature', 'false');
        const ovRes = await fetch(ovUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8' },
        });
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          const first = (ovData?.results || []).find(it => it?.url);
          if (first) imageUrl = String(first.url);
        }
      } catch { /* continue to Pexels */ }

      // 2) Fallback to backend Pexels search
      if (!imageUrl && beUrl) {
        try {
          const res = await fetch(`${beUrl}/api/images/search?q=${encodeURIComponent(query)}&count=5`);
          const data = await res.json();
          const first = (data?.items || []).find(it => it?.url);
          if (first) imageUrl = String(first.url);
        } catch { /* skip */ }
      }

      if (!imageUrl) { skipped++; continue; }

      onProgress?.({ index: i, total: questions.length, status: 'Importing...' });

      // 3) Fetch image via proxy and resize
      if (!beUrl) { skipped++; continue; }
      const res = await fetch(`${beUrl}/api/images/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      });
      const data = await res.json();
      if (!data?.dataUrl) { skipped++; continue; }

      const blob = dataUrlToBlob(data.dataUrl);
      const resized = await imageFileToOptimizedDataUrl(blob);
      replaceQuestionImageData(q, resized);
      filled++;
    } catch {
      skipped++;
    }
  }

  return { filled, skipped };
}

/**
 * Auto-fill missing videos for questions that have no video media but have a videoKeyword set.
 * Preserves the existing restriction that pin questions do not support question video.
 * @param {object} quizData
 * @param {function} onProgress - Optional callback({ index, total, status })
 * @returns {{ filled: number, skipped: number }}
 */
async function autoFillVideos(quizData, onProgress) {
  const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
  let filled = 0;
  let skipped = 0;
  const configuredBeUrl = (loadBackendUrl() || '').replace(/\/+$/, '');
  const defaultBeUrl = DEFAULT_BACKEND_URL.replace(/\/+$/, '');
  const backendCandidates = Array.from(new Set([configuredBeUrl, defaultBeUrl].filter(Boolean)));

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q || q.type === 'pin') { skipped += 1; continue; }
    if (normalizeQuestionMedia(q.media).kind === 'video') { skipped += 1; continue; }

    const keyword = String(q.videoKeyword || '').trim().slice(0, 140);
    if (!keyword) { skipped += 1; continue; }
    if (!backendCandidates.length) { skipped += 1; continue; }

    onProgress?.({ index: i, total: questions.length, status: 'Searching...' });
    try {
      const params = new URLSearchParams();
      params.set('q', keyword);
      params.set('count', '5');
      const providerPref = ['youtube', 'vimeo', 'direct'].includes(String(q.videoProviderPreference || ''))
        ? String(q.videoProviderPreference)
        : 'youtube';

      // Try preferred provider first, then fall back without provider filter
      const providerAttempts = [providerPref, ''];
      let candidate = null;
      for (const attemptProvider of providerAttempts) {
        if (candidate) break;
        const attemptParams = new URLSearchParams(params);
        if (attemptProvider) attemptParams.set('provider', attemptProvider);
        else attemptParams.delete('provider');
        for (const beUrl of backendCandidates) {
          try {
            const res = await fetch(`${beUrl}/api/videos/search?${attemptParams.toString()}`, { method: 'GET' });
            if (!res.ok) {
              await res.text().catch(() => '');
              continue;
            }
            const data = await res.json().catch(() => ({}));
            candidate = (Array.isArray(data?.items) ? data.items : []).find((item) => isHttpUrl(item?.url)) || null;
            if (candidate) break;
          } catch (err) {
            console.warn('Video search backend failed:', beUrl, err);
          }
        }
      }
      if (!candidate) { skipped += 1; continue; }
      const provider = ['youtube', 'vimeo', 'direct'].includes(String(candidate.provider || ''))
        ? String(candidate.provider)
        : detectVideoProvider(candidate.url || '');
      q.media = normalizeQuestionMedia({
        kind: 'video',
        provider,
        url: String(candidate.url || ''),
        startAt: 0,
        endAt: null,
      });
      replaceQuestionImageData(q, '');
      filled += 1;
    } catch (err) {
      console.warn('Video auto-fill failed for keyword:', keyword, err);
      skipped += 1;
    }
  }
  return { filled, skipped };
}

function saveQuiz(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    if (isStorageQuotaError(err)) return false;
    throw err;
  }
}

function loadQuizLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_LIBRARY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQuizLibrary(items) {
  localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(items));
}

function saveQuizToLibrary(name, data) {
  const label = String(name || '').trim().slice(0, 140) || 'Untitled quiz';
  const items = loadQuizLibrary();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next = {
    id,
    name: label,
    updatedAt: Date.now(),
    quiz: JSON.parse(JSON.stringify(data || createEmptyQuiz())),
  };

  items.push(next);
  const trimmed = items.slice(-50);
  saveQuizLibrary(trimmed);
  return next;
}

function loadBackendUrl() {
  return localStorage.getItem(BACKEND_KEY) || '';
}

function saveBackendUrl(url) {
  localStorage.setItem(BACKEND_KEY, url);
}

// ---------- Helpers ----------
function createAudio(src, opts = {}) {
  try {
    const a = new Audio(src);
    a.loop = !!opts.loop;
    if (typeof opts.volume === 'number') a.volume = clamp(opts.volume, 0, 1);
    a.preload = 'auto';
    return a;
  } catch {
    return null;
  }
}

function setStatus(el, text, mode = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'feedback';
  if (mode === 'ok') el.classList.add('ok');
  if (mode === 'bad') el.classList.add('bad');

  // Turn hostStatus into a timed pop-up dialog
  if (el.id === 'hostStatus') {
    // Ignore spammy live-game phase updates so they don't pop up randomly
    const ignorePop = /running|Lobby open|Everyone answered|Question closed|Game finished|Time is up|Reveal shown/i.test(text);
    if (!ignorePop) {
      el.classList.add('show-popup');
      clearTimeout(el.dataset.popTimeout);
      el.dataset.popTimeout = setTimeout(() => {
        el.classList.remove('show-popup');
      }, 3500);
    } else {
      el.classList.remove('show-popup');
    }
  }
}

function setBackendStatus(text, mode = '') {
  if (!backendStatusEl) return;
  backendStatusEl.textContent = text;
  backendStatusEl.className = 'small';
  if (mode === 'ok') backendStatusEl.classList.add('ok');
  if (mode === 'bad') backendStatusEl.classList.add('bad');
}

function labelForType(type) {
  return (
    {
      mcq: 'Multiple choice',
      multi: 'Multi-select',
      tf: 'True / False',
      text: 'Type answer',
      open: 'Open short answer',
      speaking: 'Speaking answer (teacher-graded)',
      image_open: 'Image prompt writing',
      context_gap: 'Context gap fill',
      match_pairs: 'Match pairs',
      error_hunt: 'Error hunt',
      puzzle: 'Puzzle',
      slider: 'Slider',
      pin: 'Pin answer',
    }[type] || type
  );
}

function iconForType(type) {
  return (
    {
      mcq: '🔘',
      multi: '☑️',
      tf: '✅❌',
      text: '⌨️',
      open: '💬',
      speaking: '🗣️',
      image_open: '🖼️',
      context_gap: '🕳️',
      match_pairs: '🔗',
      error_hunt: '🕵️',
      puzzle: '🧩',
      slider: '📐',
      voice_record: '🎙️',
      pin: '📍',
    }[type] || ''
  );
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'open', 'speaking', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'pin'].includes(type)) return 20;
  return 5;
}

function normalizeTimeLimitValue(value, type) {
  const raw = String(value ?? '').trim();
  if (raw === '') return 20;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  if (n <= 0) return 0;
  return clamp(n, minTimeByType(type), 240);
}

function validateImportedQuiz(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON root.');
  if (!Array.isArray(data.questions)) throw new Error('Missing questions array.');
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

  // New robust payload: [{left,right}, ...] (order-independent exact multiset compare)
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

  // Backward compatibility: legacy payload = array of right-side values by left row order.
  const guess = Array.isArray(guessRaw) ? guessRaw.map(normalizeTextAnswer).filter(Boolean) : [];
  if (guess.length !== pairs.length) return false;

  const groups = new Map();
  pairs.forEach((p, idx) => {
    if (!groups.has(p.left)) groups.set(p.left, []);
    groups.get(p.left).push({ idx, right: p.right });
  });

  for (const entries of groups.values()) {
    const expected = entries.map((x) => x.right).sort();
    const got = entries.map((x) => guess[x.idx] || '').sort();
    if (JSON.stringify(expected) !== JSON.stringify(got)) return false;
  }
  return true;
}

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function tokenEditDistance(aTokens, bTokens) {
  const a = aTokens || [];
  const b = bTokens || [];
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = normalizeTextAnswer(a[i - 1]) === normalizeTextAnswer(b[j - 1]);
      dp[i][j] = same
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[a.length][b.length];
}

function getCorrectedVariantsList(corrected, correctedVariants) {
  if (Array.isArray(correctedVariants) && correctedVariants.length) {
    return correctedVariants.map((v) => String(v || '').trim()).filter(Boolean);
  }
  const raw = String(corrected || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
}

function countErrorHuntRequiredTokens(prompt, corrected) {
  // 1. Support both single strings and arrays of multiple acceptable variants
  const variants = Array.isArray(corrected) ? corrected : [corrected];
  const validVariants = variants.map(v => String(v || '').trim()).filter(Boolean);
  if (!validVariants.length) return 1;

  let maxErrors = 1;

  // 2. Calculate the required errors for each variant and take the maximum
  for (const correctedStr of validVariants) {
    const source = tokenizeWords(prompt).map(normalizeTextAnswer);
    const target = tokenizeWords(correctedStr).map(normalizeTextAnswer);

    if (!source.length || !target.length) continue;
    if (source.join(' ') === target.join(' ')) continue;

    const rows = source.length + 1;
    const cols = target.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    // Initialize DP table
    for (let i = 0; i < rows; i++) dp[i][0] = i;
    for (let j = 0; j < cols; j++) dp[0][j] = j;

    // Fill DP table
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        if (source[i - 1] === target[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],       // Deletion
            dp[i][j - 1],       // Insertion
            dp[i - 1][j - 1]    // Substitution
          );
        }
      }
    }

    // Backtrack to count contiguous blocks of edits
    let i = source.length;
    let j = target.length;
    const errorIndexes = new Set();

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && source[i - 1] === target[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
        i--; j--;
      } else {
        if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
          errorIndexes.add(i - 1);
          i--; j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
          errorIndexes.add(i - 1);
          i--;
        } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
          errorIndexes.add(Math.max(0, i - 1));
          j--;
        } else {
          if (i > 0) i--;
          else j--;
        }
      }
    }

    // Track the highest number of mistakes found across all valid sentence variations
    if (errorIndexes.size > maxErrors) {
      maxErrors = errorIndexes.size;
    }
  }

  return Math.max(1, maxErrors);
}

function getErrorHuntRequired(q) {
  if (!q) return 1;
  return Math.max(1, Number(q.requiredErrors || countErrorHuntRequiredTokens(q.prompt, getCorrectedVariantsList(q.corrected, q.correctedVariants))));
}

function isErrorHuntRewriteCorrect(rewrite, q) {
  const variants = getCorrectedVariantsList(q?.corrected, q?.correctedVariants);
  if (!variants.length) return false;
  const rewriteNorm = normalizeTextAnswer(rewrite);
  const rewriteTokens = tokenizeWords(rewriteNorm);
  for (const v of variants) {
    const vNorm = normalizeTextAnswer(v);
    if (rewriteNorm === vNorm) return true;
    const dist = tokenEditDistance(rewriteTokens, tokenizeWords(vNorm));
    if (dist <= 1) return true;
  }
  return false;
}

function renderInlineContextGapInputs(container, prompt, count, datasetKey) {
  const text = String(prompt || '').trim();
  const markerRe = /^(_{2,}|\[\s*\])$/;
  const parts = text ? text.split(/(\_{2,}|\[\s*\])/g).filter((x) => x !== '') : [];
  const hasMarkers = parts.some((part) => markerRe.test(String(part).trim()));

  const wrap = document.createElement('div');
  wrap.className = 'context-gap-inline';
  let blankIndex = 0;

  const addBlank = () => {
    if (blankIndex >= count) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = '____';
    input.className = 'context-gap-inline-input';
    input.dataset[datasetKey] = String(blankIndex);
    input.readOnly = true;
    input.addEventListener('click', () => {
      input.readOnly = false;
      input.focus();
    });
    input.addEventListener('focus', () => {
      input.readOnly = false;
    });
    input.addEventListener('blur', () => {
      if (!String(input.value || '').trim()) input.readOnly = true;
    });
    wrap.appendChild(input);
    blankIndex += 1;
  };

  if (hasMarkers) {
    parts.forEach((part) => {
      if (markerRe.test(String(part).trim()) && blankIndex < count) {
        addBlank();
      } else if (String(part).trim()) {
        const span = document.createElement('span');
        span.className = 'context-gap-word';
        span.textContent = part;
        wrap.appendChild(span);
      }
    });
  }

  while (blankIndex < count) addBlank();
  container.appendChild(wrap);
}

function enableInlineErrorTokenEditing(tokenWrap, tokenSelector, rewriteInput) {
  if (!tokenWrap) return;

  const syncRewriteFromTokens = () => {
    if (!rewriteInput) return;
    if (String(rewriteInput.dataset.fromTokens || '0') !== '1' && String(rewriteInput.value || '').trim()) return;
    const sentence = [...tokenWrap.querySelectorAll(tokenSelector)]
      .map((el) => String(el.dataset.tokenText || el.textContent || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    rewriteInput.value = sentence;
    rewriteInput.dataset.fromTokens = '1';
  };

  tokenWrap.querySelectorAll(tokenSelector).forEach((chip) => {
    const startEdit = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (chip.dataset.editing === '1') return;

      // Ensure chip is marked active when editing begins
      chip.classList.add('active');

      const original = String(chip.dataset.tokenText || chip.textContent || '').trim();
      chip.dataset.editing = '1';
      chip.classList.add('editing');
      chip.innerHTML = '';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'error-token-editor';
      input.maxLength = 30;
      input.value = original;
      chip.appendChild(input);
      input.focus();
      input.select();

      const finish = (save) => {
        const next = save ? String(input.value || '').trim() : original;
        const text = next || original;
        chip.dataset.tokenText = text;
        chip.textContent = text;
        chip.dataset.editing = '0';
        chip.classList.remove('editing');
        // Auto-set active state: active if text differs from original prompt token
        const origToken = String(chip.dataset.originalText || '').trim();
        if (origToken && text !== origToken) {
          chip.classList.add('active');
        } else if (origToken && text === origToken) {
          chip.classList.remove('active');
        }
        if (save) syncRewriteFromTokens();
      };

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      });
      input.addEventListener('blur', () => finish(true), { once: true });
    };

    chip.addEventListener('dblclick', startEdit);
    chip.addEventListener('click', (event) => {
      if (!chip.classList.contains('active')) return;
      startEdit(event);
    });
  });
}

function ensureTimerProgressBar(cardEl, id) {
  if (!cardEl) return null;
  let bar = cardEl.querySelector(`[data-timer-bar="${id}"]`);
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'timer-progress-bar';
    bar.dataset.timerBar = id;
    const fill = document.createElement('div');
    fill.className = 'timer-progress-fill';
    bar.appendChild(fill);
    cardEl.prepend(bar);
  }
  return bar.querySelector('.timer-progress-fill');
}

function formatPollAnswerForHost(answer) {
  if (Array.isArray(answer)) return answer.join(' | ') || '(blank)';
  if (answer && typeof answer === 'object') {
    if (typeof answer.rewrite === 'string') return answer.rewrite || '(blank)';
    if (Number.isFinite(answer.x) || Number.isFinite(answer.y)) {
      return `(${Math.round(Number(answer.x || 0))}%, ${Math.round(Number(answer.y || 0))}%)`;
    }
    return JSON.stringify(answer);
  }
  const s = String(answer || '').trim();
  return s || '(blank)';
}

function normalizeBackendUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.origin;
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function distance2D(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function sliderTolerance(margin, min, max) {
  const range = Math.max(0, Number(max) - Number(min));
  const map = {
    none: 0,
    low: range * 0.05,
    medium: range * 0.1,
    high: range * 0.2,
    maximum: range,
  };
  return map[margin] ?? map.medium;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function supportsQuestionAudio(type) {
  return AUDIO_CAPABLE_QUESTION_TYPES.includes(String(type || ''));
}

function hasQuestionAudio(question) {
  if (!question) return false;
  if (question.type === 'audio') return true;
  if (!supportsQuestionAudio(question.type)) return false;
  return !!question.audioEnabled;
}

function stopQuestionAudioPlayback() {
  try {
    if (activeQuestionAudioEl) {
      activeQuestionAudioEl.pause();
      activeQuestionAudioEl.currentTime = 0;
      activeQuestionAudioEl = null;
    }
  } catch { }

  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch { }
}

async function playQuestionAudio(question, opts = {}) {
  if (!hasQuestionAudio(question)) return false;

  const qIndex = Number(live.host.state?.currentIndex);
  const answeringKey = `answering_q${Number.isFinite(qIndex) ? qIndex : 'preview'}`;

  // Keep one stable answering FX per question.
  // For audio questions, pause it during the prompt audio and resume the same clip after playback ends.
  primeAnsweringFx(answeringKey);
  stopFx('answering');
  stopQuestionAudioPlayback();

  const maybeResumeQuestionMusic = () => {
    const s = live.host.state;
    if (!s || s.phase !== 'question' || s.questionClosed) return;
    if (!hasQuestionAudio(s.question || question)) return;
    if (live.host.currentAnsweringFxKey !== answeringKey) return;
    if (live.host.hostVideoPlaying) return;
    resumeFx('answering');
  };

  const speed = Number(opts?.speed || 1);
  const safeSpeed = Number.isFinite(speed) ? Math.max(0.6, Math.min(1.4, speed)) : 1;

  const playAudioEl = (a) => new Promise((resolve) => {
    activeQuestionAudioEl = a;
    try { a.playbackRate = safeSpeed; } catch { }

    const onFinish = () => {
      if (activeQuestionAudioEl === a) activeQuestionAudioEl = null;
      resolve(true);
    };

    a.addEventListener('ended', onFinish, { once: true });
    a.addEventListener('error', onFinish, { once: true });
    a.play().catch(() => {
      onFinish();
    });
  });

  if (question.audioMode === 'file' && question.audioData) {
    try {
      const a = new Audio(question.audioData);
      await playAudioEl(a);
    } catch {
      return false;
    }
    return true;
  }

  // TTS mode: Edge TTS only (no fallback).
  const text = String(question.audioText || question.prompt || '').trim();
  if (!text) {
    return false;
  }
  try {
    const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
    if (!base) throw new Error('Backend URL is not configured.');
    const voice = normalizeTtsVoice(question.language, question.ttsLanguage || guessTtsLanguageFromVoice(question.language));
    const key = `${voice}::${text}`;

    const ratePct = `${safeSpeed >= 1 ? '+' : ''}${Math.round((safeSpeed - 1) * 100)}%`;
    const cacheKey = `${key}::${ratePct}`;
    let audioUrl = edgeTtsBlobUrlCache.get(cacheKey);
    if (!audioUrl) {
      const res = await fetch(`${base}/api/tts/edge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, rate: ratePct }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Edge TTS failed (${res.status}).`);
      }
      const blob = await res.blob();
      audioUrl = URL.createObjectURL(blob);
      edgeTtsBlobUrlCache.set(cacheKey, audioUrl);
    }

    const a = new Audio(audioUrl);
    await playAudioEl(a);
    return true;
  } catch (err) {
    setStatus(hostStatusEl, `Edge TTS error: ${err?.message || 'failed'}`, 'bad');
    return false;
  }
}

async function playQuestionVideoClip(question) {
  const media = normalizeQuestionMedia(question?.media);
  if (media.kind !== 'video' || !(media.url || media.embedUrl)) return false;
  const config = toVideoEmbedConfig(media);
  if (config.provider !== 'direct' || !config.src) return true;
  return await new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'auto';
    v.src = config.src;
    v.onloadedmetadata = () => {
      try { v.currentTime = config.start || 0; } catch { }
      v.play().catch(() => resolve(false));
    };
    v.ontimeupdate = () => {
      if (config.end != null && v.currentTime >= config.end) {
        v.pause();
        resolve(true);
      }
    };
    v.onended = () => resolve(true);
    v.onerror = () => resolve(false);
  });
}

async function runHostQuestionMediaSequence(question, answeringKey) {
  stopFx('answering');
  const audioOk = await playQuestionAudio(question);
  if (!audioOk && hasQuestionAudio(question)) {
    // continue to video as fallback
  }
  await playQuestionVideoClip(question);
  const s = live.host.state;
  if (!s || s.phase !== 'question' || s.questionClosed) return;
  if (live.host.currentAnsweringFxKey !== answeringKey) return;
  if (live.host.hostVideoPlaying) return;
  resumeFx('answering');
}

function renderMatchPairsColumns(container, leftItems, rightOptions, datasetKey) {
  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap match-pairs-wrap-interactive';

  const svgNs = 'http://www.w3.org/2000/svg';
  const lineLayer = document.createElementNS(svgNs, 'svg');
  lineLayer.classList.add('match-pairs-lines');

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  const rightButtonsByValue = new Map();

  let selectedLeft = -1;
  let selectedRight = '';
  const rows = [];

  const clearDropTargets = () => {
    leftCol.querySelectorAll('.match-drop-target').forEach((el) => el.classList.remove('match-drop-target'));
  };

  const assignPair = (leftIdx, rightValue) => {
    const value = String(rightValue || '').trim();
    if (leftIdx < 0 || !value) return;
    rows.forEach((r) => {
      if (String(r.hidden.value || '') === value) r.hidden.value = '';
    });
    rows[leftIdx].hidden.value = value;
    selectedLeft = -1;
    selectedRight = '';
    refreshUi();
  };

  const drawConnections = () => {
    lineLayer.innerHTML = '';
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;

    lineLayer.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    lineLayer.setAttribute('width', String(wrapRect.width));
    lineLayer.setAttribute('height', String(wrapRect.height));

    rows.forEach((row, idx) => {
      const value = String(row.hidden.value || '').trim();
      if (!value) return;
      const target = rightButtonsByValue.get(value);
      if (!target) return;

      const leftRect = row.container.getBoundingClientRect();
      const rightRect = target.getBoundingClientRect();

      const x1 = leftRect.right - wrapRect.left;
      const y1 = leftRect.top + (leftRect.height / 2) - wrapRect.top;
      const x2 = rightRect.left - wrapRect.left;
      const y2 = rightRect.top + (rightRect.height / 2) - wrapRect.top;

      const colorList = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];
      const lineColor = colorList[idx % colorList.length];

      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(Math.max(0, x1)));
      line.setAttribute('y1', String(Math.max(0, y1)));
      line.setAttribute('x2', String(Math.max(0, x2)));
      line.setAttribute('y2', String(Math.max(0, y2)));
      line.setAttribute('stroke', lineColor);
      line.classList.add('match-connection-line');
      lineLayer.appendChild(line);
    });
  };

  const refreshUi = () => {
    rows.forEach((row, idx) => {
      row.container.classList.toggle('active', idx === selectedLeft);
      const val = String(row.hidden.value || '').trim();
      row.container.classList.toggle('filled', !!val);
    });

    const used = new Set(rows.map((r) => String(r.hidden.value || '').trim()).filter(Boolean));
    rightCol.querySelectorAll('[data-match-right]').forEach((btn) => {
      const value = String(btn.dataset.matchRight || '');
      const isUsed = used.has(value);
      btn.classList.toggle('active', isUsed || value === selectedRight);
      btn.disabled = false;
    });

    requestAnimationFrame(drawConnections);
  };

  leftItems.forEach((left, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'match-pair-left';

    const leftText = document.createElement('span');
    leftText.className = 'match-left-text';
    leftText.textContent = left;

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.dataset[datasetKey] = String(i);

    row.append(leftText, hidden);
    row.addEventListener('click', () => {
      if (selectedRight) {
        assignPair(i, selectedRight);
        return;
      }
      selectedLeft = selectedLeft === i ? -1 : i;
      refreshUi();
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hidden.value = '';
      refreshUi();
    });

    row.addEventListener('dragover', (e) => {
      const value = e.dataTransfer?.getData('text/match-right');
      if (!value) return;
      e.preventDefault();
      clearDropTargets();
      row.classList.add('match-drop-target');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('match-drop-target');
    });

    row.addEventListener('drop', (e) => {
      const value = e.dataTransfer?.getData('text/match-right');
      if (!value) return;
      e.preventDefault();
      clearDropTargets();
      assignPair(i, value);
    });

    rows.push({ container: row, hidden });
    leftCol.appendChild(row);
  });

  rightOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.matchRight = String(opt || '');
    btn.textContent = String(opt || '');
    btn.draggable = true;

    btn.addEventListener('click', () => {
      const value = btn.dataset.matchRight || '';
      if (selectedLeft >= 0) {
        assignPair(selectedLeft, value);
        return;
      }
      selectedRight = selectedRight === value ? '' : value;
      refreshUi();
    });

    btn.addEventListener('dragstart', (e) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.setData('text/match-right', btn.dataset.matchRight || '');
      e.dataTransfer.effectAllowed = 'move';
    });

    rightButtonsByValue.set(String(opt || ''), btn);
    rightCol.appendChild(btn);
  });

  wrap.append(leftCol, rightCol, lineLayer);
  container.appendChild(wrap);
  window.addEventListener('resize', drawConnections);
  refreshUi();
}

function renderMatchPairsPreview(container, leftItems, rightOptions) {
  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap';

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  leftItems.forEach((left) => {
    const row = document.createElement('div');
    row.className = 'match-pair-left';

    const leftText = document.createElement('span');
    leftText.className = 'match-left-text';
    leftText.textContent = left;

    row.append(leftText);
    leftCol.appendChild(row);
  });

  rightOptions.forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'btn';
    item.textContent = String(opt || '');
    rightCol.appendChild(item);
  });

  wrap.append(leftCol, rightCol);
  container.appendChild(wrap);
}

function renderMatchPairsReveal(container, pairs) {
  const rows = Array.isArray(pairs)
    ? pairs
      .map((p) => ({ left: String(p?.left || '').trim(), right: String(p?.right || '').trim() }))
      .filter((p) => p.left && p.right)
    : [];

  if (!rows.length) {
    appendBigReveal('No pairs to reveal.');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap match-pairs-wrap-interactive';

  const svgNs = 'http://www.w3.org/2000/svg';
  const lineLayer = document.createElementNS(svgNs, 'svg');
  lineLayer.classList.add('match-pairs-lines');

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  const leftEls = [];
  const rightEls = [];

  rows.forEach((pair) => {
    const left = document.createElement('div');
    left.className = 'match-pair-left filled';
    left.textContent = pair.left;
    leftCol.appendChild(left);
    leftEls.push(left);

    const right = document.createElement('div');
    right.className = 'btn';
    right.textContent = pair.right;
    rightCol.appendChild(right);
    rightEls.push(right);
  });

  const draw = () => {
    lineLayer.innerHTML = '';
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;

    lineLayer.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    lineLayer.setAttribute('width', String(wrapRect.width));
    lineLayer.setAttribute('height', String(wrapRect.height));

    leftEls.forEach((leftEl, i) => {
      const rightEl = rightEls[i];
      if (!rightEl) return;
      const l = leftEl.getBoundingClientRect();
      const r = rightEl.getBoundingClientRect();

      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(Math.max(0, l.right - wrapRect.left)));
      line.setAttribute('y1', String(Math.max(0, l.top + (l.height / 2) - wrapRect.top)));
      line.setAttribute('x2', String(Math.max(0, r.left - wrapRect.left)));
      line.setAttribute('y2', String(Math.max(0, r.top + (r.height / 2) - wrapRect.top)));

      const colorList = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];
      line.setAttribute('stroke', colorList[i % colorList.length]);

      line.classList.add('match-connection-line');
      lineLayer.appendChild(line);
    });
  };

  wrap.append(leftCol, rightCol, lineLayer);
  container.appendChild(wrap);
  requestAnimationFrame(draw);
}

function renderPuzzleRevealTokens(container, items) {
  const wrap = document.createElement('div');
  wrap.className = 'puzzle-reveal-wrap project-text-reveal';

  items.forEach((token) => {
    const chip = document.createElement('span');
    chip.className = 'puzzle-reveal-token';
    chip.textContent = String(token || '').trim();
    wrap.appendChild(chip);
  });

  container.appendChild(wrap);
}

function createPuzzleDnd(container, options, listId = 'puzzlePieces') {
  container.innerHTML = '';

  const bank = document.createElement('div');
  bank.className = 'row gap';
  bank.style.flexWrap = 'wrap';

  const selected = document.createElement('div');
  selected.className = 'answers-grid top-space';
  selected.dataset.puzzleList = listId;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn puzzle-reset';
  resetBtn.textContent = 'Reset order';

  let draggedRow = null;

  const refreshSelectedIndexes = () => {
    [...selected.querySelectorAll('[data-puzzle-piece]')].forEach((el, i) => {
      el.dataset.puzzleIndex = String(i);
      const n = el.querySelector('strong');
      if (n) n.textContent = `${i + 1}.`;
    });
  };

  const clearDropHints = () => {
    selected.querySelectorAll('.puzzle-drop-before, .puzzle-drop-after').forEach((el) => {
      el.classList.remove('puzzle-drop-before', 'puzzle-drop-after');
    });
  };

  const setupRowDnD = (row) => {
    row.draggable = true;
    row.style.cursor = 'grab';

    row.addEventListener('dragstart', () => {
      draggedRow = row;
      row.classList.add('puzzle-dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('puzzle-dragging');
      clearDropHints();
      draggedRow = null;
      refreshSelectedIndexes();
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      clearDropHints();
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      row.classList.add(before ? 'puzzle-drop-before' : 'puzzle-drop-after');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) selected.insertBefore(draggedRow, row);
      else selected.insertBefore(draggedRow, row.nextSibling);
      clearDropHints();
      refreshSelectedIndexes();
    });
  };

  const refreshBankButtons = () => {
    const pickedIds = new Set(
      [...selected.querySelectorAll('[data-puzzle-piece-id]')].map((el) => String(el.dataset.puzzlePieceId || '')),
    );

    [...bank.querySelectorAll('[data-puzzle-bank-id]')].forEach((btn) => {
      const id = String(btn.dataset.puzzleBankId || '');
      const picked = pickedIds.has(id);
      btn.disabled = picked;
      btn.classList.toggle('puzzle-picked', picked);
      btn.classList.toggle('hidden', picked);
      if (picked) btn.setAttribute('aria-label', `${btn.dataset.puzzleBankPiece || btn.textContent} (selected)`);
      else btn.removeAttribute('aria-label');
    });
  };

  const unpickRow = (rowEl) => {
    if (!rowEl) return;
    rowEl.remove();
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  const buildBankButton = (value, pieceId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.puzzleBankPiece = value;
    btn.dataset.puzzleBankId = String(pieceId);
    btn.textContent = value;
    btn.draggable = true;

    btn.addEventListener('click', () => pickPiece(btn));
    btn.addEventListener('dragstart', (e) => {
      if (btn.disabled) {
        e.preventDefault();
        return;
      }
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/puzzle-bank-id', String(pieceId));
        e.dataTransfer.effectAllowed = 'copy';
      }
    });
    return btn;
  };

  const resetSelection = () => {
    selected.querySelectorAll('[data-puzzle-piece]').forEach((el) => el.remove());
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  selected.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    resetSelection();
  });
  resetBtn.addEventListener('click', () => resetSelection());

  selected.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  selected.addEventListener('drop', (e) => {
    e.preventDefault();
    const pieceId = e.dataTransfer?.getData('text/puzzle-bank-id');
    if (!pieceId) return;
    const btn = bank.querySelector(`[data-puzzle-bank-id="${CSS.escape(pieceId)}"]`);
    if (btn) pickPiece(btn);
  });

  const pickPiece = (bankBtn) => {
    if (!bankBtn || bankBtn.disabled) return;
    const text = String(bankBtn.dataset.puzzleBankPiece || bankBtn.textContent || '').trim();
    const pieceId = String(bankBtn.dataset.puzzleBankId || '').trim();
    if (!text || !pieceId) return;
    if (selected.querySelector(`[data-puzzle-piece-id="${CSS.escape(pieceId)}"]`)) return;

    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.puzzlePiece = text;
    row.dataset.puzzlePieceId = pieceId;

    const pos = document.createElement('strong');
    const label = document.createElement('span');
    label.textContent = text;
    row.append(pos, label);

    row.addEventListener('click', () => unpickRow(row));

    setupRowDnD(row);
    selected.appendChild(row);
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  [...options].forEach((text, i) => {
    bank.appendChild(buildBankButton(String(text || ''), i));
  });
  bank.appendChild(resetBtn);
  refreshBankButtons();

  container.append(bank, selected);
}
function speakText(text, lang = 'en-US', onEnd = null) {
  const value = String(text || '').trim();
  if (!value || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = String(lang || 'en-US').slice(0, 5);
    if (typeof onEnd === 'function') {
      utterance.addEventListener('end', () => onEnd(), { once: true });
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech errors silently
  }
}

function syncPicksLayerBounds(container, picksLayer, img) {
  const update = () => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !img.naturalWidth) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const rectRatio = rect.width / rect.height;

    let actualW = rect.width;
    let actualH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (Math.abs(imgRatio - rectRatio) > 0.01) {
      if (imgRatio > rectRatio) {
        actualW = rect.width;
        actualH = rect.width / imgRatio;
        offsetY = (rect.height - actualH) / 2;
      } else {
        actualH = rect.height;
        actualW = rect.height * imgRatio;
        offsetX = (rect.width - actualW) / 2;
      }
    }

    picksLayer.style.width = `${actualW}px`;
    picksLayer.style.height = `${actualH}px`;
    picksLayer.style.left = `${offsetX}px`;
    picksLayer.style.top = `${offsetY}px`;
    picksLayer.style.right = 'auto';
    picksLayer.style.bottom = 'auto';
  };

  update();
  img.addEventListener('load', update);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe(container);
  }
}

function attachPinPicker(container, onPick) {
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    let renderW = rect.width;
    let renderH = rect.height;

    const img = container.querySelector('img');
    if (img && img.naturalWidth && img.naturalHeight) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const rectRatio = rect.width / rect.height;

      let actualW = rect.width;
      let actualH = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (Math.abs(imgRatio - rectRatio) > 0.01) {
        if (imgRatio > rectRatio) {
          actualW = rect.width;
          actualH = rect.width / imgRatio;
          offsetY = (rect.height - actualH) / 2;
        } else {
          actualH = rect.height;
          actualW = rect.height * imgRatio;
          offsetX = (rect.width - actualW) / 2;
        }
      }

      clickX -= offsetX;
      clickY -= offsetY;
      renderW = actualW;
      renderH = actualH;
    }

    const x = (clickX / renderW) * 100;
    const y = (clickY / renderH) * 100;

    // Ignore clicks outside the actual image
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    onPick({
      x: round(clamp(x, 0, 100), 1),
      y: round(clamp(y, 0, 100), 1),
    });
  });
}

function toSafeFilename(s) {
  return String(s || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Read error'));
    reader.readAsDataURL(file);
  });
}

const IMAGE_MAX_DIMENSION = 800;
const IMAGE_TARGET_BYTES = 150 * 1024;

function estimateDataUrlBytes(dataUrl) {
  const payload = String(dataUrl || '').split(',')[1] || '';
  return Math.floor((payload.length * 3) / 4);
}

// Convert data URL to Blob for resizing
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const b64 = atob(parts[1]);
  const mime = parts[0].match(/:(.*?);/)[1];
  const buf = new ArrayBuffer(b64.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < b64.length; i++) arr[i] = b64.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

async function imageFileToOptimizedDataUrl(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file.');

  const srcDataUrl = await fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode image.'));
    el.src = srcDataUrl;
  });

  const ratio = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(1, img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing unavailable.');
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer JPEG for size safety unless source is transparent PNG/GIF/WebP.
  const needsAlpha = /png|webp|gif/i.test(String(file.type || ''));
  const outputType = needsAlpha ? 'image/webp' : 'image/jpeg';

  let quality = 0.86;
  let out = canvas.toDataURL(outputType, quality);
  while (estimateDataUrlBytes(out) > IMAGE_TARGET_BYTES && quality > 0.42) {
    quality = Math.max(0.42, quality - 0.08);
    out = canvas.toDataURL(outputType, quality);
  }

  return out;
}

function setupImageLightbox() {
  if (document.getElementById('imageLightbox')) return;

  const modal = document.createElement('div');
  modal.id = 'imageLightbox';
  modal.className = 'image-lightbox hidden';
  modal.innerHTML = '<img alt="Zoomed question image" />';
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('img');

  const close = () => {
    modal.classList.add('hidden');
    if (modalImg) modalImg.src = '';
  };

  modal.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  document.addEventListener('click', (e) => {
    const img = e.target?.closest?.('img[data-zoomable="1"]');
    if (!img) return;
    if (!(img instanceof HTMLImageElement)) return;
    modalImg.src = img.src;
    modal.classList.remove('hidden');
  });
}




init();
