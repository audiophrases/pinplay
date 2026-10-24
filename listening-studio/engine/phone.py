"""The phone's Convo Recorder conversations, over adb (the same Wi-Fi link
"Phone Mirror.bat" sets up in the Phone-Mirror repo): list them and copy
one here. Nothing to install on the phone; nothing to type on the PC."""
import os
import re
import shutil
import subprocess

APP_DIR = '/sdcard/Android/data/com.classaudio.recorder/files/conversations'
NAME = re.compile(r'convo_[\w-]+')
WAV_HEADER, BYTES_PER_SECOND = 44, 48000 * 4  # Convo Recorder: 48 kHz, 16-bit stereo
NOT_FOUND = ('The phone was not found. Start "Phone Mirror" once (it connects the phone over Wi-Fi), '
             'or plug it in with USB debugging on. You can also drop the files from the phone\'s Share button here.')


class PhoneError(Exception):
    """Shown to the teacher as it is."""


def _adb():
    found = shutil.which('adb')
    if found:
        return found
    for path in (os.path.expandvars(r'%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe'), r'C:\adb\adb.exe'):
        if os.path.exists(path):
            return path
    raise PhoneError('adb (Android platform tools) is not installed on this computer, so the phone can\'t be reached. '
                     'Use the phone\'s Share button and drop the files here instead.')


def _run(args, timeout=20, binary=False):
    proc = subprocess.run([_adb(), *args], capture_output=True, timeout=timeout, text=not binary,
                          creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    return proc.returncode, proc.stdout, proc.stderr


def _devices():
    _code, out, _err = _run(['devices'])
    return [ln.split('\t')[0] for ln in out.splitlines()[1:] if ln.strip().endswith('\tdevice')]


def connect(address_file=None):
    """A connected phone's serial. With none, tries the address Phone Mirror
    saved (phone_ip.txt): the phone stays in Wi-Fi mode until it restarts."""
    devices = _devices()
    if not devices and address_file and os.path.exists(address_file):
        with open(address_file, encoding='utf-8', errors='replace') as fh:
            address = fh.read().strip()
        if re.fullmatch(r'[\w.:-]+', address or ''):
            try:
                _run(['connect', address], timeout=10)
            except subprocess.TimeoutExpired:
                pass
            devices = _devices()
    if not devices:
        raise PhoneError(NOT_FOUND)
    return devices[0]


def _shell(serial, command, timeout=20):
    """Runs a command on the phone; as root when the shell may not read the
    app's folder (some Android versions)."""
    first = _run(['-s', serial, 'shell', command], timeout=timeout)
    if 'Permission denied' in first[1] + first[2]:
        rooted = _run(['-s', serial, 'shell', f"su -c '{command}'"], timeout=timeout)
        if rooted[0] == 0:
            return rooted
    return first


def conversations(serial):
    """[{name, seconds, transcript}], newest first."""
    code, out, err = _shell(serial, f'cd {APP_DIR} && (stat -c "%s %n" *.wav *.json 2>/dev/null; true)')
    if code != 0:
        if 'No such file' in out + err:
            raise PhoneError('Convo Recorder has no recordings on this phone yet (or it is not installed).')
        raise PhoneError(f'The phone\'s recordings could not be listed ({(err or out).strip()[:200]}).')
    sizes, transcripts = {}, set()
    for line in out.splitlines():
        size, _, name = line.strip().partition(' ')
        if name.endswith('.wav') and size.isdigit() and NAME.fullmatch(name[:-4]):
            sizes[name[:-4]] = int(size)
        elif name.endswith('.json'):
            transcripts.add(name[:-5])
    return [{'name': n, 'seconds': max(0, sizes[n] - WAV_HEADER) // BYTES_PER_SECOND, 'transcript': n in transcripts}
            for n in sorted(sizes, reverse=True)]


def pull(serial, name, folder):
    """Copies a conversation's .wav and .json into folder: (wav, json) paths."""
    if not NAME.fullmatch(name or ''):
        raise PhoneError('Unknown conversation.')
    _code, out, _err = _shell(serial, f'cd {APP_DIR} && ls {name}.wav {name}.json 2>/dev/null; true')
    present = set(out.split())
    if f'{name}.wav' not in present:
        raise PhoneError('This conversation is no longer on the phone.')
    if f'{name}.json' not in present:
        raise PhoneError('This conversation has no transcript with timings yet: in Convo Recorder press '
                         '"Redo" on it (the app must be version 2.1 or newer), then try again.')
    os.makedirs(folder, exist_ok=True)
    paths = []
    for ext, magic in (('json', b'{'), ('wav', b'RIFF')):
        local = os.path.join(folder, f'conversation.{ext}')
        code, _out, err = _run(['-s', serial, 'pull', f'{APP_DIR}/{name}.{ext}', local], timeout=900)
        if code != 0 or not os.path.exists(local):
            # adb pull can't read the folder on some phones: read it as root.
            _code, data, _ = _run(['-s', serial, 'exec-out', f"su -c 'cat {APP_DIR}/{name}.{ext}'"], timeout=900, binary=True)
            if not (data or b'').lstrip().startswith(magic):  # exec-out gives no exit code: an error comes as text
                raise PhoneError(f'The conversation could not be copied from the phone ({(err or "").strip()[:200]}).')
            with open(local, 'wb') as fh:
                fh.write(data)
        paths.append(local)
    return paths[1], paths[0]
