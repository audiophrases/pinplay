const ROOM_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Player-Token',
};

const RANDOM_NAMES = [
  'Neon Ninja', 'Cosmic Panda', 'Turbo Otter', 'Pixel Falcon', 'Comet Rider', 'Laser Lynx',
  'Captain Mango', 'Nova Turtle', 'Rainbow Fox', 'Thunder Koala', 'Moon Cheetah', 'Rocket Gecko',
  'Shadow Penguin', 'Blaze Sparrow', 'Mystic Dolphin', 'Cobalt Tiger', 'Breeze Dragon', 'Jade Wolf',
  'Berry Falcon', 'Sunny Shark', 'Nimbus Owl', 'Echo Raccoon', 'Orion Rabbit', 'Coral Panther',
  'Maple Jaguar', 'Ruby Seahorse', 'Aster Viper', 'Lemon Phoenix', 'Juniper Eagle', 'Tango Lion',
];

const BLOCKED_NICK_PATTERNS = [
  /\bnazi\b/i,
  /\bhitler\b/i,
  /\bterrorist\b/i,
  /\brape\b/i,
  /\bkill\s*yourself\b/i,
];

const ALLOWED_REACTIONS = new Set([
  '👍','🤩','😹','🙀','🤣','🔥','🤯','😘','😎','🤟','😜','😻','😽','😅','😱','😼','🥳','🫠','🫡','👾','✌️','☝️','🤙','💪','🙈','🙉','🙊','❤️','✅','6️⃣','7️⃣','🆗','🆙','🆒','🆕','🆓'
]);

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
      const options = body?.options || {};

      if (!quiz?.questions?.length) {
        return json({ error: 'Quiz must include at least one question.' }, 400);
      }

      for (let i = 0; i < 15; i++) {
        const pin = makePin();
        const id = env.ROOMS.idFromName(pin);
        const stub = env.ROOMS.get(id);

        const initRes = await stub.fetch('https://room/init', {
          method: 'POST',
          body: JSON.stringify({ pin, quiz, options }),
        });

        if (initRes.status === 201) {
          const data = await initRes.json();
          return json(data, 201);
        }
      }

      return json({ error: 'Could not allocate PIN. Try again.' }, 503);
    }

    if (url.pathname === '/api/pin/check' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const clientId = sanitizeId(url.searchParams.get('clientId'));
      if (!pin) return json({ error: 'PIN must be 6 digits.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch(`https://room/pin/check?clientId=${encodeURIComponent(clientId)}`, {
          method: 'GET',
        }),
      );
    }

    if (url.pathname === '/api/join' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const name = sanitizeName(body?.name);
      const clientId = sanitizeId(body?.clientId);

      if (!pin) return json({ error: 'PIN must be 6 digits.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/join', {
          method: 'POST',
          body: JSON.stringify({ name, clientId }),
        }),
      );
    }

    if (url.pathname === '/api/host/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/state', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/join' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      if (!pin) return json({ error: 'PIN required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/join', {
          method: 'POST',
        }),
      );
    }

    if (url.pathname === '/api/host/start' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/quiz/update' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/quiz/update', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ quiz: body?.quiz }),
        }),
      );
    }

    if (url.pathname === '/api/host/next' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/next', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/prev' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/prev', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/reveal' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/reveal', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/settings' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/settings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ randomNames: !!body?.randomNames }),
        }),
      );
    }

    if (url.pathname === '/api/host/kick' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/kick', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ playerId: sanitizeId(body?.playerId) }),
        }),
      );
    }

    if (url.pathname === '/api/host/rename' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/rename', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            name: sanitizeName(body?.name),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/adjust-score' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/adjust-score', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            delta: Number(body?.delta || 0),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/grade-open' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/grade-open', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            points: Number(body?.points || 0),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/poll/hide' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/poll/hide', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
          }),
        }),
      );
    }

    if (url.pathname === '/api/player/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const playerId = sanitizeId(url.searchParams.get('playerId'));
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/player/state', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken }),
        }),
      );
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
      return withCors(
        await stub.fetch('https://room/answer', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken, answer: body?.answer, bet: sanitizeBet(body?.bet) }),
        }),
      );
    }

    if (url.pathname === '/api/react' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const playerId = sanitizeId(body?.playerId);
      const playerToken = request.headers.get('X-Player-Token') || '';
      const emoji = sanitizeReaction(body?.emoji);

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);
      if (!emoji) return json({ error: 'Invalid reaction.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/react', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken, emoji }),
        }),
      );
    }

    if (url.pathname === '/api/drive/publish' && request.method === 'POST') {
      const body = await safeJson(request);
      const quiz = body?.quiz;

      if (!quiz?.questions?.length) return json({ error: 'Quiz must include at least one question.' }, 400);

      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      if (!scriptUrl) {
        return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);
      }

      const outbound = {
        source: 'pinplay',
        secret: String(env.DRIVE_SHARED_SECRET || ''),
        quiz,
      };

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
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

        if (!res.ok) {
          return json({ error: data?.error || `Drive bridge failed (${res.status}).` }, 502);
        }

        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive bridge request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/list' && request.method === 'GET') {
      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      const secret = String(env.DRIVE_SHARED_SECRET || '');
      if (!scriptUrl) return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);

      try {
        const bridgeUrl = new URL(scriptUrl);
        bridgeUrl.searchParams.set('action', 'list');
        bridgeUrl.searchParams.set('secret', secret);

        const res = await fetch(bridgeUrl.toString(), { method: 'GET' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || data?.error) return json({ error: data?.error || 'Drive list failed.' }, 502);
        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive list request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/open' && request.method === 'GET') {
      const fileId = sanitizeId(url.searchParams.get('fileId'));
      if (!fileId) return json({ error: 'fileId required.' }, 400);

      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      const secret = String(env.DRIVE_SHARED_SECRET || '');
      if (!scriptUrl) return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);

      try {
        const bridgeUrl = new URL(scriptUrl);
        bridgeUrl.searchParams.set('action', 'open');
        bridgeUrl.searchParams.set('secret', secret);
        bridgeUrl.searchParams.set('fileId', fileId);

        const res = await fetch(bridgeUrl.toString(), { method: 'GET' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || data?.error) return json({ error: data?.error || 'Drive open failed.' }, 502);
        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive open request failed: ${err.message}` }, 502);
      }
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
        const options = body?.options || {};

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
          questionStartedAt: null,
          questionClosed: false,
          questionClosedAt: null,
          questionCloseReason: null,
          quiz: normalizeQuiz(quiz),
          players: {},
          responsesByQuestion: {},
          reactionsByQuestion: {},
          settings: {
            randomNames: !!options.randomNames,
          },
        };

        await this.#setRoom(room);
        return json({ pin, hostToken: room.hostToken, settings: room.settings }, 201);
      }

      const room = await this.#getRoom();
      if (!room) return json({ error: 'Room not found.' }, 404);

      if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
        await this.state.storage.delete('room');
        return json({ error: 'Room expired.' }, 410);
      }

      if (url.pathname === '/pin/check' && request.method === 'GET') {
        const clientId = sanitizeId(url.searchParams.get('clientId'));
        const existing = findPlayerByClientId(room, clientId);
        return json({
          ok: true,
          pin: room.pin,
          phase: room.phase,
          settings: {
            randomNames: !!room.settings?.randomNames,
          },
          alreadyJoined: !!existing,
          joinedPlayer: existing
            ? {
                id: existing.id,
                name: existing.name,
              }
            : null,
        });
      }

      if (url.pathname === '/join' && request.method === 'POST') {
        const body = await safeJson(request);
        const rawName = sanitizeName(body?.name);
        const clientId = sanitizeId(body?.clientId);

        if (clientId) {
          const existing = findPlayerByClientId(room, clientId);
          if (existing) {
            return json({
              playerId: existing.id,
              playerToken: existing.token,
              pin: room.pin,
              name: existing.name,
              alreadyJoined: true,
            });
          }
        }

        let name = rawName;
        if (room.settings?.randomNames) {
          name = pickRandomName(room.players);
        }

        if (!name) return json({ error: 'Name is required.' }, 400);
        if (hasBlockedNickname(name)) {
          return json({ error: 'Nickname not allowed. Please choose another one.' }, 400);
        }

        if (!room.settings?.randomNames) {
          const nameTaken = Object.values(room.players || {}).some((p) => normalizeNameKey(p.name) === normalizeNameKey(name));
          if (nameTaken) return json({ error: 'Name already in use in this game.' }, 409);
        }

        const playerId = randomId('p_');
        const playerToken = randomToken();

        room.players[playerId] = {
          id: playerId,
          name,
          token: playerToken,
          clientId: clientId || '',
          score: 0,
          joinedAt: Date.now(),
        };

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ playerId, playerToken, pin: room.pin, name, alreadyJoined: false });
      }

      if (url.pathname === '/host/state' && request.method === 'GET') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/join' && request.method === 'POST') {
        return json({ ok: true, pin: room.pin, hostToken: room.hostToken, phase: room.phase });
      }

      if (url.pathname === '/host/start' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'lobby' && room.quiz.questions.length > 0) {
          startQuestion(room, 0);
          await this.#setRoom(room);
        }

        return json(hostState(room));
      }

      if (url.pathname === '/host/quiz/update' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const nextQuiz = normalizeQuiz(body?.quiz || {});
        if (!nextQuiz.questions?.length) return json({ error: 'Quiz must include at least one valid question.' }, 400);

        if (room.phase === 'question' && room.currentIndex >= nextQuiz.questions.length) {
          return json({ error: 'Updated quiz is shorter than current live index.' }, 409);
        }

        room.quiz = nextQuiz;
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/next' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        closeQuestionIfTimedOut(room);

        if (room.phase === 'lobby') {
          if (room.quiz.questions.length > 0) startQuestion(room, 0);
        } else if (room.phase === 'question') {
          if (room.currentIndex + 1 < room.quiz.questions.length) {
            startQuestion(room, room.currentIndex + 1);
          } else {
            room.phase = 'results';
            room.questionStartedAt = null;
            room.questionClosed = true;
            room.questionClosedAt = Date.now();
            room.questionCloseReason = 'finished';
            room.updatedAt = Date.now();
          }
        }

        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/prev' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        closeQuestionIfTimedOut(room);

        if (room.phase === 'results') {
          if (room.quiz.questions.length > 0) startQuestion(room, room.quiz.questions.length - 1);
        } else if (room.phase === 'question' && room.currentIndex > 0) {
          startQuestion(room, room.currentIndex - 1);
        }

        await this.#setRoom(room);
        return json(hostState(room));
      }

      if (url.pathname === '/host/reveal' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'question') {
          closeCurrentQuestion(room, 'manual_reveal');
          await this.#setRoom(room);
        }

        return json(hostState(room));
      }

      if (url.pathname === '/host/settings' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        room.settings = {
          ...(room.settings || {}),
          randomNames: !!body?.randomNames,
        };
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/kick' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        delete room.players[playerId];

        Object.keys(room.responsesByQuestion || {}).forEach((qIdx) => {
          if (room.responsesByQuestion[qIdx]?.[playerId]) {
            delete room.responsesByQuestion[qIdx][playerId];
          }
        });

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId });
      }

      if (url.pathname === '/host/rename' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const nextName = sanitizeName(body?.name);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        if (!nextName) return json({ error: 'Name is required.' }, 400);
        if (hasBlockedNickname(nextName)) return json({ error: 'Name is not allowed.' }, 400);

        const nameTaken = Object.values(room.players || {}).some((p) => p.id !== playerId && normalizeNameKey(p.name) === normalizeNameKey(nextName));
        if (nameTaken) return json({ error: 'Name already in use.' }, 409);

        room.players[playerId].name = nextName;
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, name: nextName });
      }

      if (url.pathname === '/host/adjust-score' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const delta = Number(body?.delta || 0);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        if (!Number.isFinite(delta) || delta === 0) return json({ error: 'delta must be a non-zero number.' }, 400);

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) + Math.round(delta));
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, score: room.players[playerId].score, delta: Math.round(delta) });
      }

      if (url.pathname === '/host/grade-open' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const pointsRaw = Number(body?.points);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !(question.type === 'open' || question.type === 'image_open' || isTeacherGradedTextQuestion(question))) return json({ error: 'Current question is not teacher-graded.' }, 409);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted open answer for this player.' }, 404);

        const maxPoints = Number(question.points || 1000);
        const rawPoints = Math.round(clamp(pointsRaw, 0, maxPoints));
        const isCorrect = rawPoints > 0;
        const adjustedPoints = applyBetScore(maxPoints, rawPoints, isCorrect, sanitizeBet(resp?.bet));

        const prev = Number(resp.pointsAwarded || 0);
        resp.rawPoints = rawPoints;
        resp.pointsAwarded = adjustedPoints;
        resp.correct = isCorrect;
        resp.graded = true;
        resp.gradedAt = Date.now();

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) - prev + adjustedPoints);
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, pointsAwarded: adjustedPoints, score: room.players[playerId].score });
      }

      if (url.pathname === '/host/poll/hide' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !question.isPoll) return json({ error: 'Current question is not a poll.' }, 409);
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted answer for this player.' }, 404);

        resp.hidden = true;
        resp.hiddenAt = Date.now();
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, hidden: true });
      }

      if (url.pathname === '/player/state' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        return json(playerState(room, playerId));
      }

      if (url.pathname === '/answer' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');
        const bet = sanitizeBet(body?.bet);

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        if (room.questionClosed) return json({ error: 'Question is closed.' }, 409);

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

        let verdict = { correct: false };
        let pointsAwarded = 0;

        if (question.isPoll) {
          room.responsesByQuestion[qIndex][playerId] = {
            answer: body?.answer,
            correct: false,
            bet: 0,
            pointsAwarded: 0,
            graded: true,
            hidden: false,
            submittedAt: Date.now(),
          };
        } else if (question.type === 'open' || question.type === 'image_open' || isTeacherGradedTextQuestion(question)) {
          room.responsesByQuestion[qIndex][playerId] = {
            answer: String(body?.answer || '').slice(0, 220),
            correct: false,
            bet,
            pointsAwarded: 0,
            graded: false,
            submittedAt: Date.now(),
          };
        } else {
          verdict = evaluate(question, body?.answer);
          const basePoints = Number(question.points || 1000);

          if (verdict.correct) {
            const correctCountSoFar = Object.values(room.responsesByQuestion[qIndex] || {}).filter((r) => !!r?.correct).length;
            const rank = correctCountSoFar + 1;
            const multiplier = rank <= 2 ? 1 : (rank <= 4 ? 0.9 : 0.8);
            pointsAwarded = Math.round(basePoints * multiplier);
          }

          pointsAwarded = applyBetScore(basePoints, pointsAwarded, verdict.correct, bet);

          room.responsesByQuestion[qIndex][playerId] = {
            answer: body?.answer,
            correct: verdict.correct,
            bet,
            pointsAwarded,
            submittedAt: Date.now(),
          };
        }

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) + Math.round(pointsAwarded));

        const totalPlayers = Object.keys(room.players || {}).length;
        const answeredCount = Object.keys(room.responsesByQuestion[qIndex] || {}).length;
        if (totalPlayers > 0 && answeredCount >= totalPlayers) {
          closeCurrentQuestion(room, 'all_answered');
        } else {
          room.updatedAt = Date.now();
        }

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

      if (url.pathname === '/react' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');
        const emoji = sanitizeReaction(body?.emoji);

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);
        if (!emoji) return json({ error: 'Invalid reaction.' }, 400);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);

        const qIndex = room.currentIndex;
        room.reactionsByQuestion = room.reactionsByQuestion || {};
        room.reactionsByQuestion[qIndex] = room.reactionsByQuestion[qIndex] || [];

        const list = room.reactionsByQuestion[qIndex];
        const payload = {
          playerId,
          name: player.name,
          emoji,
          at: Date.now(),
        };

        list.push(payload);
        if (list.length > 120) list.splice(0, list.length - 120);

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, reaction: payload });
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
  const startedAt = Number(room.questionStartedAt || 0);
  const reactions = (room.reactionsByQuestion?.[qIndex] || []).filter((r) => Number(r?.at || 0) >= startedAt);
  const players = Object.values(room.players)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answeredCurrent: !!responses[p.id],
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const roomQuestion = room.quiz.questions[qIndex] || null;
  const question = room.phase === 'question' ? hostQuestionPayload(roomQuestion) : null;
  const timeLimitSec = getQuestionTimeLimitSec(roomQuestion);

  const pollVisible = room.phase === 'question' && !!room.questionClosed && !!roomQuestion?.isPoll;
  const pollResponses = pollVisible
    ? Object.entries(responses).map(([pid, r]) => ({
        playerId: pid,
        name: room.players?.[pid]?.name || 'Student',
        answer: r?.answer,
        hidden: !!r?.hidden,
      }))
    : [];

  return {
    phase: room.phase,
    pin: room.pin,
    currentIndex: room.currentIndex,
    totalQuestions: room.quiz.questions.length,
    playerCount: players.length,
    responseCount: Object.keys(responses).length,
    reactions,
    players,
    question,
    questionStartedAt: room.questionStartedAt || null,
    questionClosed: !!room.questionClosed,
    questionClosedAt: room.questionClosedAt || null,
    questionCloseReason: room.questionCloseReason || null,
    questionDeadlineAt:
      room.phase === 'question' && room.questionStartedAt && Number.isFinite(timeLimitSec)
        ? Number(room.questionStartedAt) + timeLimitSec * 1000
        : null,
    allAnswered: room.phase === 'question' && players.length > 0 && Object.keys(responses).length >= players.length,
    openResponses: room.phase === 'question' && !roomQuestion?.isPoll && (['open', 'image_open'].includes(roomQuestion?.type) || isTeacherGradedTextQuestion(roomQuestion))
      ? Object.entries(responses).map(([pid, r]) => ({
          playerId: pid,
          name: room.players?.[pid]?.name || 'Student',
          answer: String(r?.answer || ''),
          graded: !!r?.graded,
          pointsAwarded: Number(r?.pointsAwarded || 0),
        }))
      : [],
    pollSummary: pollVisible ? summarizePoll(roomQuestion, pollResponses) : null,
    pollResponses,
    correctAnswer:
      room.phase === 'question' && room.questionClosed && !roomQuestion?.isPoll
      && !['open', 'image_open'].includes(roomQuestion?.type)
      && !isTeacherGradedTextQuestion(roomQuestion)
        ? hostCorrectSummary(roomQuestion)
        : '',
    settings: {
      randomNames: !!room.settings?.randomNames,
    },
  };
}

function playerState(room, playerId) {
  const player = room.players[playerId];
  const qIndex = room.currentIndex;
  const responses = room.responsesByQuestion[qIndex] || {};

  const myResponse = responses[playerId] || null;

  return {
    phase: room.phase,
    pin: room.pin,
    name: player.name,
    currentIndex: qIndex,
    totalQuestions: room.quiz.questions.length,
    score: player.score,
    answeredCurrent: !!myResponse,
    revealedResult: room.phase === 'question' && room.questionClosed && myResponse && !room.quiz.questions[qIndex]?.isPoll
      ? {
          correct: !!myResponse.correct,
          pointsAwarded: Number(myResponse.pointsAwarded || 0),
          graded: !!myResponse.graded,
          bet: sanitizeBet(myResponse.bet),
        }
      : null,
    question: room.phase === 'question' ? publicQuestion(room.quiz.questions[qIndex]) : null,
    correctAnswer:
      room.phase === 'question' && room.questionClosed && !room.quiz.questions[qIndex]?.isPoll
      && !['open', 'image_open'].includes(room.quiz.questions[qIndex]?.type)
      && !isTeacherGradedTextQuestion(room.quiz.questions[qIndex])
        ? hostCorrectSummary(room.quiz.questions[qIndex])
        : '',
    questionClosed: room.phase === 'question' ? !!room.questionClosed : false,
    questionStartedAt: room.phase === 'question' ? room.questionStartedAt || null : null,
    questionClosedAt: room.phase === 'question' ? room.questionClosedAt || null : null,
    questionCloseReason: room.phase === 'question' ? room.questionCloseReason || null : null,
    leaderboard: Object.values(room.players)
      .map((p) => ({ name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  };
}

function hostQuestionPayload(question) {
  if (!question) return null;

  const base = publicQuestion(question);
  if (!base) return null;

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const answers = (question.answers || []).map((a) => ({ text: a.text, isCorrect: !!a.correct }));
    const correctIndexes = answers.map((a, idx) => (a.isCorrect ? idx : null)).filter((idx) => idx !== null);
    return {
      ...base,
      answers,
      correctIndexes,
    };
  }

  if (question.type === 'text') {
    return {
      ...base,
      accepted: (question.accepted || []).filter(Boolean),
    };
  }

  if (question.type === 'puzzle') {
    return {
      ...base,
      items: [...(question.items || [])],
    };
  }

  if (question.type === 'slider') {
    return {
      ...base,
      target: question.target,
    };
  }

  if (question.type === 'pin') {
    return {
      ...base,
      zone: question.zone
        ? {
            x: Number(question.zone.x),
            y: Number(question.zone.y),
            r: Number(question.zone.r),
          }
        : null,
    };
  }

  return base;
}

function getQuestionTimeLimitSec(question) {
  if (!question) return null;
  const value = normalizeTimeLimitValue(question.timeLimit, question.type);
  if (value === 0) return null;
  return value;
}

function closeCurrentQuestion(room, reason = 'manual_reveal') {
  if (room.phase !== 'question') return false;
  if (room.questionClosed) return false;

  room.questionClosed = true;
  room.questionClosedAt = Date.now();
  room.questionCloseReason = String(reason || 'manual_reveal');
  room.updatedAt = Date.now();
  return true;
}

function closeQuestionIfTimedOut(room) {
  if (room.phase !== 'question' || room.questionClosed) return false;

  const question = room.quiz.questions?.[room.currentIndex];
  if (!question) return false;

  const startedAt = Number(room.questionStartedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return false;

  const timeLimitSec = getQuestionTimeLimitSec(question);
  if (!Number.isFinite(timeLimitSec) || timeLimitSec <= 0) return false;
  const deadline = startedAt + timeLimitSec * 1000;

  if (Date.now() < deadline) return false;
  return closeCurrentQuestion(room, 'timeout');
}

function startQuestion(room, index) {
  const qIndex = Number(index);
  if (!Number.isFinite(qIndex)) return false;
  if (qIndex < 0 || qIndex >= room.quiz.questions.length) return false;

  room.phase = 'question';
  room.currentIndex = qIndex;
  room.questionStartedAt = Date.now();
  room.questionClosed = false;
  room.questionClosedAt = null;
  room.questionCloseReason = null;
  room.updatedAt = Date.now();
  return true;
}

function publicQuestion(question) {
  if (!question) return null;

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      answers: (question.answers || []).map((a) => ({ text: a.text })),
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      imageData: question.type === 'image_open' ? String(question.imageData || '') : undefined,
      gapCount: question.type === 'context_gap' ? Number((question.gaps || []).filter(Boolean).length || 0) : undefined,
      leftItems: question.type === 'match_pairs' ? (question.pairs || []).map((p) => String(p.left || '')) : undefined,
      rightOptions: question.type === 'match_pairs' ? stableShuffle((question.pairs || []).map((p) => String(p.right || '')), question.id || question.prompt || 'pairs') : undefined,
      requiredErrors: question.type === 'error_hunt' ? countErrorHuntRequiredTokens(question.prompt, question.corrected) : undefined,
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'puzzle') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      length: (question.items || []).length,
      options: stableShuffle(question.items || [], question.id || question.prompt || 'puzzle'),
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'slider') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      min: question.min,
      max: question.max,
      margin: question.margin,
      unit: question.unit || '',
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'pin') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      imageData: question.imageData || '',
      ...publicAudioPayload(question),
    };
  }

  return {
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    timeLimit: question.timeLimit,
    ...publicAudioPayload(question),
  };
}

function publicAudioPayload(question) {
  const enabled = !!question?.audioEnabled || question?.type === 'audio';
  if (!enabled) return { audioEnabled: false };
  return {
    audioEnabled: true,
    audioMode: ['tts', 'file'].includes(String(question?.audioMode || '')) ? String(question.audioMode) : (question?.audioData ? 'file' : 'tts'),
    audioText: String(question?.audioText || ''),
    language: String(question?.language || 'en-US-Wave'),
    audioData: String(question?.audioData || ''),
  };
}

function evaluate(question, answer) {
  if (!question) return { correct: false };

  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const selected = Number(answer);
    if (!Number.isFinite(selected)) return { correct: false };
    const correctIndex = (question.answers || []).findIndex((a) => !!a.correct);
    return { correct: selected === correctIndex };
  }

  if (question.type === 'multi') {
    const selected = Array.isArray(answer) ? answer.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    if (!selected.length) return { correct: false };

    const expected = (question.answers || [])
      .map((a, idx) => (a.correct ? idx : null))
      .filter((x) => x !== null);

    if (selected.length !== expected.length) return { correct: false };
    return { correct: selected.every((idx) => expected.includes(idx)) };
  }

  if (question.type === 'text') {
    const guess = normalizeTextAnswer(answer);
    const accepted = (question.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    return { correct: accepted.includes(guess) };
  }

  if (question.type === 'context_gap') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    const expected = (question.gaps || []).map(normalizeTextAnswer).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected) };
  }

  if (question.type === 'match_pairs') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    const expected = (question.pairs || []).map((p) => normalizeTextAnswer(p.right)).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected) };
  }

  if (question.type === 'error_hunt') {
    const rewrite = normalizeTextAnswer(answer?.rewrite ?? answer);
    const expected = normalizeTextAnswer(question.corrected || '');
    const selected = Array.isArray(answer?.selectedTokens) ? answer.selectedTokens.map((x) => Number(x)).filter(Number.isFinite) : [];
    const required = countErrorHuntRequiredTokens(question.prompt, question.corrected);
    const uniqueCount = new Set(selected).size;
    if (uniqueCount !== required) return { correct: false };
    return { correct: !!rewrite && rewrite === expected };
  }

  if (question.type === 'puzzle') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer) : [];
    const expected = (question.items || []).map(normalizeTextAnswer);
    if (!guess.length || guess.length !== expected.length) return { correct: false };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected) };
  }

  if (question.type === 'slider') {
    const value = Number(answer);
    if (!Number.isFinite(value)) return { correct: false };
    const tol = sliderTolerance(question.margin, question.min, question.max);
    const diff = Math.abs(value - Number(question.target));
    return { correct: diff <= tol };
  }

  if (question.type === 'pin') {
    const x = Number(answer?.x);
    const y = Number(answer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { correct: false };
    const zone = question.zone || { x: 50, y: 50, r: 15 };
    const d = distance2D(x, y, Number(zone.x), Number(zone.y));
    return { correct: d <= Number(zone.r) };
  }

  return { correct: false };
}

function normalizeQuiz(quiz) {
  const normalized = {
    version: 1,
    title: String(quiz.title || '').slice(0, 120),
    questions: [],
  };

  (quiz.questions || []).forEach((q) => {
    const base = {
      id: String(q.id || randomId('q_')),
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 120),
      points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
      timeLimit: normalizeTimeLimitValue(q.timeLimit, q.type),
      isPoll: !!q.isPoll,
      audioEnabled: !!q.audioEnabled || q.type === 'audio',
      audioMode: ['tts', 'file'].includes(String(q.audioMode || '')) ? String(q.audioMode) : 'tts',
      audioText: String(q.audioText || '').slice(0, 120),
      language: String(q.language || 'en-US-Wave').slice(0, 32) || 'en-US-Wave',
      audioData: String(q.audioData || ''),
    };

    if (['mcq', 'multi', 'audio'].includes(q.type)) {
      const answers = (q.answers || [])
        .slice(0, 6)
        .map((a) => ({ text: String(a.text || '').slice(0, 75), correct: !!a.correct }))
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
      const answers = [
        { text: 'True', correct: !!q.answers?.[0]?.correct },
        { text: 'False', correct: !!q.answers?.[1]?.correct },
      ];
      if (!answers.some((a) => a.correct)) answers[0].correct = true;
      normalized.questions.push({ ...base, answers });
      return;
    }

    if (q.type === 'text') {
      normalized.questions.push({
        ...base,
        accepted: (q.accepted || []).slice(0, 4).map((x) => String(x || '').slice(0, 20)),
      });
      return;
    }

    if (q.type === 'open') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'image_open') {
      if (!q.imageData) return;
      normalized.questions.push({ ...base, imageData: String(q.imageData || '') });
      return;
    }

    if (q.type === 'context_gap') {
      const gaps = (q.gaps || []).map((x) => String(x || '').slice(0, 20)).filter(Boolean).slice(0, 4);
      if (gaps.length < 2) return;
      normalized.questions.push({ ...base, gaps });
      return;
    }

    if (q.type === 'match_pairs') {
      const pairs = (q.pairs || [])
        .map((p) => ({ left: String(p?.left || '').slice(0, 40).trim(), right: String(p?.right || '').slice(0, 40).trim() }))
        .filter((p) => p.left && p.right)
        .slice(0, 6);
      if (pairs.length < 2) return;
      normalized.questions.push({ ...base, pairs });
      return;
    }

    if (q.type === 'error_hunt') {
      const corrected = String(q.corrected || '').slice(0, 160).trim();
      if (!corrected) return;
      const requiredErrors = countErrorHuntRequiredTokens(base.prompt, corrected);
      normalized.questions.push({ ...base, corrected, requiredErrors });
      return;
    }

    if (q.type === 'puzzle') {
      const items = (q.items || []).map((x) => String(x || '').slice(0, 75)).filter(Boolean).slice(0, 9);
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
      const zone = q.zone || {};
      normalized.questions.push({
        ...base,
        imageData: String(q.imageData || ''),
        zone: {
          x: round(clamp(Number(zone.x ?? 50), 0, 100), 1),
          y: round(clamp(Number(zone.y ?? 50), 0, 100), 1),
          r: round(clamp(Number(zone.r ?? 15), 1, 100), 1),
        },
      });
    }
  });

  if (!normalized.questions.length) {
    throw new Error('No valid questions for room.');
  }

  return normalized;
}

function stableShuffle(arr, seedInput) {
  const a = [...arr];
  let seed = hash(seedInput || 'seed');
  for (let i = a.length - 1; i > 0; i--) {
    seed = nextSeed(seed);
    const j = Math.floor(seed * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function nextSeed(seed) {
  // Mulberry32-like step mapped to [0,1)
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countErrorHuntRequiredTokens(prompt, corrected) {
  const source = tokenizeWords(prompt);
  const target = tokenizeWords(corrected);
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = normalizeTextAnswer(source[i - 1]) === normalizeTextAnswer(target[j - 1]);
      if (same) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return dp[source.length][target.length];
}

function distance2D(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'pin'].includes(type)) return 20;
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

function sanitizeReaction(emoji) {
  const value = String(emoji || '').trim();
  return ALLOWED_REACTIONS.has(value) ? value : '';
}

function sanitizeBet(value) {
  const n = Number(value || 0);
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

function applyBetScore(questionPoints, baseAwarded, isCorrect, bet) {
  const b = sanitizeBet(bet);
  const qPoints = Math.max(0, Number(questionPoints || 0));
  const base = Number(baseAwarded || 0);

  if (!b) return Math.round(base);

  if (isCorrect) {
    const bonusRate = b === 1 ? 0.15 : (b === 2 ? 0.25 : 0.4);
    return Math.round(base * (1 + bonusRate));
  }

  const penaltyRate = b === 1 ? 0.05 : (b === 2 ? 0.15 : 0.3);
  return -Math.round(qPoints * penaltyRate);
}

function normalizeNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

function findPlayerByClientId(room, clientId) {
  if (!clientId) return null;
  return Object.values(room.players || {}).find((p) => String(p.clientId || '') === clientId) || null;
}

function summarizePoll(question, responses) {
  const list = Array.isArray(responses) ? responses : [];
  const visible = list.filter((r) => !r?.hidden);
  const hiddenCount = list.length - visible.length;
  const counts = new Map();

  const pushCount = (label) => {
    const key = String(label || '').trim() || '(blank)';
    counts.set(key, (counts.get(key) || 0) + 1);
  };

  const answers = visible.map((r) => r?.answer);

  if (['mcq', 'tf', 'audio'].includes(question?.type)) {
    answers.forEach((a) => {
      const idx = Number(a);
      const txt = Number.isFinite(idx) ? String(question.answers?.[idx]?.text || `Option ${idx + 1}`) : '(blank)';
      pushCount(txt);
    });
  } else if (question?.type === 'multi') {
    answers.forEach((a) => {
      const arr = Array.isArray(a) ? a : [];
      const key = arr.map((idx) => String(question.answers?.[Number(idx)]?.text || '')).filter(Boolean).join(' + ');
      pushCount(key || '(none)');
    });
  } else if (question?.type === 'slider') {
    answers.forEach((a) => pushCount(String(Math.round(Number(a || 0)))));
  } else if (question?.type === 'pin') {
    answers.forEach((a) => {
      const x = Math.round(Number(a?.x || 0));
      const y = Math.round(Number(a?.y || 0));
      pushCount(`(${x}%, ${y}%)`);
    });
  } else if (question?.type === 'error_hunt') {
    answers.forEach((a) => pushCount(String(a?.rewrite || '')));
  } else if (question?.type === 'context_gap' || question?.type === 'match_pairs' || question?.type === 'puzzle') {
    answers.forEach((a) => pushCount(Array.isArray(a) ? a.join(' | ') : String(a || '')));
  } else {
    answers.forEach((a) => pushCount(String(a || '')));
  }

  const allItems = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const items = allItems.slice(0, 15);
  const overflowCount = allItems.slice(15).reduce((sum, x) => sum + Number(x.count || 0), 0);

  return {
    type: question?.type || 'unknown',
    total: list.length,
    hiddenCount,
    otherCount: hiddenCount + overflowCount,
    items,
  };
}

function hostCorrectSummary(question) {
  if (!question) return '';

  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const idx = (question.answers || []).findIndex((a) => !!a.correct);
    return idx >= 0 ? `${idx + 1}. ${(question.answers[idx]?.text || '').trim()}` : '';
  }

  if (question.type === 'multi') {
    const values = (question.answers || [])
      .map((a, idx) => (a.correct ? `${idx + 1}. ${a.text}` : null))
      .filter(Boolean);
    return values.join(' | ');
  }

  if (question.type === 'text') {
    if (isTeacherGradedTextQuestion(question)) return 'Teacher-graded typed answer';
    return (question.accepted || []).filter(Boolean).join(' | ');
  }

  if (question.type === 'context_gap') {
    return (question.gaps || []).filter(Boolean).join(' | ');
  }

  if (question.type === 'match_pairs') {
    return (question.pairs || []).map((p) => `${p.left}→${p.right}`).join(' | ');
  }

  if (question.type === 'error_hunt') {
    return String(question.corrected || '');
  }

  if (question.type === 'open' || question.type === 'image_open') {
    return 'Teacher-graded open short answer';
  }

  if (question.type === 'puzzle') {
    return (question.items || []).join(' > ');
  }

  if (question.type === 'slider') {
    return `${question.target}${question.unit ? ` ${question.unit}` : ''}`;
  }

  if (question.type === 'pin') {
    return 'Pin zone set';
  }

  return '';
}

function isTeacherGradedTextQuestion(question) {
  if (!question || question.type !== 'text') return false;
  const accepted = (question.accepted || []).map((x) => String(x || '').trim()).filter(Boolean);
  return accepted.length === 0;
}

function hasBlockedNickname(name) {
  const value = String(name || '').trim();
  if (!value) return true;
  return BLOCKED_NICK_PATTERNS.some((re) => re.test(value));
}

function pickRandomName(playersMap) {
  const used = new Set(Object.values(playersMap || {}).map((p) => String(p.name || '').toLowerCase()));

  for (const base of RANDOM_NAMES) {
    if (!used.has(base.toLowerCase())) return base;
  }

  const base = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] || 'Player';
  let n = 2;
  while (used.has(`${base.toLowerCase()} ${n}`)) n += 1;
  return `${base} ${n}`;
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

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
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
