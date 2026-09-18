# Rayah — AI Personal Assistant (n8n)

A genuine **proactive AI personal assistant** built in n8n — not a command-response
chatbot. It runs the loop **OBSERVE → UNDERSTAND → REASON → PRIORITIZE → DECIDE → ACT →
VERIFY → REPORT → REMEMBER** on every event, decides what matters to you, acts within a
configurable authorization policy, verifies the result, and reports only when it should.

> This repository redesigns the original single-agent "Rayah — PRODUCTION FINAL"
> workflow into a central **Brain** fed by thin **observation** workflows. See
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full analysis of why the
> original chatbot shape could not become proactive, and how this fixes it.

## What's here

```
workflows/            (each has a readable .json AND a single-line .min.json)
  rayah-brain.*         ← import FIRST. Central reasoning brain + all tools + memory + router.
  rayah-gmail.*         ← Gmail Trigger → normalize → call Brain.
  rayah-whatsapp.*      ← WhatsApp Trigger → normalize → call Brain.
  rayah-google-chat.*   ← Google Chat webhook → normalize → call Brain.
  rayah-calendar.*      ← Schedule → morning briefing + hourly urgent sweep → call Brain.
  rayah-notion.*        ← Notion integration-test / callable sub-workflow.
  rayah-sheets.*        ← Google Sheets integration-test / callable sub-workflow.
  rayah-automation-runner.* ← polls the Automations sheet, fires due automations via Brain.
  rayah-error-handler.* ← Error Workflow: catches any failure, reports it via the Brain.
  _build.py             ← generator (edit + re-run to regenerate + validate). SOURCE OF TRUTH.
tests/
  logic_test.mjs        ← real execution of deterministic code nodes + guard (19/19 pass).
  live_n8n_test.mjs     ← LIVE proof harness against your n8n (list→create→…→delete).
  harness_selftest.mjs  ← validates the harness against a mock of the n8n API contract.
N8N_SETUP.md          ← 13-step import & configuration guide.
TESTING.md            ← 19 tests (Input → Expected → Actual → Pass/Fail).
docs/
  ARCHITECTURE.md (A,B,C,F)   DIRECTIVE.md + DIRECTIVE.txt (D)   TOOLS.md (E)   SECURITY.md (G)
```

> **Import:** *Workflows → Import from File* for each `.json`, **or** open a `.min.json`,
> select-all, copy, and paste onto a blank n8n canvas. Import `rayah-brain` first, then set
> its id in each observation workflow's **Call Rayah Brain** node. Full steps in
> [`N8N_SETUP.md`](N8N_SETUP.md).

## Deliverables map

| # | Deliverable | Where |
|---|---|---|
| A | Current architecture & weaknesses | `docs/ARCHITECTURE.md` §A |
| B | Improved architecture | `docs/ARCHITECTURE.md` §B |
| C | Node-by-node changes | `docs/ARCHITECTURE.md` §C |
| D | AI agent directive | `docs/DIRECTIVE.md` + `docs/DIRECTIVE.txt` |
| E | Tool architecture | `docs/TOOLS.md` |
| F | Autonomous behavior | `docs/ARCHITECTURE.md` §F |
| G | Security / authorization model | `docs/SECURITY.md` |
| H | Testing plan | `TESTING.md` (root) |
| I | Complete importable n8n JSON | `workflows/*.json` + `*.min.json` |
| J | Setup instructions | `N8N_SETUP.md` (root) + this file |

---

## J. Setup

> **Compatibility note.** The JSON targets a recent n8n (LangChain agent
> `typeVersion 1.9`, `lmChatOpenAi 1.3`, Switch v3.2, Gmail/Calendar tool nodes as in
> your original). All credentials use **placeholder ids** (`REPLACE_*`) so nothing
> secret is embedded — n8n will ask you to pick real credentials on import. No node
> types or parameter names are invented; the belt is built from the same node types
> your original workflow already used, plus standard `httpRequestTool` for WhatsApp and
> Google Chat. If your n8n is older and a node shows a version warning, open it and
> re-select the operation — the parameters map cleanly.

### 1. Import workflows
In n8n: **Workflows → Import from File**. Import `rayah-brain.json` first, then the
three observation workflows. Open the Brain and copy its **workflow id** from the URL.

### 2. Configure credentials
Open each node showing a credential warning and select/create the real credential:
- **OpenAI** — `OpenAI Chat Model` (Brain). Adjust the model if desired (default
  `gpt-4.1-mini`).
- **Gmail (OAuth2)** — all Gmail tools + the Gmail Trigger.
- **Google Calendar (OAuth2)** — the Calendar tools. Set the calendar (default
  `primary`; change to your address if needed).
- **Google Chat (OAuth2)** — the Chat tools + Chat output.
- **Notion** — `Notion — Search Knowledge`.
- **Google Sheets (OAuth2)** — `Sheets — Append Row`.
- **WhatsApp Business Cloud** — the WhatsApp send HTTP nodes (credential type
  `whatsAppApi`) and the WhatsApp Trigger (`whatsAppTriggerApi`).

### 3. Point the observation workflows at the Brain
In each of `rayah-observe-email`, `rayah-observe-whatsapp`, `rayah-observe-gchat`,
`rayah-proactive-briefing`, open **Call Rayah Brain** and set the workflow to the Brain
(replace `REPLACE_BRAIN_WORKFLOW_ID`).

### 4. Environment variables
Set these in n8n (Settings → Variables/env, or your deployment env):
- `WHATSAPP_PHONE_NUMBER_ID` — your WhatsApp Business phone number id (used in the send URL).
- `RAYAH_SHEET_ID` — the Google Sheet id used by the Sheets append tool (create a sheet
  with a tab named `Log`, or change the tab name in the node).

### 5. Configure WhatsApp
- Create a **WhatsApp Business Cloud** app (Meta) and add the credential in n8n.
- The **WhatsApp Trigger** node exposes a webhook — register that URL and your verify
  token in the Meta app's webhook settings, subscribe to `messages`.
- Idempotency is automatic (the inbound message id becomes the `event_id`).

### 6. Configure Gmail
- Connect Gmail OAuth2. The **Gmail Trigger** polls every minute for new mail. Add
  `filters` (label/sender) in the trigger if you only want to observe part of the inbox.

### 7. Configure Google Calendar
- Connect Calendar OAuth2. Confirm the calendar id in each Calendar tool.

### 8. Configure Google Chat
- Connect a Google Chat OAuth2 credential. To send, the assistant needs an existing
  space; it uses **List Spaces / Search** to resolve one before sending.
- For inbound Chat, activate `rayah-observe-gchat` and register its webhook URL as your
  Google Chat app's HTTP endpoint (Chat API → Configuration). The endpoint ACKs 200 and
  the Brain replies back to the space asynchronously.

### 9. Configure Notion
- Connect Notion and share the relevant databases/pages with the integration.

### 10. Configure Google Sheets
- Connect Sheets OAuth2, create the log spreadsheet, set `RAYAH_SHEET_ID`.

### 11. Configure memory
- `Short-Term Memory` keys sessions per channel (`session_id`), so WhatsApp threads,
  chat sessions and observations don't cross-contaminate. Increase
  `contextWindowLength` if you want longer recall. For durable long-term knowledge use
  Notion/Sheets (systems of record) rather than the in-memory store.

### 12. Configure webhooks
- Activate the Brain and observation workflows so their webhooks (chat, WhatsApp) go
  live. Copy the production webhook URLs from each trigger.

### 13. Activate & test
- Activate all workflows. Then run the 19-test suite in [`TESTING.md`](TESTING.md)
  (conversation, Gmail observation/analysis, WhatsApp in/out, Chat, Calendar, Notion
  search/update, Sheets read/write, multi-tool, memory, duplicate protection, API/AI
  failure, prompt injection, unauthorized action, proactive notification).

> The precise, canonical setup walkthrough is [`N8N_SETUP.md`](N8N_SETUP.md); this section
> is the summary.

### Tuning autonomy
Edit the `POLICY` object in the Brain's **Input Normalizer** node to allow/deny
autonomous L3 sends per channel. Everything else about the behavior lives in the
directive — see [`docs/SECURITY.md`](docs/SECURITY.md).
