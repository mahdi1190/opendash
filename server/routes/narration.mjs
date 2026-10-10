import { narrationFor } from '../../lib/narration.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const voice = app.ctx.narration || narrationFor(app.ctx.dataDir, { getConfig: app.ctx.getConfig, setConfig: app.ctx.setConfig });
  // Unknown filesystem/network errors are reduced to a fixed message. The
  // router logs only this code, never an API key or a user's narration text.
  const safe = e => new HttpError(e.code === 'BAD_REQUEST' || /^(?:ELEVENLABS_|NARRATION_)/.test(e.code || '') ? e.status || 500 : 500,
    e.code === 'BAD_REQUEST' || /^(?:ELEVENLABS_|NARRATION_)/.test(e.code || '') ? e.message : 'Voice narration could not complete the request.',
    { code: e.code === 'BAD_REQUEST' || /^(?:ELEVENLABS_|NARRATION_)/.test(e.code || '') ? e.code : 'NARRATION_ERROR' });
  const run = async fn => { try { return await fn(); } catch (e) { throw safe(e); } };
  app.route({ path: '/api/narration/status', method: 'GET', handler: () => run(() => voice.status()) });
  app.route({ path: '/api/narration/settings', method: 'POST', maxBody: 8192, handler: async c => { const body = await c.body(); return run(() => voice.configure(body)); } });
  app.route({ path: '/api/narration/voices', method: 'GET', sameOrigin: true, handler: () => run(() => voice.voices()) });
  app.route({ path: '/api/narration/speech', method: 'POST', maxBody: 24 * 1024, handler: async c => { const body = await c.body(); return run(() => voice.speech(body)); } });
  app.route({ path: '/api/narration/audio', method: 'GET', sameOrigin: true, quiet: true, handler: async c => run(async () => {
    const bytes = await voice.audio(c.query.get('id'));
    return c.send(200, bytes, 'audio/mpeg', { 'Cache-Control': 'private, no-store', 'Content-Length': bytes.length, 'Content-Disposition': 'inline' });
  }) });
}
