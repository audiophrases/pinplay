import { WorkerEntrypoint } from 'cloudflare:workers';
import worker, { QuizRoom, verifyCreatePassword, resolveAuth, verifyGoogleIdToken, verifyStudentToken,
  studentSessionSecret, rosterCall, rosterGetStudent, rosterGetSettings, isEmailAllowed } from './worker.js';
import { classroomHandler } from './classroom-identity.mjs';

const handle = classroomHandler({ verifyCreatePassword, resolveAuth, verifyGoogleIdToken, verifyStudentToken,
  studentSessionSecret, rosterCall, rosterGetStudent, rosterGetSettings, isEmailAllowed });

export class ClassroomIdentity extends WorkerEntrypoint {
  fetch(request) { return handle(request, this.env); }
}
export { QuizRoom };
export default worker;
