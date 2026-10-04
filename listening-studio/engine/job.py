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

    Project(folder, script, rec.get('settings') or {}, say).run(kind)


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    main()
