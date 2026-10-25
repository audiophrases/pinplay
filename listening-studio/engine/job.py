"""One studio job in its own process, started by server.py for each job.
When the job ends, all its memory (the ~7 GB voice model) goes back to
Windows, and Stop simply ends the process. Lines are saved one by one
(all-or-nothing), so nothing finished is lost.
Usage: python -m engine.job FOLDER KIND   (KIND: voices | all)
Reads FOLDER/recording.json. Progress: lines starting with "@@" + JSON."""
import json
import os
import sys

from .project import Project


def main():
    folder, kind = sys.argv[1], sys.argv[2]
    with open(os.path.join(folder, 'recording.json'), encoding='utf-8') as fh:
        rec = json.load(fh)
    script = {**(rec.get('script') or {}), 'title': rec.get('title') or 'recording'}

    def say(event):
        print('@@' + json.dumps(event, ensure_ascii=False), flush=True)

    Project(folder, script, rec.get('settings') or {}, say, convo=rec.get('conversation')).run(kind)
    if kind == 'all':
        # Which version of the recording this MP3 is: the server compares it
        # with the recording's latest change ("changed since it was made").
        path = os.path.join(folder, 'result.json')
        with open(path, encoding='utf-8') as fh:
            result = json.load(fh)
        result['madeFrom'] = rec.get('changed')
        with open(path + '.part', 'w', encoding='utf-8') as fh:
            json.dump(result, fh, ensure_ascii=False, indent=1)
        os.replace(path + '.part', path)


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    main()
