const FOLDER_ID = '1NKH51CDu2rGeOB1VCyTA8NtkvLuf1STZ';
const SHARED_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const body = JSON.parse(raw);

    if (!isAuthorized(body && body.secret)) {
      return jsonOut({ error: 'Unauthorized.' });
    }

    const quiz = body.quiz || {};
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return jsonOut({ error: 'Quiz must include at least one question.' });
    }

    const title = String(quiz.title || 'pinplay-quiz').trim();
    const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'pinplay-quiz';
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `${safeTitle}__${stamp}.json`;

    const payload = JSON.stringify(quiz, null, 2);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(fileName, payload, MimeType.PLAIN_TEXT);

    return jsonOut({
      ok: true,
      file: driveFileInfo(file),
      folder: driveFolderInfo(folder),
    });
  } catch (err) {
    return jsonOut({ error: `Publish failed: ${err.message}` });
  }
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '').trim();
    const secret = String((e && e.parameter && e.parameter.secret) || '').trim();

    if (!isAuthorized(secret)) {
      return jsonOut({ error: 'Unauthorized.' });
    }

    if (action === 'list') {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = [];
      const iter = folder.getFiles();

      while (iter.hasNext()) {
        const f = iter.next();
        const name = String(f.getName() || '');
        if (!name.toLowerCase().endsWith('.json')) continue;

        files.push({
          id: f.getId(),
          name,
          updatedAt: f.getLastUpdated().toISOString(),
          webViewLink: `https://drive.google.com/file/d/${f.getId()}/view`,
        });
      }

      files.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return jsonOut({ ok: true, files, folder: driveFolderInfo(folder) });
    }

    if (action === 'open') {
      const fileId = String((e && e.parameter && e.parameter.fileId) || '').trim();
      if (!fileId) return jsonOut({ error: 'fileId required.' });

      const file = DriveApp.getFileById(fileId);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const content = file.getBlob().getDataAsString('UTF-8');
      const quiz = JSON.parse(content);

      return jsonOut({
        ok: true,
        quiz,
        file: driveFileInfo(file),
        folder: driveFolderInfo(folder),
      });
    }

    if (action === 'delete') {
      const fileId = String((e && e.parameter && e.parameter.fileId) || '').trim();
      if (!fileId) return jsonOut({ error: 'fileId required.' });

      const file = DriveApp.getFileById(fileId);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      if (!isFileInFolder(file, folder)) {
        return jsonOut({ error: 'File is not in configured folder.' });
      }

      const info = driveFileInfo(file);
      file.setTrashed(true);

      return jsonOut({ ok: true, deleted: true, file: info, folder: driveFolderInfo(folder) });
    }

    return jsonOut({ error: 'Unknown action.' });
  } catch (err) {
    return jsonOut({ error: `Drive bridge failed: ${err.message}` });
  }
}

function isAuthorized(secret) {
  return String(secret || '') === String(SHARED_SECRET || '');
}

function isFileInFolder(file, folder) {
  const parents = file.getParents();
  const folderId = folder.getId();
  while (parents.hasNext()) {
    const p = parents.next();
    if (p.getId() === folderId) return true;
  }
  return false;
}

function driveFileInfo(file) {
  return {
    id: file.getId(),
    name: file.getName(),
    webViewLink: `https://drive.google.com/file/d/${file.getId()}/view`,
  };
}

function driveFolderInfo(folder) {
  return {
    id: folder.getId(),
    webViewLink: `https://drive.google.com/drive/folders/${folder.getId()}`,
  };
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
