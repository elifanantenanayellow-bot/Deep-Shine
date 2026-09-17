// Self-test for tests/live_n8n_test.mjs.
// Starts a MOCK server implementing the documented n8n Public API contract,
// runs the live harness against it, and asserts the client logic works
// (auth header, create/get/update/activate/deactivate/delete lifecycle, 404
// after delete) and that the API key never leaks into output.
//
// This does NOT prove a real n8n works — it proves the HARNESS + request
// shapes are correct against the API contract. Real proof requires pointing
// the harness at a live instance.

import http from 'node:http';
import { spawn } from 'node:child_process';

const KEY = 'test-key-DO-NOT-LEAK';
let seq = 100;
const store = new Map();
store.set('BRAIN', { id: 'BRAIN', name: 'Rayah — Central Brain', active: false, nodes: [], connections: {}, settings: {} });
store.set('w1', { id: 'w1', name: 'Existing WF', active: false,
  nodes: [{ id: 'a', name: 'Manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0,0], parameters: {} }],
  connections: {}, settings: { executionOrder: 'v1' } });

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
  if (req.headers['x-n8n-api-key'] !== KEY) return send(res, 401, { message: 'unauthorized' });
  const [path, qs] = req.url.split('?');
  const parts = path.replace(/^\/api\/v1/, '').split('/').filter(Boolean); // e.g. ['workflows','w1','activate']
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const json = body ? JSON.parse(body) : null;
    // /executions
    if (parts[0] === 'executions') {
      if (parts[1]) return send(res, 200, { id: parts[1], status: 'success', finished: true });
      return send(res, 200, { data: [] });
    }
    // /workflows...
    if (parts[0] === 'workflows') {
      const id = parts[1];
      const action = parts[2];
      if (!id) {
        if (req.method === 'GET') return send(res, 200, { data: [...store.values()].map(w => ({ id: w.id, name: w.name, active: w.active })) });
        if (req.method === 'POST') {
          const nid = 'w' + (++seq);
          const w = { id: nid, name: json.name, active: false, nodes: json.nodes, connections: json.connections, settings: json.settings };
          store.set(nid, w);
          return send(res, 200, w);
        }
      } else if (action === 'activate' || action === 'deactivate') {
        const w = store.get(id); if (!w) return send(res, 404, { message: 'not found' });
        w.active = action === 'activate';
        return send(res, 200, w);
      } else {
        const w = store.get(id);
        if (req.method === 'GET') return w ? send(res, 200, w) : send(res, 404, { message: 'not found' });
        if (req.method === 'PUT') { if (!w) return send(res, 404, {}); Object.assign(w, { name: json.name, nodes: json.nodes, connections: json.connections, settings: json.settings }); return send(res, 200, w); }
        if (req.method === 'DELETE') { if (!w) return send(res, 404, {}); store.delete(id); return send(res, 200, { id }); }
      }
    }
    send(res, 404, { message: 'unknown route' });
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const env = { ...process.env, N8N_API_BASE: `http://127.0.0.1:${port}/api/v1`, N8N_API_KEY: KEY, RAYAH_BRAIN_WORKFLOW_ID: 'BRAIN' };
  const child = spawn(process.execPath, ['tests/live_n8n_test.mjs'], { env });
  let out = '';
  child.stdout.on('data', d => out += d);
  child.stderr.on('data', d => out += d);
  child.on('close', () => {
    server.close();
    console.log(out);
    const need = ['List workflows','Create workflow','Get workflow (verify create)','Update workflow','Activate','Deactivate','Delete workflow'];
    let ok = true;
    for (const n of need) {
      const re = new RegExp('\\| ' + n.replace(/[-()]/g, m => '\\' + m) + '\\s*\\| PASS');
      const found = re.test(out);
      if (!found) { ok = false; console.log('SELFTEST MISSING PASS:', n); }
    }
    const leaked = out.includes(KEY);
    if (leaked) { ok = false; console.log('SELFTEST FAIL: API key leaked into output'); }
    else console.log('SELFTEST: API key never appeared in output — OK');
    console.log(ok ? '\nHARNESS SELF-TEST: PASS' : '\nHARNESS SELF-TEST: FAIL');
    process.exit(ok ? 0 : 1);
  });
});
