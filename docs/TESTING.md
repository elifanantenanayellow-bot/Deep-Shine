# Rayah — Testing Plan (Deliverable H)

Each test states the trigger, the expected loop, and the pass criterion. Run them in
n8n with **"Execute Workflow"** and the executions panel open.

> Tip: you can test the Brain in isolation by pinning an `envelope` on the
> `When Called by Observation Workflow` trigger and running the Brain directly.

---

### Test A — Email intelligence (proactive)
- **Trigger:** send yourself an email that needs attention (e.g. subject "Q4 meeting
  tomorrow 14:00, please confirm").
- **Expected:** `Observe: Email` → envelope (`mode=OBSERVATION`) → Brain runs the loop:
  reads full email, classifies HIGH, checks calendar for conflicts, reports on chat with
  *why it matters* and a recommendation. Does **not** send anything without authorization.
- **Pass:** Eli gets one HIGH report; no email auto-sent; calendar was actually read.

Sample envelope to inject directly:
```json
{ "envelope": { "channel": "email", "mode": "OBSERVATION",
  "event_id": "test-email-1", "sender": "boss@example.com",
  "subject": "Q4 meeting tomorrow 14:00",
  "text": "Subject: Q4 meeting tomorrow 14:00\nFrom: boss@example.com\n\nCan you confirm you'll attend the Q4 review tomorrow at 14:00?",
  "reply_to": "chat", "directives": "observe_email" } }
```

### Test B — WhatsApp
- **Trigger:** send a WhatsApp message to the business number ("what's on my calendar
  today?").
- **Expected:** `Observe: WhatsApp` → envelope (`reply_to` = your number) → Brain reads
  calendar → replies back **to the WhatsApp number** via the send tool/output.
- **Pass:** you receive a WhatsApp reply with today's real events; message id dedup means
  a re-delivered webhook does not double-reply.

### Test C — Notion
- **Trigger (interactive chat):** "What do we have in Notion about Project X?"
- **Expected:** Brain → Notion search → answer grounded in results.
- **Pass:** answer cites Notion content; "nothing found" if absent (no fabrication).

### Test D — Sheets
- **Trigger (interactive):** "Log a follow-up: call the supplier Friday."
- **Expected:** Brain → Sheets append (L2) → reads the append result → confirms.
- **Pass:** a row appears in the sheet; the confirmation reflects the actual result,
  not an assumption.

### Test E — Multi-tool
- **Trigger (interactive):** "The Project X email says the deadline moved to Oct 15 —
  handle it."
- **Expected:** Gmail get full email → Notion search Project X → Calendar check →
  (authorized) Sheets/Notion update → report with labelled recommendation.
- **Pass:** the tools are orchestrated in sequence; L4 nothing; a clear report.

### Test F — Proactive behavior (no command)
- **Trigger:** run `Proactive: Briefing & Sweep` manually (or wait for 07:00 local).
- **Expected:** Brain compiles important emails + today's calendar + deadlines and
  reports a concise briefing on chat, leading with the top priority. The hourly sweep
  reports **nothing** when nothing is urgent.
- **Pass:** a briefing is produced without any human command; the quiet sweep stays quiet.

### Test G — Duplicate protection (idempotency)
- **Trigger:** fire the same observation envelope (same `event_id`) twice.
- **Expected:** `Idempotency Gate` drops the second; only one logical action.
- **Pass:** the second run ends at the gate (empty output); no second notification/send.

---

## Regression checklist
- [ ] Interactive chat still answers directly (not deduped).
- [ ] L3 send is blocked in observation mode when policy flags are `false` (draft instead).
- [ ] L4 delete never fires without explicit confirmation.
- [ ] Observability log contains no email bodies / tokens / addresses.
- [ ] Timezone resolves to Indian/Antananarivo unless another city is named.
- [ ] "I sent it" never appears unless a send tool confirmed success.
