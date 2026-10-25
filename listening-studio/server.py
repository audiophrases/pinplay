"""PinPlay Listening Studio: the local server behind the studio page
(LISTENING_STUDIO_PLAN.md section 6). Started by "PinPlay Listening
Studio.bat"; listens on 127.0.0.1 only and refuses requests from other
websites, except PinPlay's teacher pages for a few routes (sending a script,
its progress, the finished MP3). Recordings live in the data folder; one job
runs at a time."""
import json
import os
import queue
import re
import sys
import threading
import time
import traceback
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:  # pythonw has no console
    pass

PORT = int(os.environ.get('PINPLAY_STUDIO_PORT') or 8790)  # tests use their own


def _studio_home():
    """The folder for the engine and recordings on this computer: chosen by the
    launcher (PINPLAY_STUDIO_HOME, or studio-home.txt next to this file, which
    cmd writes in the console's code page), else the usual folder on D:."""
    home = os.environ.get('PINPLAY_STUDIO_HOME', '').strip()
    if not home:
        try:
            with open(os.path.join(HERE, 'studio-home.txt'), encoding='oem' if os.name == 'nt' else 'utf-8') as f:
                home = f.read().strip()
        except (OSError, LookupError, UnicodeDecodeError):
            home = ''
    return home or r'D:\Admin\pinplay listening tts audio production'


STUDIO_HOME = _studio_home()
CONFIG = {
    'data': os.path.join(STUDIO_HOME, 'studio-data'),
    'hf_home': os.path.join(STUDIO_HOME, 'qwen3', 'hf'),
}
_config_path = os.path.join(HERE, 'config.json')
if os.path.exists(_config_path):
    CONFIG.update(json.load(open(_config_path, encoding='utf-8')))
CONFIG['data'] = os.environ.get('PINPLAY_STUDIO_DATA') or CONFIG['data']  # tests use their own folder
os.environ.setdefault('HF_HOME', CONFIG['hf_home'])
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
RECORDINGS = os.path.join(CONFIG['data'], 'recordings')
LIBRARY = os.path.join(CONFIG['data'], 'library')  # engine/library.py: library_of(any recording)
os.makedirs(RECORDINGS, exist_ok=True)
os.makedirs(LIBRARY, exist_ok=True)

import uvicorn  # noqa: E402
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, Response  # noqa: E402

from engine import catalog, conversation, library, phone  # noqa: E402
from engine.project import Project  # noqa: E402
import subprocess  # noqa: E402

app = FastAPI()
ALLOWED_ORIGINS = {f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'}
# PinPlay's 🎧 Listening activity may send a script, follow its recording and
# fetch the finished MP3, nothing else (LISTENING_STUDIO_PLAN.md, "The studio
# and the 🎧 Listening activity together").
PINPLAY_ORIGINS = {'https://audiophrases.github.io', 'https://pinplay.eugenime.workers.dev',
                   *CONFIG.get('pinplayOrigins', [])}
PINPLAY_ROUTES = [('GET', re.compile(r'/api/status')),
                  ('POST', re.compile(r'/api/recordings')),
                  ('GET', re.compile(r'/api/recordings/[a-z0-9]{8,32}')),
                  ('GET', re.compile(r'/api/recordings/[a-z0-9]{8,32}/audio/out/[\w.-]+\.mp3'))]


def _pinplay_may(method, path):
    return any(m == method and route.fullmatch(path) for m, route in PINPLAY_ROUTES)


@app.middleware('http')
async def only_this_page(request: Request, call_next):
    # Browsers send Origin on requests from other pages: only the studio
    # page itself may use this server, and PinPlay's pages the routes above.
    origin = request.headers.get('origin')
    if not origin or origin in ALLOWED_ORIGINS:
        return await call_next(request)
    if origin not in PINPLAY_ORIGINS:
        return JSONResponse({'error': 'Not allowed.'}, status_code=403)
    cors = {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'}
    path = request.url.path
    if request.method == 'OPTIONS':  # the browser asks first, with Chrome's local-network check
        wanted = request.headers.get('access-control-request-method', '')
        if not _pinplay_may(wanted, path):
            return JSONResponse({'error': 'Not allowed.'}, status_code=403, headers=cors)
        return Response(status_code=204, headers={**cors, 'Access-Control-Allow-Methods': wanted,
                                                  'Access-Control-Allow-Headers': 'Content-Type',
                                                  'Access-Control-Allow-Private-Network': 'true',
                                                  'Access-Control-Max-Age': '600'})
    if not _pinplay_may(request.method, path):
        return JSONResponse({'error': 'Not allowed.'}, status_code=403, headers=cors)
    response = await call_next(request)
    response.headers.update(cors)
    return response


# ---------------------------------------------------------------- recordings
def _folder(rid):
    if not re.fullmatch(r'[a-z0-9]{8,32}', rid or ''):
        raise HTTPException(404, 'Recording not found.')
    path = os.path.join(RECORDINGS, rid)
    if not os.path.isdir(path):
        raise HTTPException(404, 'Recording not found.')
    return path


def _load(rid):
    with open(os.path.join(_folder(rid), 'recording.json'), encoding='utf-8') as fh:
        return json.load(fh)


def _save(rec):
    rec['updated'] = time.time()
    path = os.path.join(RECORDINGS, rec['id'], 'recording.json')
    with open(path + '.tmp', 'w', encoding='utf-8') as fh:
        json.dump(rec, fh, ensure_ascii=False, indent=1)
    os.replace(path + '.tmp', path)


def _result(rid):
    path = os.path.join(_folder(rid), 'result.json')
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else None


# ---------------------------------------------------------------- the job runner
JOBS = queue.Queue()
STATE = {'job': None, 'queue': [], 'last': None, 'stop': False, 'proc': None}
LOCK = threading.Lock()


def _script_for(rec):
    """The parsed script, named with the recording's (editable) title."""
    return {**(rec.get('script') or {}), 'title': rec.get('title') or 'recording'}


def _project(rec):
    return Project(_folder(rec['id']), _script_for(rec), rec.get('settings') or {}, convo=rec.get('conversation'))


def _job_error(code, tail):
    """The job process failed: the most useful thing to tell the teacher."""
    for line in reversed(tail):
        if line.strip() and not line.startswith(' ') and ('Error' in line or 'Exception' in line):
            return line.strip()[:300]
    if code in (3221225477, -1073741819, 3221226505) or code < 0:
        return 'The voice engine stopped unexpectedly (probably not enough free memory: close other programs and try again)'
    return f'The voice engine stopped (code {code})'


def _worker():
    """Each job runs in its own process (engine/job.py): when it ends, Windows
    gets all its memory back (~7 GB), and Stop simply ends that process."""
    while True:
        rid, kind = JOBS.get()
        with LOCK:
            if [rid, kind] in STATE['queue']:
                STATE['queue'].remove([rid, kind])
            STATE['stop'] = False
            STATE['proc'] = None
            STATE['job'] = {'id': rid, 'kind': kind, 'stage': 'start', 'done': 0, 'total': 0, 'text': '',
                            'started': time.time(), 'stages': {}}

        def progress(event):
            with LOCK:
                job = STATE['job']
                job.update({k: event.get(k, job.get(k)) for k in ('stage', 'done', 'total', 'text')})
                job['stages'].setdefault(event['stage'], time.time())
                job['at'] = time.time()

        tail = []
        try:
            proc = subprocess.Popen(
                [sys.executable, '-u', '-m', 'engine.job', _folder(rid), kind], cwd=HERE,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace',
                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            with LOCK:
                STATE['proc'] = proc
            for line in proc.stdout:
                if line.startswith('@@'):
                    try:
                        progress(json.loads(line[2:]))
                    except ValueError:
                        pass
                    continue
                print(line, end='', flush=True)  # into the studio's log
                tail = (tail + [line.rstrip()])[-40:]
            code = proc.wait()
            if STATE['stop']:
                outcome = {'id': rid, 'kind': kind, 'ok': False, 'stopped': True, 'finished': time.time()}
            elif code == 0:
                outcome = {'id': rid, 'kind': kind, 'ok': True, 'finished': time.time()}
            else:
                outcome = {'id': rid, 'kind': kind, 'ok': False, 'error': _job_error(code, tail), 'finished': time.time()}
        except Exception as err:  # shown in the page, in plain words
            traceback.print_exc()
            outcome = {'id': rid, 'kind': kind, 'ok': False, 'error': str(err) or err.__class__.__name__, 'finished': time.time()}
        with LOCK:
            STATE['job'] = None
            STATE['proc'] = None
            STATE['last'] = outcome


threading.Thread(target=_worker, daemon=True).start()


def _warm_up():
    """Loads the audio decoding libraries (not Whisper's model) once the
    studio is up, so the first line the teacher records saves at once."""
    try:
        import librosa  # noqa: F401
        from faster_whisper import decode_audio  # noqa: F401
    except Exception:
        pass


threading.Thread(target=_warm_up, daemon=True).start()


def _queue_job(rid, kind='all'):
    """kind 'voices' (samples to approve) or 'all'. A recording waits in
    the queue at most once per kind."""
    with LOCK:
        if [rid, kind] not in STATE['queue']:
            STATE['queue'].append([rid, kind])
            JOBS.put((rid, kind))


def _make(rec, how):
    """'voices': back to the voice stage and make the samples; 'all':
    approved, make everything. Anything else: nothing to make."""
    if how == 'all':
        rec['stage'] = 'approved'
    elif how == 'voices':
        rec['stage'] = 'voices'
    else:
        return
    _save(rec)
    _queue_job(rec['id'], how)


# ---------------------------------------------------------------- the API
@app.get('/api/status')
def status():
    with LOCK:
        return {'ok': True, 'job': STATE['job'], 'queue': list(STATE['queue']), 'last': STATE['last'], 'now': time.time()}


@app.get('/api/recordings')
def list_recordings():
    out = []
    for rid in os.listdir(RECORDINGS):
        try:
            rec = _load(rid)
        except Exception:
            continue
        result = _result(rid)
        out.append({'id': rid, 'title': rec.get('title') or 'Untitled', 'updated': rec.get('updated'),
                    'parts': len((result or {}).get('parts') or []), 'from': rec.get('from'),
                    'stage': rec.get('stage'), 'source': rec.get('source')})
    return {'recordings': sorted(out, key=lambda r: -(r['updated'] or 0))}


@app.post('/api/recordings')
async def create_recording(request: Request):
    body = await request.json()
    rid = uuid.uuid4().hex[:12]
    os.makedirs(os.path.join(RECORDINGS, rid))
    # setup: the script has no language or voices yet (sent from PinPlay):
    # the studio page opens it on its 🎛️ Set up the recording form first.
    setup = bool(body.get('setup'))
    rec = {'id': rid, 'created': time.time(), 'title': (body.get('script') or {}).get('title') or body.get('title') or 'Untitled',
           'text': body.get('text') or '', 'script': body.get('script'), 'settings': body.get('settings') or {},
           'stage': 'setup' if setup else 'voices'}
    if request.headers.get('origin') in PINPLAY_ORIGINS:
        rec['source'] = 'pinplay'
    _save(rec)
    if not setup and body.get('make', True) and rec['script'] and rec['script'].get('parts'):
        _make(rec, 'voices')  # the teacher approves the voices before the long part
    return {'id': rid}


@app.get('/api/recordings/{rid}')
def get_recording(rid: str):
    rec = _load(rid)
    lines = []
    if rec.get('script') and rec['script'].get('parts'):
        project = _project(rec)
        for t in project.tasks():
            if t['real']:  # a conversation line with its own audio
                kind = 'original' if t['src'] == 'original' else 'takes'
                lines.append({**t, 'real': None, 'key': None, 'ready': True, 'audio': [kind, os.path.basename(t['real'])]})
                continue
            key = project.line_key(t)
            check = project.verdict(t, key) or {}
            lines.append({**t, 'key': key, 'ready': os.path.exists(project.line_file(key)),
                          'ok': check.get('ok'), 'level': check.get('level'), 'diffs': check.get('diffs', []),
                          'heard': check.get('heard', '')})
        voices = {}
        for name in project.speakers():
            voices[name] = {'description': project.description(name), 'mode': project.mode(name),
                            'sample': os.path.exists(project.sample_file(name)),
                            'sampleKey': project.sample_key(name), 'own': project.own(name),
                            'convo': os.path.basename(project.sample_file(name)) if project.convo_voice(name) else '',
                            'convoCh': next((ch for ch in ('1', '2') if rec.get('conversation')
                                             and conversation.speaker_name(rec['conversation'], ch) == name), ''),
                            'effect': (rec['script']['voices'].get(name) or {}).get('effect', '')}
    else:
        voices = {}
    report_path = os.path.join(_folder(rid), 'voices.json')
    try:
        report = json.load(open(report_path, encoding='utf-8')) if os.path.exists(report_path) else {}
    except ValueError:
        report = {}
    rec.setdefault('stage', 'approved' if _result(rid) else 'voices')
    return {'recording': rec, 'lines': lines, 'voices': voices, 'voiceReport': report, 'result': _result(rid)}


@app.put('/api/recordings/{rid}')
async def update_recording(rid: str, request: Request):
    body = await request.json()
    rec = _load(rid)
    for key in ('text', 'script', 'settings'):
        if key in body:
            rec[key] = body[key]
    if 'title' in body:
        rec['title'] = str(body['title'] or '').strip()[:120] or 'Untitled'
    elif 'script' in body and (body['script'] or {}).get('title') and rec.get('title') in (None, '', 'Untitled'):
        rec['title'] = body['script']['title']
    _save(rec)
    how = body.get('make')
    _make(rec, 'all' if how is True else how)
    return {'ok': True}


@app.post('/api/recordings/{rid}/make')
async def make_recording(rid: str, request: Request):
    body = await request.json() if int(request.headers.get('content-length') or 0) else {}
    _make(_load(rid), body.get('kind') or 'all')
    return {'ok': True}


@app.post('/api/stop')
def stop_job():
    """Stops the current work at once (its process ends; every line already
    made is kept) and empties the queue."""
    with LOCK:
        STATE['stop'] = bool(STATE['job'])
        if STATE['proc'] is not None and STATE['proc'].poll() is None:
            STATE['proc'].terminate()
        STATE['queue'].clear()
        while not JOBS.empty():
            try:
                JOBS.get_nowait()
            except queue.Empty:
                break
    return {'ok': True}


@app.delete('/api/recordings/{rid}')
def delete_recording(rid: str):
    import shutil
    folder = _folder(rid)
    with LOCK:
        if STATE['job'] and STATE['job']['id'] == rid:
            raise HTTPException(409, 'This recording is being made. Wait until it has finished.')
    shutil.rmtree(folder)
    return {'ok': True}


@app.get('/api/recordings/{rid}/audio/{kind}/{name}')
def audio_file(rid: str, kind: str, name: str):
    folder = _folder(rid)
    if kind not in ('lines', 'voices', 'out', 'original', 'takes') or not re.fullmatch(r'[\w.-]+\.(wav|mp3)', name):
        raise HTTPException(404, 'Not found.')
    path = os.path.join(folder, kind, name)
    if not os.path.exists(path):
        raise HTTPException(404, 'Not made yet.')
    return FileResponse(path, media_type='audio/mpeg' if name.endswith('.mp3') else 'audio/wav',
                        headers={'Cache-Control': 'no-store'})


# ---------------------------------------------------------------- 📱 conversations (engine/conversation.py, engine/phone.py)
IMPORTS = os.path.join(CONFIG['data'], 'imports')
# Where "Phone Mirror.bat" (Phone-Mirror repo) keeps the phone's Wi-Fi address.
PHONE_ADDRESS = CONFIG.get('phoneAddressFile') or r'D:\Admin\Phone-Mirror\phone_ip.txt'


def _conversation_title(name):
    m = re.search(r'(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)', name or '')
    return f'Conversation {m[3]}/{m[2]} {m[4]}:{m[5]}' if m else 'Conversation'


@app.get('/api/phone')
async def phone_conversations():
    """The conversations on the phone, or why the phone can't be reached."""
    import asyncio
    try:
        serial = await asyncio.to_thread(phone.connect, PHONE_ADDRESS)
        return {'ok': True, 'device': serial, 'conversations': await asyncio.to_thread(phone.conversations, serial)}
    except phone.PhoneError as err:
        return {'ok': False, 'error': str(err)}
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': 'The phone did not answer. Check it is on and on the same Wi-Fi, then try again.'}


@app.post('/api/conversations/upload')
async def conversation_upload(request: Request):
    """One file of a conversation shared from the phone (?kind=wav or json),
    written to disk as it arrives. Returns the upload id for the import."""
    kind = request.query_params.get('kind')
    token = request.query_params.get('upload') or uuid.uuid4().hex[:12]
    if kind not in ('wav', 'json') or not re.fullmatch(r'[a-z0-9]{12}', token):
        raise HTTPException(400, 'Unknown file.')
    folder = os.path.join(IMPORTS, token)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f'conversation.{kind}')
    size = 0
    with open(path + '.part', 'wb') as fh:
        async for chunk in request.stream():
            size += len(chunk)
            if size > 2 * 1024 ** 3:
                raise HTTPException(400, 'This recording is too big (more than 2 GB).')
            fh.write(chunk)
    os.replace(path + '.part', path)
    return {'upload': token}


@app.post('/api/conversations')
async def conversation_import(request: Request):
    """A new recording from a conversation: { phone: name } copies it from
    the phone, { upload: id } uses the shared files sent before."""
    import asyncio
    import shutil
    body = await request.json()
    name = str(body.get('phone') or body.get('name') or '')
    if body.get('phone'):
        token = uuid.uuid4().hex[:12]
        try:
            wav, segs_file = await asyncio.to_thread(
                lambda: phone.pull(phone.connect(PHONE_ADDRESS), body['phone'], os.path.join(IMPORTS, token)))
        except phone.PhoneError as err:
            shutil.rmtree(os.path.join(IMPORTS, token), ignore_errors=True)
            raise HTTPException(400, str(err))
    else:
        token = str(body.get('upload') or '')
        if not re.fullmatch(r'[a-z0-9]{12}', token):
            raise HTTPException(400, 'Add the conversation\'s files first.')
        wav, segs_file = (os.path.join(IMPORTS, token, f'conversation.{ext}') for ext in ('wav', 'json'))
        if not (os.path.exists(wav) and os.path.exists(segs_file)):
            shutil.rmtree(os.path.join(IMPORTS, token), ignore_errors=True)
            raise HTTPException(400, 'Both files are needed: the recording (.wav) and its transcript (.json).')
    rid = uuid.uuid4().hex[:12]
    folder = os.path.join(RECORDINGS, rid)
    os.makedirs(folder)
    try:
        conv = await asyncio.to_thread(lambda: conversation.build(folder, wav, conversation.read_segments(segs_file)))
    except Exception as err:
        shutil.rmtree(folder, ignore_errors=True)
        if isinstance(err, (ValueError, RuntimeError)):  # soundfile: RuntimeError for a file it can't read
            raise HTTPException(400, str(err))
        raise
    finally:
        shutil.rmtree(os.path.join(IMPORTS, token), ignore_errors=True)
    title = str(body.get('title') or '').strip()[:120] or _conversation_title(name)
    script = conversation.script_of(conv, title)
    _save({'id': rid, 'created': time.time(), 'title': title, 'text': conversation.text_of(script), 'script': script,
           'settings': {}, 'stage': 'approved', 'conversation': conv, 'from': name})
    return {'id': rid}


@app.put('/api/recordings/{rid}/conversation')
async def conversation_update(rid: str, request: Request):
    """The teacher's reviewed lines (and speaker names); make: true makes
    the recording again (only changed lines need the voice model)."""
    body = await request.json()
    rec = _load(rid)
    if not rec.get('conversation'):
        raise HTTPException(400, 'This recording is not a conversation.')
    rec['conversation'] = conversation.clean(rec['conversation'], body.get('lines'), body.get('speakers'))
    rec['script'] = conversation.script_of(rec['conversation'], rec.get('title') or 'Conversation')
    rec['text'] = conversation.text_of(rec['script'])
    _save(rec)
    _make(rec, 'all' if body.get('make') else None)
    return {'ok': True}


@app.post('/api/recordings/{rid}/takes/{lid}')
async def conversation_take(rid: str, lid: str, request: Request):
    """The teacher's own recording of one line (the browser's recording is
    the request body); the line then uses it."""
    import asyncio
    rec = _load(rid)
    line = next((x for x in (rec.get('conversation') or {}).get('lines', []) if x['id'] == lid), None)
    if not line:
        raise HTTPException(404, 'This line is no longer in the conversation.')
    data = await request.body()
    if not data or len(data) > 50 * 1024 * 1024:
        raise HTTPException(400, 'No recording, or a recording that is far too long.')
    ext = re.sub(r'[^a-z0-9]', '', (request.query_params.get('ext') or 'webm').lower())[:5] or 'webm'
    upload = os.path.join(_folder(rid), f'take-upload-{uuid.uuid4().hex[:8]}.{ext}')
    with open(upload, 'wb') as fh:
        fh.write(data)
    try:
        await asyncio.to_thread(conversation.save_take, _folder(rid), line, upload)
    except ValueError as err:
        raise HTTPException(400, str(err))
    finally:
        os.remove(upload)
    line['mode'] = 'record'
    _save(rec)
    return {'ok': True}


# ---------------------------------------------------------------- the voice library
@app.get('/api/library')
def library_list():
    return {'voices': library.all_voices(LIBRARY)}


@app.post('/api/library')
async def library_add(request: Request):
    """An outside sample (the file itself is the request body): trimmed,
    its words written down by Whisper, in a process of its own (Whisper
    isn't kept in the studio's memory). About a minute."""
    data = await request.body()
    if not data:
        raise HTTPException(400, 'No file.')
    if len(data) > 40 * 1024 * 1024:
        raise HTTPException(400, 'This file is too big: use a short clip (5–15 seconds).')
    ext = re.sub(r'[^a-z0-9]', '', (request.query_params.get('ext') or 'audio').lower())[:5] or 'audio'
    language = request.query_params.get('language') or 'English'
    name = (request.query_params.get('name') or 'My voice').strip()[:80]
    upload = os.path.join(LIBRARY, f'upload-{uuid.uuid4().hex[:8]}.{ext}')
    with open(upload, 'wb') as fh:
        fh.write(data)
    try:
        return {'voice': await _add_sample_file(upload, language, name)}
    finally:
        try:
            os.remove(upload)
        except OSError:
            pass


async def _add_sample_file(path, language, name):
    """engine/library.py add, in a process of its own: the new voice."""
    import asyncio
    proc = await asyncio.to_thread(
        subprocess.run, [sys.executable, '-u', '-m', 'engine.library', 'add', LIBRARY, path, language, name],
        cwd=HERE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600,
        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    found = [ln for ln in (proc.stdout or '').splitlines() if ln.startswith('@@')]
    if not found:
        print(proc.stdout, proc.stderr, flush=True)
        raise HTTPException(500, _job_error(proc.returncode, (proc.stderr or proc.stdout or '').splitlines()[-40:]))
    result = json.loads(found[-1][2:])
    if result.get('error'):
        raise HTTPException(400, result['error'])
    return result


# ---------------------------------------------------------------- 🌍 find a voice (engine/catalog.py)
CATALOG_CACHE = os.path.join(CONFIG['data'], 'catalog-cache')


@app.get('/api/catalog')
def catalog_list():
    if not os.path.exists(catalog.CATALOG):
        raise HTTPException(404, 'The voice catalog is missing from this copy of the studio.')
    return FileResponse(catalog.CATALOG, media_type='application/json')


async def _catalog_sample(key):
    import asyncio
    if not catalog.voice(key):
        raise HTTPException(404, 'This voice is not in the catalog.')
    try:
        return await asyncio.to_thread(catalog.sample, key, CATALOG_CACHE)
    except catalog.Busy as err:
        raise HTTPException(503, str(err))


@app.get('/api/catalog/{key}/audio')
async def catalog_audio(key: str):
    """The voice's sample, to listen to before adding it (fetched once)."""
    return FileResponse(await _catalog_sample(key), media_type='audio/wav')


@app.post('/api/catalog/{key}/add')
async def catalog_add(key: str, request: Request):
    """A catalog voice into the library, with its credit."""
    body = await request.json()
    v = catalog.voice(key)
    path = await _catalog_sample(key)
    src = catalog.load()['sources'][v['source']]
    name = (body.get('name') or key).strip()[:80]
    extra = {'origin': src['name'], 'credit': src['credit'], 'license': src['license'], 'catalogKey': key}
    if v.get('text'):  # whole sentences: the words are known
        voice = library.add_known(LIBRARY, path, name, v['text'], **extra)
    else:  # a long reading: cut to 15 s, words written down by Whisper
        voice = await _add_sample_file(path, 'English', name)
        voice = library.set_extra(LIBRARY, voice['id'], **extra)
    return {'voice': voice}


@app.post('/api/library/from-recording')
async def library_from_recording(request: Request):
    """A character's designed voice, kept in the library for other recordings."""
    body = await request.json()
    rec = _load(body.get('id') or '')
    project = _project(rec)
    character = body.get('character') or ''
    if character not in project.speakers() or not os.path.exists(project.sample_file(character)):
        raise HTTPException(400, 'Make this voice first.')
    voice = library.save_designed(LIBRARY, project.sample_file(character), project.sample_text(character),
                                  body.get('name') or character)
    return {'voice': voice}


@app.put('/api/library/{vid}')
async def library_update(vid: str, request: Request):
    body = await request.json()
    voice = library.update(LIBRARY, vid, body.get('name'), body.get('text'))
    if not voice:
        raise HTTPException(404, 'This voice is no longer in the library.')
    return {'voice': voice}


@app.delete('/api/library/{vid}')
def library_delete(vid: str):
    library.delete(LIBRARY, vid)
    return {'ok': True}


@app.get('/api/library/{vid}/audio')
def library_audio(vid: str):
    if not library.get(LIBRARY, vid):
        raise HTTPException(404, 'Not found.')
    return FileResponse(library.wav_path(LIBRARY, vid), media_type='audio/wav', headers={'Cache-Control': 'no-store'})


@app.post('/api/quit')
def quit_studio():
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {'ok': True}


# ---------------------------------------------------------------- the page
UI = os.path.join(HERE, 'ui')
PAGE_FILES = {'': os.path.join(UI, 'index.html'), 'studio.js': os.path.join(UI, 'studio.js'),
              'studio.css': os.path.join(UI, 'studio.css'), 'listening-script.js': os.path.join(REPO, 'listening-script.js')}


@app.get('/{name:path}')
def page(name: str):
    path = PAGE_FILES.get(name)
    if not path:
        raise HTTPException(404, 'Not found.')
    return FileResponse(path, headers={'Cache-Control': 'no-store'})


if __name__ == '__main__':
    print(f'PinPlay Listening Studio on http://127.0.0.1:{PORT}  (data: {CONFIG["data"]})', flush=True)
    uvicorn.run(app, host='127.0.0.1', port=PORT, log_level='warning')
