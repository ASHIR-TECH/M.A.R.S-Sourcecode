/**
 * Mock ADTP desktop agent REST API for local development (PHASE_14 §Chat).
 *
 * Stands in for the desktop peer's Phase 4 + Phase 10 endpoints so the mobile
 * agent chat can be developed and demoed without the Rust desktop running.
 * Auth: any non-empty Bearer token is accepted; missing/empty => 401.
 *
 * Run:  node dev/mockAgentServer.js
 * Then in the app Settings > Desktop Agent use: http://<host>:4000  + any token.
 */
const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.MOCK_AGENT_PORT || 40003);
const RESPONSE_DELAY_MS = Number(process.env.MOCK_AGENT_DELAY_MS || 2000);

const app = express();
app.use(cors());
app.use(express.json());

const jobs = new Map();
let counter = 0;

app.use((req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ detail: 'Missing bearer token' });
  next();
});

app.get('/api/v1/health/ready', (req, res) => {
  res.json({ ready: true });
});

app.get('/api/v1/agent/status', (req, res) => {
  res.json({ active: true, status: 'active', provider: 'ollama', model: 'llama3' });
});

app.post('/api/v1/agent/message', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message : '';
  counter += 1;
  const id = `job-${counter}`;
  const job = { id, message, createdAt: Date.now(), status: 'running', done: false };
  jobs.set(id, job);
  setTimeout(() => {
    job.done = true;
  }, RESPONSE_DELAY_MS);
  res.status(201).json({ id, status: 'running' });
});

app.get('/api/v1/agent/messages/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ detail: 'Unknown message id' });

  if (!job.done) {
    return res.json({
      id: job.id,
      status: 'running',
      tool_calls: [
        {
          id: `${job.id}-tc1`,
          name: /send|file|transfer/i.test(job.message) ? 'send_file' : 'list_peers',
          status: 'running',
          params: /send|file|transfer/i.test(job.message) ? { file_path: '/home/operator/report.pdf', peer_id: 'MARS-DEVICE' } : {},
        },
      ],
    });
  }

  if (/fail|error/i.test(job.message)) {
    return res.json({ id: job.id, status: 'failed', message: 'The agent could not complete that task.' });
  }

  const isSend = /send|file|transfer/i.test(job.message);
  const tool_calls = isSend
    ? [
        {
          id: `${job.id}-tc1`,
          name: 'send_file',
          status: 'completed',
          params: { file_path: '/home/operator/report.pdf', peer_id: 'MARS-DEVICE' },
          result: 'Delivered report.pdf (2.4 MB) to MARS-DEVICE',
        },
      ]
    : [
        {
          id: `${job.id}-tc1`,
          name: 'list_peers',
          status: 'completed',
          result: '2 peers online: MARS-DEVICE, WORK-LAPTOP',
        },
      ];

  return res.json({
    id: job.id,
    status: 'completed',
    provider: 'Ollama',
    message: isSend
      ? 'Sent report.pdf to your MARS device.'
      : 'You have 2 peers online: MARS-DEVICE and WORK-LAPTOP.',
    tool_calls,
  });
});

app.listen(PORT, () => {
  console.log(`Mock agent REST API running on http://localhost:${PORT}`);
  console.log(`Agent chat responds after ~${RESPONSE_DELAY_MS}ms`);
});
