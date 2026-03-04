const ROOM_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Player-Token',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'pinplay-api' });
    }

    if (url.pathname === '/api/create' && request.method === 'POST') {
      const body = await safeJson(request);
      const quiz = body?.quiz;

      if (!quiz?.questions?.length) {
        return json({ error: 'Quiz must include at least one question.' }, 400);
      }

      for (let i = 0; i < 15; i++) {
        const pin = makePin();
        const id = env.ROOMS.idFromName(pin);
        const stub = env.ROOMS.get(id);

        const initRes = await stub.fetch('https://room/init', {
          method: 'POST',
          body: JSON.stringify({ pin, quiz }),
        });

        if (initRes.status === 201) {
          const data = await initRes.json();
          return json(data);
        }
      }

      return json({ error: 'Could not allocate PIN. Try again.' }, 503);
    }

    if (url.pathname === '/api/join' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const name = sanitizeName(body?.name);

      if (!pin) return json({ error: 'PIN must be 6 digits.' }, 400);
      if (!name) return json({ error: 'Name is required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/join', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      return withCors(res);
    }

    if (url.pathname === '/api/host/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/host/state', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      return withCors(res);
    }

    if (url.pathname === '/api/host/start' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/host/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return withCors(res);
    }

    if (url.pathname === '/api/host/next' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/host/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return withCors(res);
    }

    if (url.pathname === '/api/player/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const playerId = sanitizeId(url.searchParams.get('playerId'));
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/player/state', {
        method: 'POST',
        body: JSON.stringify({ playerId, playerToken }),
      });
      return withCors(res);
    }

    if (url.pathname === '/api/answer' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const playerId = sanitizeId(body?.playerId);
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const res = await stub.fetch('https://room/answer', {
        method: 'POST',
        body: JSON.stringify({
          playerId,
          playerToken,
          answer: body?.answer,
        }),
      });
      return withCors(res);
    }

    return json({ error: 'Not found' }, 404);
  },
};

export class QuizRoom {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (url.pathname === '/init' && request.method === 'POST') {
        const body = await safeJson(request);
        const pin = sanitizePin(body?.pin);
        const quiz = body?.quiz;

        if (!pin || !quiz?.questions?.length) {
          return json({ error: 'Invalid init payload.' }, 400);
        }

        const current = await this.#getRoom();
        if (current && Date.now() - current.updatedAt < ROOM_TTL_MS) {
          return json({ error: 'PIN already in use.' }, 409);
        }

        const room = {
          pin,
          hostToken: randomToken(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phase: 'lobby',
          currentIndex: -1,
          quiz: normalizeQuiz(quiz),
          players: {},
          responsesByQuestion: {},
        };

        await this.#setRoom(room);
        return json({ pin, hostToken: room.hostToken }, 201);
      }

      const room = await this.#getRoom();
      if (!room) return json({ error: 'Room not found.' }, 404);

      if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
        await this.state.storage.delete('room');
        return json({ error: 'Room expired.' }, 410);
      }

      if (url.pathname === '/join' && request.method === 'POST') {
        const body = await safeJson(request);
        const name = sanitizeName(body?.name);
        if (!name) return json({ error: 'Name is required.' }, 400);

        const playerId = randomId('p_');
        const playerToken = randomToken();

        room.players[playerId] = {
          id: playerId,
          name,
          token: playerToken,
          score: 0,
          joinedAt: Date.now(),
        };

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ playerId, playerToken, pin: room.pin });
      }

      if (url.pathname === '/host/state' && request.method === 'GET') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        return json(hostState(room));
      }

      if (url.pathname === '/host/start' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'lobby') {
          room.phase = 'question';
          room.currentIndex = 0;
          room.updatedAt = Date.now();
          await this.#setRoom(room);
        }

        return json(hostState(room));
      }

      if (url.pathname === '/host/next' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'lobby') {
          room.phase = 'question';
          room.currentIndex = 0;
        } else if (room.phase === 'question') {
          if (room.currentIndex + 1 < room.quiz.questions.length) {
            room.currentIndex += 1;
          } else {
            room.phase = 'results';
          }
        }

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/player/state' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        return json(playerState(room, playerId));
      }

      if (url.pathname === '/answer' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);

        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question) return json({ error: 'Question not found.' }, 404);

        room.responsesByQuestion[qIndex] = room.responsesByQuestion[qIndex] || {};
        if (room.responsesByQuestion[qIndex][playerId]) {
          const existing = room.responsesByQuestion[qIndex][playerId];
          return json({
            ok: true,
            alreadyAnswered: true,
            correct: existing.correct,
            pointsAwarded: existing.pointsAwarded,
            score: room.players[playerId].score,
            currentIndex: qIndex,
          });
        }

        const verdict = evaluate(question, body?.answer);
        const pointsAwarded = verdict.correct ? Number(question.points || 1000) : 0;

        room.responsesByQuestion[qIndex][playerId] = {
          answer: body?.answer,
          correct: verdict.correct,
          pointsAwarded,
          submittedAt: Date.now(),
        };

        room.players[playerId].score += pointsAwarded;
        room.updatedAt = Date.now();

        await this.#setRoom(room);

        return json({
          ok: true,
          alreadyAnswered: false,
          correct: verdict.correct,
          pointsAwarded,
          score: room.players[playerId].score,
          currentIndex: qIndex,
        });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err?.message || 'Unexpected error' }, 500);
    }
  }

  async #getRoom() {
    return (await this.state.storage.get('room')) || null;
  }

  async #setRoom(room) {
    await this.state.storage.put('room', room);
  }
}

function hostState(room) {
  const qIndex = room.currentIndex;
  const responses = room.responsesByQuestion[qIndex] || {};
  const players = Object.values(room.players)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answeredCurrent: !!responses[p.id],
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const question = room.phase === 'question' ? publicQuestion(room.quiz.questions[qIndex]) : null;

  return {
    phase: room.phase,
    pin: room.pin,
    currentIndex: room.currentIndex,
    totalQuestions: room.quiz.questions.length,
    playerCount: players.length,
    responseCount: Object.keys(responses).length,
    players,
    question,
  };
}

function playerState(room, playerId) {
  const player = room.players[playerId];
  const qIndex = room.currentIndex;
  const responses = room.responsesByQuestion[qIndex] || {};

  return {
    phase: room.phase,
    pin: room.pin,
    currentIndex: qIndex,
    totalQuestions: room.quiz.questions.length,
    score: player.score,
    answeredCurrent: !!responses[playerId],
    question: room.phase === 'question' ? publicQuestion(room.quiz.questions[qIndex]) : null,
    leaderboard: Object.values(room.players)
      .map((p) => ({ name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  };
}

function publicQuestion(question) {
  if (!question) return null;

  if (question.type === 'mcq' || question.type === 'tf') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      answers: (question.answers || []).map((a) => ({ text: a.text })),
    };
  }

  if (question.type === 'text') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
    };
  }

  return {
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    timeLimit: question.timeLimit,
  };
}

function evaluate(question, answer) {
  if (!question) return { correct: false };

  if (question.type === 'mcq' || question.type === 'tf') {
    const selected = Number(answer);
    if (!Number.isFinite(selected)) return { correct: false };
    const correctIndex = (question.answers || []).findIndex((a) => !!a.correct);
    return { correct: selected === correctIndex };
  }

  if (question.type === 'text') {
    const guess = normalizeTextAnswer(answer);
    const accepted = (question.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    return { correct: accepted.includes(guess) };
  }

  return { correct: false };
}

function normalizeQuiz(quiz) {
  return {
    version: 1,
    title: String(quiz.title || '').slice(0, 120),
    questions: (quiz.questions || []).map((q) => {
      const base = {
        id: String(q.id || randomId('q_')),
        type: q.type,
        prompt: String(q.prompt || '').slice(0, 120),
        points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
        timeLimit: clamp(Number(q.timeLimit || 20), q.type === 'text' ? 20 : 5, 240),
      };

      if (q.type === 'mcq' || q.type === 'tf') {
        const maxAnswers = q.type === 'tf' ? 2 : 6;
        const answers = (q.answers || [])
          .slice(0, maxAnswers)
          .map((a) => ({ text: String(a.text || '').slice(0, 75), correct: !!a.correct }));

        if (q.type === 'tf') {
          answers[0] = { text: 'True', correct: !!answers[0]?.correct };
          answers[1] = { text: 'False', correct: !!answers[1]?.correct };
        }

        if (!answers.some((a) => a.correct) && answers.length) answers[0].correct = true;
        return { ...base, answers };
      }

      if (q.type === 'text') {
        const accepted = (q.accepted || []).slice(0, 4).map((x) => String(x || '').slice(0, 20));
        return { ...base, accepted };
      }

      return base;
    }),
  };
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizePin(pin) {
  const p = String(pin || '').trim();
  return /^\d{6}$/.test(p) ? p : '';
}

function sanitizeName(name) {
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 40);
}

function sanitizeId(id) {
  return String(id || '').trim().slice(0, 128);
}

function randomToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function randomId(prefix = '') {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function readBearer(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7).trim();
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
