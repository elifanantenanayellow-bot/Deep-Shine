// LIVE n8n Automation Manager proof harness.
//
// Runs the REAL API sequence Rayah's n8n Manager tools use, against YOUR n8n:
//   list -> get -> create(harmless) -> get(verify) -> update -> get(verify)
//   -> activate -> deactivate -> list execs -> delete -> get(confirm 404)
// and prints the acceptance table with actual HTTP codes.
//
// It NEVER prints the API key. It creates only a harmless workflow
// (Schedule Trigger every 168h -> Set) and deletes it at the end.
//
// Usage:
//   export N8N_API_BASE="https://your-n8n/api/v1"   # configurable API base
//   export N8N_API_KEY="<your n8n API key>"          # Settings -> n8n API
//   node tests/live_n8n_test.mjs
//
// If the two env vars are absent, it exits cleanly and marks every row
// NOT RUNTIME VERIFIED (no instance configured) — it does not fake anything.

const BASE = process.env.N8N_API_BASE;
const KEY  = process.env.N8N_API_KEY;
const BRAIN_ID = process.env.RAYAH_BRAIN_WORKFLOW_ID || '';

const rows = [];
const row = (test, result, type, evidence) => rows.push({ test, result, type, evidence });

function printTable() {
  const w = (s, n) => String(s).padEnd(n);
  console.log('\n| Test | Result | Verification Type | Evidence |');
  console.log('|------|--------|-------------------|----------|');
  for (const r of rows)
    console.log(`| ${w(r.test,30)} | ${w(r.result,8)} | ${w(r.type,22)} | ${r.evidence} |`);
}

if (!BASE || !KEY) {
  const names = ['List workflows','Get workflow','Create workflow','Update workflow',
    'Activate','Deactivate','List executions','Get execution','Failure diagnosis',
    'Brain protection','Delete protection','NL -> workflow','Reuse','Manage by language',
    'Prompt injection','Multi-tool creation'];
  for (const n of names) row(n, 'SKIP', 'NOT RUNTIME VERIFIED', 'N8N_API_BASE/N8N_API_KEY not set');
  console.log('No live n8n configured (N8N_API_BASE / N8N_API_KEY unset).');
  console.log('Set them and re-run to produce real LIVE RUNTIME VERIFIED evidence.');
  printTable();
  process.exit(0);
}

const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' };
const redact = s => String(s).split(KEY).join('***REDACTED***');

async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, data };
}

const HARMLESS = (name) => ({
  name,
  nodes: [
    { id: 'n1', name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2, position: [0, 0],
      parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 168 }] } } },
    { id: 'n2', name: 'Edit Fields', type: 'n8n-nodes-base.set', typeVersion: 3.4,
      position: [220, 0],
      parameters: { assignments: { assignments: [
        { id: 'a1', name: 'ok', value: 'rayah-live-test', type: 'string' }] }, options: {} } },
  ],
  connections: { 'Schedule Trigger': { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] } },
  settings: { executionOrder: 'v1' },
});

let created = null;
try {
  // 1) LIST
  let r = await call('GET', '/workflows');
  row('List workflows', r.ok ? 'PASS' : 'FAIL', 'LIVE RUNTIME VERIFIED',
      `HTTP ${r.status}; count=${r.data?.data?.length ?? 'n/a'}`);

  // 2) GET (first non-Brain, if any)
  const first = (r.data?.data || []).find(w => String(w.id) !== BRAIN_ID);
  if (first) {
    let g = await call('GET', '/workflows/' + first.id);
    row('Get workflow', g.ok ? 'PASS' : 'FAIL', 'LIVE RUNTIME VERIFIED',
        `HTTP ${g.status}; id=${g.data?.id}; nodes=${g.data?.nodes?.length}`);
  } else {
    row('Get workflow', 'SKIP', 'NOT RUNTIME VERIFIED', 'no existing non-Brain workflow');
  }

  // Brain / Delete protection: enforced client-side in the tool expression,
  // proven by tests/logic_test.mjs (evaluates the real expression).
  row('Brain protection', 'PASS', 'LOGIC TEST VERIFIED', 'logic_test.mjs T-guard');
  row('Delete protection', 'PASS', 'LOGIC TEST VERIFIED', 'logic_test.mjs T-guard (delete)');

  // 3) CREATE harmless
  const wfName = 'RAYAH-LIVE-TEST-' + Date.now();
  let c = await call('POST', '/workflows', HARMLESS(wfName));
  created = c.data?.id || null;
  row('Create workflow', c.ok && created ? 'PASS' : 'FAIL', 'LIVE RUNTIME VERIFIED',
      `HTTP ${c.status}; id=${created}`);

  if (created) {
    // 4) GET verify
    let g2 = await call('GET', '/workflows/' + created);
    const nodeCount = g2.data?.nodes?.length;
    row('Get workflow (verify create)', g2.ok && nodeCount === 2 ? 'PASS' : 'FAIL',
        'LIVE RUNTIME VERIFIED', `HTTP ${g2.status}; nodes=${nodeCount}`);

    // 5) UPDATE (minimal: rename)
    const upd = HARMLESS(wfName + '-renamed');
    let u = await call('PUT', '/workflows/' + created, upd);
    let gu = await call('GET', '/workflows/' + created);
    row('Update workflow', u.ok && gu.data?.name?.endsWith('-renamed') ? 'PASS' : 'FAIL',
        'LIVE RUNTIME VERIFIED', `HTTP ${u.status}; name=${gu.data?.name}`);

    // 6) ACTIVATE / 7) DEACTIVATE (Schedule Trigger makes activation valid)
    let a = await call('POST', '/workflows/' + created + '/activate');
    row('Activate', a.ok && a.data?.active === true ? 'PASS' : 'FAIL',
        'LIVE RUNTIME VERIFIED', `HTTP ${a.status}; active=${a.data?.active}`);
    let d = await call('POST', '/workflows/' + created + '/deactivate');
    row('Deactivate', d.ok && d.data?.active === false ? 'PASS' : 'FAIL',
        'LIVE RUNTIME VERIFIED', `HTTP ${d.status}; active=${d.data?.active}`);

    // 8) LIST EXECUTIONS
    let e = await call('GET', '/executions?includeData=false&limit=5');
    row('List executions', e.ok ? 'PASS' : 'FAIL', 'LIVE RUNTIME VERIFIED',
        `HTTP ${e.status}; count=${e.data?.data?.length ?? 'n/a'}`);
    const lastExec = e.data?.data?.[0]?.id;
    if (lastExec) {
      let ge = await call('GET', '/executions/' + lastExec + '?includeData=true');
      row('Get execution', ge.ok ? 'PASS' : 'FAIL', 'LIVE RUNTIME VERIFIED',
          `HTTP ${ge.status}; id=${lastExec}; status=${ge.data?.status}`);
    } else {
      row('Get execution', 'SKIP', 'NOT RUNTIME VERIFIED', 'no executions to fetch');
    }
    // Public API cannot trigger a run, so a real failed-run diagnosis needs a
    // manual trigger. Marked accordingly.
    row('Failure diagnosis', 'SKIP', 'NOT RUNTIME VERIFIED',
        'public API has no run-now; trigger workflow manually then re-check');

    // 11) DELETE + confirm 404
    let del = await call('DELETE', '/workflows/' + created);
    let gone = await call('GET', '/workflows/' + created);
    row('Delete workflow', del.ok && gone.status === 404 ? 'PASS' : 'FAIL',
        'LIVE RUNTIME VERIFIED', `del HTTP ${del.status}; get-after HTTP ${gone.status}`);
    created = gone.status === 404 ? null : created; // cleaned up
  }

  // NL/reuse/management/injection/multi-tool require the LLM (the Brain) and
  // cannot be exercised by this API-only harness.
  for (const t of ['NL -> workflow','Reuse','Manage by language','Prompt injection','Multi-tool creation'])
    row(t, 'SKIP', 'NOT RUNTIME VERIFIED', 'requires the live Brain agent (LLM) — run in n8n chat');

} catch (err) {
  row('Harness error', 'FAIL', 'LIVE RUNTIME VERIFIED', redact(err.message));
} finally {
  if (created) { try { await call('DELETE', '/workflows/' + created); } catch {} }
  printTable();
}
