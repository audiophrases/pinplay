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
import subprocess  # noqa: E402

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
STATE = {'job': None, 'queue': [], 'last': None, 'stop': False, 'proc': None}
LOCK = threading.Lock()


def _script_for(rec):
    """The parsed script, named with the recording's (editable) title."""
    return {**(rec.get('script') or {}), 'title': rec.get('title') or 'recording'}


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
                    'parts': len((result or {}).get('parts') or [])})
    return {'recordings': sorted(out, key=lambda r: -(r['updated'] or 0))}


@app.post('/api/recordings')
async def create_recording(request: Request):
    body = await request.json()
    rid = uuid.uuid4().hex[:12]
    os.makedirs(os.path.join(RECORDINGS, rid))
    rec = {'id': rid, 'created': time.time(), 'title': (body.get('script') or {}).get('title') or body.get('title') or 'Untitled',
           'text': body.get('text') or '', 'script': body.get('script'), 'settings': body.get('settings') or {},
           'stage': 'voices'}
    _save(rec)
    if body.get('make', True) and rec['script'] and rec['script'].get('parts'):
        _make(rec, 'voices')  # the teacher approves the voices before the long part
    return {'id': rid}


@app.get('/api/recordings/{rid}')
def get_recording(rid: str):
    rec = _load(rid)
    lines = []
    if rec.get('script') and rec['script'].get('parts'):
        project = Project(_folder(rid), _script_for(rec), rec.get('settings') or {})
        for t in project.tasks():
            key = project.line_key(t)
            check = project.verdict(t, key) or {}
            lines.append({**t, 'key': key, 'ready': os.path.exists(project.line_file(key)),
                          'ok': check.get('ok'), 'level': check.get('level'), 'diffs': check.get('diffs', []),
                          'heard': check.get('heard', '')})
        voices = {}
        for name in project.speakers():
            voices[name] = {'description': project.description(name), 'mode': project.mode(name),
                            'sample': os.path.exists(project.sample_file(name)),
                            'sampleKey': project.sample_key(name),
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
