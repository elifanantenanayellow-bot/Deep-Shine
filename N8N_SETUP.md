# N8N_SETUP — Rayah AI Personal Assistant

Import → configure credentials → connect sub-workflows → activate → test. No node needs
to be built by hand. Every file is a complete, validated n8n export.

## Files (in `workflows/`)

| Workflow | Readable | Minified | Role |
|---|---|---|---|
| Central Brain | `rayah-brain.json` | `rayah-brain.min.json` | The assistant: agent + directive + all tools + memory + router. **Import first.** |
| Gmail | `rayah-gmail.json` | `rayah-gmail.min.json` | Observes new email → calls Brain. |
| WhatsApp | `rayah-whatsapp.json` | `rayah-whatsapp.min.json` | Observes inbound WhatsApp → calls Brain. |
| Google Chat | `rayah-google-chat.json` | `rayah-google-chat.min.json` | Webhook for inbound Chat → calls Brain. |
| Calendar/Proactive | `rayah-calendar.json` | `rayah-calendar.min.json` | Schedule: morning briefing + hourly sweep → calls Brain. |
| Notion (utility/test) | `rayah-notion.json` | `rayah-notion.min.json` | Standalone Notion integration test / sub-workflow. |
| Google Sheets (utility/test) | `rayah-sheets.json` | `rayah-sheets.min.json` | Standalone Sheets integration test / sub-workflow. |
| Automation Runner | `rayah-automation-runner.json` | `rayah-automation-runner.min.json` | Polls the `Automations` sheet and fires due automations through the Brain. |

**Two ways to import each file:**
- **Import from File:** n8n → *Workflows* → *⋯* → *Import from File* → pick the `.json`.
- **Canvas paste:** open the `.min.json`, `Ctrl/Cmd+A`, `Ctrl/Cmd+C`, open a new workflow,
  click the canvas, `Ctrl/Cmd+V`, **Save**.

> Live Calendar / Notion / Sheets / Gmail / Chat / WhatsApp **tools** live inside the
> Brain. The Notion and Sheets files are standalone integration-test/utility workflows so
> every service has its own importable file; they are also callable as sub-workflows.

---

## Step 1 — Import the Brain
Import `rayah-brain.json` (or paste `rayah-brain.min.json`). Save it. Copy its **workflow
id** from the browser URL: `.../workflow/<BRAIN_WORKFLOW_ID>`. You'll need it in Step 11.

## Step 2 — Configure the AI model credential
Open **OpenAI Chat Model** in the Brain → select/create your **OpenAI** credential.
(Default model `gpt-4.1-mini`; change in the node if you prefer another.) The credential
field currently shows the placeholder `REPLACE_OPENAI_CRED`.

## Step 3 — Configure Gmail
Import `rayah-gmail.json`. In its **Gmail Trigger**, and in every **Gmail — …** tool node
inside the Brain, select your **Gmail OAuth2** credential (placeholder `REPLACE_GMAIL_CRED`).
Optionally add `filters` to the trigger to observe only part of the inbox.

## Step 4 — Configure WhatsApp
Import `rayah-whatsapp.json`. In its **WhatsApp Trigger**, select your **WhatsApp Trigger**
credential; in the Brain's **WhatsApp — Send Message (L3)** tool and **WhatsApp — Send
Proactive Reply**, select your **WhatsApp** credential. Set env var
`WHATSAPP_PHONE_NUMBER_ID` (Step 10). Register the trigger's webhook + verify token in the
Meta app and subscribe to `messages`.

## Step 5 — Configure Google Chat
Import `rayah-google-chat.json`. In the Brain's **Google Chat — …** tools and
**Google Chat — Send Proactive Reply**, select your **Google Chat OAuth2** credential
(placeholder `REPLACE_GCHAT_CRED`). Register the **Google Chat Webhook (inbound)** URL as
your Chat app's HTTP endpoint (Google Cloud → Chat API → Configuration).

## Step 6 — Configure Google Calendar
In the Brain's **Calendar — …** tools, select your **Google Calendar OAuth2** credential
(placeholder `REPLACE_GCAL_CRED`). Confirm the calendar id in each node (default `primary`).

## Step 7 — Configure Notion
Import `rayah-notion.json`. In it and in the Brain's **Notion — …** tools, select your
**Notion** credential (placeholder `REPLACE_NOTION_CRED`). Share the target databases/pages
with the Notion integration. In **Notion — Update Record (L2)**, map the property you want
updated (schema-specific — left blank on purpose).

## Step 8 — Configure Google Sheets (+ the automation store)
Import `rayah-sheets.json` and `rayah-automation-runner.json`. In them and in the Brain's
Sheets/automation tools, select your **Google Sheets OAuth2** credential (placeholder
`REPLACE_SHEETS_CRED`). In the spreadsheet whose id is `RAYAH_SHEET_ID` (Step 10) create
**two tabs**:
- `Log` — columns: `timestamp, source, note` (observability / test rows).
- `Automations` — header row with columns: `automation_id, name, purpose, schedule_type,
  next_run, task_type, destination, recipient, recipient_email, chat_space, subject,
  message, instruction, status, created_at, last_run, last_result`.

The `Automations` tab is the store behind "create an automation": the Brain's
**Create Automation (L2)** tool writes rows here; the **Automation Runner** reads them each
minute, fires rows whose `next_run` is due (in `AUTOMATION` mode), reschedules recurring
ones, and marks one-offs completed.

## Step 9 — Configure memory
The Brain's **Short-Term Memory** (window buffer) keys sessions per channel via
`session_id`, so WhatsApp / Chat / observation contexts stay separate. Increase
`contextWindowLength` (default 12) for longer recall. Durable long-term knowledge belongs
in Notion/Sheets (systems of record), not the buffer.

## Step 10 — Configure environment variables
In n8n (Settings → Variables/env or your deploy env):
- `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business phone-number id (used in the send URL).
- `RAYAH_SHEET_ID` — the Google Sheet id used by the Sheets tool/utility + automation registry.
- `RAYAH_BRAIN_WORKFLOW_ID` — the Brain's workflow id (Step 1). The n8n Manager tools use
  it to **refuse** any modify/activate/deactivate/delete that targets the Brain itself.
- `N8N_BASE_URL` — your n8n base URL, e.g. `https://n8n.yourhost.com` (no trailing slash).
- `N8N_API_KEY` — an n8n API key (Settings → **n8n API** → *Create an API key*). Used by the
  n8n Manager tools via the `X-N8N-API-KEY` header. **Never** hard-code it in a node; it is
  read from `$env` at runtime.

### The n8n Automation Manager (real workflow control)
The Brain has tools that call the **n8n Public REST API v1** so Rayah can operate n8n itself:
`List/Get Workflows`, `List/Get Executions` (L1), `Create Workflow` (L2), `Update`,
`Activate`, `Deactivate` (L3), `Delete` (L4). Endpoints used: `GET/POST/PUT/DELETE
/api/v1/workflows[/{id}][/activate|/deactivate]` and `GET /api/v1/executions[/{id}]` — the
documented public API. Note the public API has **no "run now" endpoint**; a workflow runs
via its own trigger/webhook. The `Automations` sheet + Runner remain as a lightweight
**registry/scheduler** for simple timed sends; anything event-driven/conditional/multi-step
should be a real workflow created through the Manager.

## Step 11 — Connect sub-workflows (Brain id)
In **each** of `rayah-gmail`, `rayah-whatsapp`, `rayah-google-chat`, `rayah-calendar`, and
`rayah-automation-runner`, open the **Call Rayah Brain** node and set its workflow to the
Brain — this replaces the placeholder `REPLACE_BRAIN_WORKFLOW_ID` from Step 1 (documented as
`RAYAH_BRAIN_WORKFLOW_ID`). n8n only assigns this id at import, so it genuinely cannot be
pre-filled. (The Notion/Sheets utilities also expose an *Execute Workflow Trigger* so the
Brain can call them as sub-workflows if you later wire them that way.)

## Step 12 — Activate triggers
Activate all workflows so their triggers/webhooks go live: Gmail poll, WhatsApp webhook,
Google Chat webhook, the Calendar schedule, and the Brain (chat + execute-workflow). Copy
the production webhook URLs from the trigger nodes where you need to register them.

## Step 13 — Run the test suite
Follow [`TESTING.md`](./TESTING.md). Fill in the *Actual result* and *Pass/Fail* columns as
you go. Start with the Notion and Sheets utility workflows (click **Test workflow**) to
confirm those credentials, then the interactive chat, then the observation channels.

---

## Placeholders you must replace (nothing else is a placeholder)
| Placeholder | Where | What to set |
|---|---|---|
| `REPLACE_OPENAI_CRED` | Brain / OpenAI Chat Model | OpenAI credential |
| `REPLACE_GMAIL_CRED` | Gmail nodes | Gmail OAuth2 credential |
| `REPLACE_GCAL_CRED` | Calendar tools | Google Calendar OAuth2 credential |
| `REPLACE_GCHAT_CRED` | Google Chat nodes | Google Chat OAuth2 credential |
| `REPLACE_NOTION_CRED` | Notion nodes | Notion credential |
| `REPLACE_SHEETS_CRED` | Sheets nodes | Google Sheets OAuth2 credential |
| `REPLACE_WHATSAPP_CRED` / `REPLACE_WHATSAPP_TRIGGER_CRED` | WhatsApp nodes | WhatsApp credentials |
| `REPLACE_BRAIN_WORKFLOW_ID` | *Call Rayah Brain* in the 4 observation workflows | the Brain's workflow id |
| `WHATSAPP_PHONE_NUMBER_ID`, `RAYAH_SHEET_ID` | env vars | your values |

No API keys, tokens, or secrets are embedded in any file — only n8n credential references
and the documented placeholders above.
