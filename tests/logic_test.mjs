// Real execution of the deterministic Code-node logic extracted from the
// workflow JSON, to produce genuine PASS/FAIL evidence for the parts that do
// NOT need a live n8n (normalization, dedup, automation due-selection).
import fs from 'node:fs';

const wf = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const codeOf = (obj, nodeName) =>
  obj.nodes.find(n => n.name === nodeName).parameters.jsCode;

// --- tiny n8n shims -------------------------------------------------------
function runCode(jsCode, { json, allItems, staticData }) {
  const $json = json;
  const $input = { all: () => (allItems || []).map(j => ({ json: j })) };
  const store = staticData || {};
  const $getWorkflowStaticData = () => store;
  const $now = { toISO: () => new Date().toISOString() };
  const fn = new Function('$json', '$input', '$getWorkflowStaticData', '$now',
    jsCode + '\n//# sourceURL=codeNode');
  return fn($json, $input, $getWorkflowStaticData, $now);
}

let pass = 0, fail = 0;
const check = (name, cond, detail='') => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const brain  = wf('workflows/rayah-brain.json');
const gmail  = wf('workflows/rayah-gmail.json');
const runner = wf('workflows/rayah-automation-runner.json');

// ========================================================================
// 1) INPUT NORMALIZER — interactive chat becomes a chat envelope
// ========================================================================
const normCode = codeOf(brain, 'Input Normalizer');
let r = runCode(normCode, { json: { chatInput: 'What is on my calendar today?', sessionId: 's1' } });
check('T-norm-chat: interactive chat -> chat envelope',
  r[0].json.envelope.channel === 'chat' && r[0].json.envelope.mode === 'INTERACTIVE'
  && r[0].json.envelope.policy && r[0].json.envelope.policy.auto_level_4 === false,
  `mode=${r[0].json.envelope.mode}, L4auto=${r[0].json.envelope.policy.auto_level_4}`);

// Normalizer passes through an observation envelope + injects policy
r = runCode(normCode, { json: { envelope: { channel:'email', mode:'OBSERVATION', text:'x' } } });
check('T-norm-passthrough: observation envelope preserved + policy injected',
  r[0].json.envelope.channel === 'email' && !!r[0].json.envelope.policy && !!r[0].json.envelope.event_id);

// ========================================================================
// 2) IDEMPOTENCY GATE — duplicate observation dropped, interactive never
// ========================================================================
const dedupCode = codeOf(brain, 'Idempotency Gate');
const staticData = {};
const ev = { envelope: { event_id: 'evt-1', mode: 'OBSERVATION' } };
let r1 = runCode(dedupCode, { json: ev, staticData });
let r2 = runCode(dedupCode, { json: ev, staticData });   // same id again
check('T-dedup: first observation passes', r1.length === 1);
check('T-dedup: duplicate observation dropped', r2.length === 0, `2nd run emitted ${r2.length} items`);
let r3 = runCode(dedupCode, { json: { envelope: { event_id: 'c', mode: 'INTERACTIVE' } }, staticData });
check('T-dedup: interactive is never deduped', r3.length === 1);

// ========================================================================
// 3) GMAIL NORMALIZER — new email -> observation envelope (id from messageId)
// ========================================================================
const gmailNorm = codeOf(gmail, 'Normalize Email');
r = runCode(gmailNorm, { json: { id: 'm123', threadId: 't9', from: 'sarah@x.com', subject: 'Q4', snippet: 'hello' } });
check('T-gmail-norm: email -> OBSERVATION envelope, event_id from messageId',
  r[0].json.envelope.mode === 'OBSERVATION' && r[0].json.envelope.event_id === 'email:m123'
  && r[0].json.envelope.metadata.threadId === 't9');

// ========================================================================
// 4) AUTOMATION RUNNER — due selection, reschedule, idempotent event_id
// ========================================================================
const dueCode = codeOf(runner, 'Select Due Automations');
const past = new Date(Date.now() - 60000).toISOString();
const future = new Date(Date.now() + 3600000).toISOString();
const rows = [
  { automation_id: 'a1', status: 'active',  schedule_type: 'daily',  next_run: past,   destination: 'whatsapp', recipient_email: '261340000000', message: 'morning' },
  { automation_id: 'a2', status: 'active',  schedule_type: 'once',   next_run: past,   destination: 'chat', message: 'one-off' },
  { automation_id: 'a3', status: 'active',  schedule_type: 'daily',  next_run: future, message: 'not due' },
  { automation_id: 'a4', status: 'paused',  schedule_type: 'daily',  next_run: past,   message: 'paused' },
];
const due = runCode(dueCode, { json: {}, allItems: rows });
const ids = due.map(d => d.json.automation_id).sort();
check('T-auto-due: only active + due rows selected (a1,a2)', JSON.stringify(ids) === JSON.stringify(['a1','a2']),
  `selected=${JSON.stringify(ids)}`);
const a1 = due.find(d => d.json.automation_id === 'a1');
const a2 = due.find(d => d.json.automation_id === 'a2');
check('T-auto-recur: daily reschedules next_run forward', Date.parse(a1.json.next_run) > Date.parse(past));
check('T-auto-once: one-off marked completed', a2.json.status === 'completed', `status=${a2.json.status}`);
check('T-auto-route: whatsapp destination routes reply to number',
  a1.json.envelope.reply_to === '261340000000' && a1.json.envelope.mode === 'AUTOMATION');
check('T-auto-idem: event_id ties run to the exact slot',
  a1.json.envelope.event_id === 'auto:a1:' + past);

// Re-run with a1 already rescheduled (next_run now future) -> not due again
const rows2 = [{ ...rows[0], next_run: a1.json.next_run }];
const due2 = runCode(dueCode, { json: {}, allItems: rows2 });
check('T-auto-norepeat: rescheduled row not due again this tick', due2.length === 0);

// ========================================================================
// 5) n8n MANAGER — Brain-protection guard (evaluate the REAL expression)
// ========================================================================
function evalN8nUrl(expr, { workflow_id, env }) {
  // expr looks like: ={{ (() => { ... })() }}
  const body = expr.replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
  // shim $fromAI(name, desc?) -> the provided workflow_id; $env -> env object
  const $fromAI = () => workflow_id;
  const $env = env;
  const fn = new Function('$fromAI', '$env', 'return (' + body + ');');
  return fn($fromAI, $env);
}
const upd = brain.nodes.find(n => n.name === 'n8n — Update Workflow (L3)');
const env = { RAYAH_BRAIN_WORKFLOW_ID: 'BRAIN123', N8N_API_BASE: 'https://n8n.example.com/api/v1' };

let threw = false;
try { evalN8nUrl(upd.parameters.url, { workflow_id: 'BRAIN123', env }); }
catch (e) { threw = /core Brain/.test(e.message); }
check('T-guard: Update refuses to target the core Brain id', threw);

let url = evalN8nUrl(upd.parameters.url, { workflow_id: 'WF456', env });
check('T-guard: Update allows a normal workflow id',
  url === 'https://n8n.example.com/api/v1/workflows/WF456', `url=${url}`);

// Brain id with surrounding whitespace must still be refused (guard trims).
let threwWs = false;
try { evalN8nUrl(upd.parameters.url, { workflow_id: '  BRAIN123  ', env }); }
catch (e) { threwWs = /core Brain/.test(e.message); }
check('T-guard: whitespace-padded Brain id still refused', threwWs);

// Missing id must throw (never build a URL with an empty id).
let threwEmpty = false;
try { evalN8nUrl(upd.parameters.url, { workflow_id: '', env }); }
catch (e) { threwEmpty = /workflow_id required/.test(e.message); }
check('T-guard: missing workflow id rejected', threwEmpty);

// Different casing is a DIFFERENT id (n8n ids are case-sensitive) => allowed.
let urlLc = evalN8nUrl(upd.parameters.url, { workflow_id: 'brain123', env });
check('T-guard: different-cased id treated as a different workflow (allowed)',
  urlLc === 'https://n8n.example.com/api/v1/workflows/brain123', `url=${urlLc}`);

const del = brain.nodes.find(n => n.name === 'n8n — Delete Workflow (L4)');
let threwDel = false;
try { evalN8nUrl(del.parameters.url, { workflow_id: 'BRAIN123', env }); }
catch (e) { threwDel = /core Brain/.test(e.message); }
check('T-guard: Delete refuses to target the core Brain id', threwDel);

// Create/Update use only {name,nodes,connections,settings} in the body
const create = brain.nodes.find(n => n.name === 'n8n — Create Workflow (L2)');
check('T-create-body: Create posts only name/nodes/connections/settings',
  /name:\s*wf\.name/.test(create.parameters.jsonBody)
  && /connections:\s*wf\.connections/.test(create.parameters.jsonBody)
  && !/active:/.test(create.parameters.jsonBody));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
