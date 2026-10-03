"""Make a recording from a script file, for testing the engine (the studio
page will do this for the teacher). The script is read by the same
listening-script.js that PinPlay uses, through Node.
Usage: render_script.py SCRIPT.txt PROJECT_FOLDER [settings.json]"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('HF_HOME', r'D:\Admin\pinplay listening tts audio production\qwen3\hf')
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')

from engine.project import Project  # noqa: E402


def parse(path):
    reader = os.path.join(os.path.dirname(HERE), 'listening-script.js').replace('\\', '/')
    code = (f"const S = require('{reader}'); const fs = require('fs');"
            "process.stdout.write(JSON.stringify(S.parseListeningScript(fs.readFileSync(process.argv[1], 'utf8'))));")
    return json.loads(subprocess.run(['node', '-e', code, path], capture_output=True, text=True, encoding='utf-8', check=True).stdout)


def main():
    script = parse(sys.argv[1])
    settings = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else {}
    for note in script['notes']:
        print('note:', note)
    started = time.time()

    def say(event):
        print(f"[{time.time() - started:6.0f}s] {event['stage']:7s} {event.get('done', 0)}/{event.get('total', 0)} {event.get('text', '')}", flush=True)

    result = Project(sys.argv[2], script, settings, say).run()
    for name, v in result['voices'].items():
        print(f"voice {name}: {v['pitch']} Hz {v['warning']}")
    bad = [line for line in result['lines'] if line['ok'] is False]
    print(f"words: {len(result['lines']) - len(bad)}/{len(result['lines'])} lines match")
    for line in bad:
        print(f"  {line['speaker']}: {line['text']}\n    heard: {line['heard']}\n    {'; '.join(line['diffs'])}")
    for part in result['parts']:
        print(f"saved {part['mp3']} ({part['seconds']}s)")
    print(f"done in {result['seconds'] / 60:.1f} min")


if __name__ == '__main__':
    main()
