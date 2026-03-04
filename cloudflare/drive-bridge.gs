const FOLDER_ID = '1NKH51CDu2rGeOB1VCyTA8NtkvLuf1STZ';
const SHARED_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const body = JSON.parse(raw);

    if (!body || body.secret !== SHARED_SECRET) {
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
      file: {
        id: file.getId(),
        name: file.getName(),
        webViewLink: `https://drive.google.com/file/d/${file.getId()}/view`,
      },
      folder: {
        id: folder.getId(),
        webViewLink: `https://drive.google.com/drive/folders/${folder.getId()}`,
      },
    });
  } catch (err) {
    return jsonOut({ error: `Publish failed: ${err.message}` });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
