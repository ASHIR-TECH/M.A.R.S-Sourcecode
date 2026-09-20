/**
 * Smoke-test a live desktop's Phase 14 agent REST endpoint, exactly the way
 * the mobile app talks to it (mobile/src/desktop/agentClient.ts):
 *   1. GET  /api/v1/health/ready            (auth-exempt)
 *   2. POST /api/v1/agent/message           {message} -> {id}
 *   3. GET  /api/v1/agent/messages/{id}     poll until completed/failed
 *
 * Usage:
 *   ADTP_API_URL=http://192.168.1.20:40003 ADTP_API_TOKEN=<token> \
 *     node dev/verifyDesktopConnection.js ["send report.pdf to MARS-DEVICE"]
 */
const url = process.env.ADTP_API_URL || 'http://127.0.0.1:40003';
const token = process.env.ADTP_API_TOKEN || '';
const message = process.argv[2] || 'send report.pdf to the MARS device';

const base = url.trim().replace(/\/+$/, '');
const auth = { Authorization: `Bearer ${token}` };

function p(path, init) {
  return fetch(`${base}${path}`, init).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
    return body;
  });
}

async function main() {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  console.log(`Target: ${base}`);
  const ready = await p('/api/v1/health/ready', { headers });
  console.log('1) health/ready      OK', JSON.stringify(ready));

  if (!token) {
    console.log('\nSkipping agent round-trip: set ADTP_API_TOKEN.');
    return;
  }

  const created = await p('/api/v1/agent/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ message }),
  });
  console.log('2) agent/message      POST OK ->', JSON.stringify(created));

  const id = created.id || created.message_id || created.task_id;
  if (!id) throw new Error('No id returned');
  console.log('3) polling messages/' + id);

  const deadline = Date.now() + 60_000;
  let last = '';
  for (;;) {
    const state = await p(`/api/v1/agent/messages/${id}`, { headers: auth });
    if (state.status !== last) {
      console.log(`   status=${state.status}`);
      last = state.status;
    }
    if (state.status === 'completed' || state.status === 'failed') {
      console.log('\nFINAL:', state.message || state.text || state.response || '(no text)');
      if (Array.isArray(state.tool_calls)) {
        for (const tc of state.tool_calls)
          console.log(`   tool ${tc.name || tc.tool}: ${tc.status}${tc.result ? ` — ${tc.result}` : ''}`);
      }
      process.exit(state.status === 'completed' ? 0 : 1);
    }
    if (Date.now() > deadline) throw new Error('Timed out waiting for the agent');
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});