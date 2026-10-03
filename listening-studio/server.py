"""PinPlay Listening Studio: the local server behind the studio page
(LISTENING_STUDIO_PLAN.md section 6). Started by "PinPlay Listening
Studio.bat"; listens on 127.0.0.1 only and refuses requests from other
websites. Recordings live in the data folder; one job runs at a time."""
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

PORT = 8790
CONFIG = {
    'data': r'D:\Admin\pinplay listening tts audio production\studio-data',
    'hf_home': r'D:\Admin\pinplay listening tts audio production\qwen3\hf',
}
_config_path = os.path.join(HERE, 'config.json')
if os.path.exists(_config_path):
    CONFIG.update(json.load(open(_config_path, encoding='utf-8')))
CONFIG['data'] = os.environ.get('PINPLAY_STUDIO_DATA') or CONFIG['data']  # tests use their own folder
os.environ.setdefault('HF_HOME', CONFIG['hf_home'])
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
RECORDINGS = os.path.join(CONFIG['data'], 'recordings')
os.makedirs(RECORDINGS, exist_ok=True)

import uvicorn  # noqa: E402
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, Response  # noqa: E402

from engine.project import Project  # noqa: E402

app = FastAPI()
ALLOWED_ORIGINS = {f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'}


@app.middleware('http')
async def only_this_page(request: Request, call_next):
    # Browsers send Origin on requests from other pages: only the studio
    # page itself may use this server.
    origin = request.headers.get('origin')
    if origin and origin not in ALLOWED_ORIGINS:
        return JSONResponse({'error': 'Not allowed.'}, status_code=403)
    return await call_next(request)


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
STATE = {'job': None, 'queue': [], 'last': None}
LOCK = threading.Lock()


def _worker():
    while True:
        rid = JOBS.get()
        with LOCK:
            if rid in STATE['queue']:
                STATE['queue'].remove(rid)
            STATE['job'] = {'id': rid, 'stage': 'start', 'done': 0, 'total': 0, 'text': '', 'started': time.time(), 'stages': {}}

        def progress(event):
            with LOCK:
                job = STATE['job']
                job.update({k: event.get(k, job.get(k)) for k in ('stage', 'done', 'total', 'text')})
                job['stages'].setdefault(event['stage'], time.time())
                job['at'] = time.time()

        try:
            rec = _load(rid)
            Project(_folder(rid), rec['script'], rec.get('settings') or {}, progress).run()
            outcome = {'id': rid, 'ok': True, 'finished': time.time()}
        except Exception as err:  # shown in the page, in plain words
            traceback.print_exc()
            outcome = {'id': rid, 'ok': False, 'error': str(err) or err.__class__.__name__, 'finished': time.time()}
        with LOCK:
            STATE['job'] = None
            STATE['last'] = outcome


threading.Thread(target=_worker, daemon=True).start()


def _queue_job(rid):
    with LOCK:
        busy = STATE['job'] and STATE['job']['id'] == rid
        if rid not in STATE['queue'] and not busy:
            STATE['queue'].append(rid)
            JOBS.put(rid)


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
                    'parts': len((result or {}).get('parts') or [])})
    return {'recordings': sorted(out, key=lambda r: -(r['updated'] or 0))}


@app.post('/api/recordings')
async def create_recording(request: Request):
    body = await request.json()
    rid = uuid.uuid4().hex[:12]
    os.makedirs(os.path.join(RECORDINGS, rid))
    rec = {'id': rid, 'created': time.time(), 'title': (body.get('script') or {}).get('title') or body.get('title') or 'Untitled',
           'text': body.get('text') or '', 'script': body.get('script'), 'settings': body.get('settings') or {}}
    _save(rec)
    if body.get('make', True) and rec['script'] and rec['script'].get('parts'):
        _queue_job(rid)
    return {'id': rid}


@app.get('/api/recordings/{rid}')
def get_recording(rid: str):
    rec = _load(rid)
    lines = []
    if rec.get('script') and rec['script'].get('parts'):
        project = Project(_folder(rid), rec['script'], rec.get('settings') or {})
        for t in project.tasks():
            key = project.line_key(t)
            check = project.checks.get(key) or {}
            lines.append({**t, 'key': key, 'ready': os.path.exists(project.line_file(key)),
                          'ok': check.get('ok'), 'diffs': check.get('diffs', []), 'heard': check.get('heard', '')})
        voices = {}
        for name in project.speakers():
            voices[name] = {'description': project.description(name), 'mode': project.mode(name),
                            'sample': os.path.exists(project.sample_file(name)),
                            'sampleKey': project.sample_key(name),
                            'effect': (rec['script']['voices'].get(name) or {}).get('effect', '')}
    else:
        voices = {}
    return {'recording': rec, 'lines': lines, 'voices': voices, 'result': _result(rid)}


@app.put('/api/recordings/{rid}')
async def update_recording(rid: str, request: Request):
    body = await request.json()
    rec = _load(rid)
    for key in ('text', 'script', 'settings', 'title'):
        if key in body:
            rec[key] = body[key]
    if 'script' in body and (body['script'] or {}).get('title'):
        rec['title'] = body['script']['title']
    _save(rec)
    if body.get('make'):
        _queue_job(rid)
    return {'ok': True}


@app.post('/api/recordings/{rid}/make')
def make_recording(rid: str):
    _load(rid)
    _queue_job(rid)
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
    if kind not in ('lines', 'voices', 'out') or not re.fullmatch(r'[\w.-]+\.(wav|mp3)', name):
        raise HTTPException(404, 'Not found.')
    path = os.path.join(folder, kind, name)
    if not os.path.exists(path):
        raise HTTPException(404, 'Not made yet.')
    return FileResponse(path, media_type='audio/mpeg' if name.endswith('.mp3') else 'audio/wav',
                        headers={'Cache-Control': 'no-store'})


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
