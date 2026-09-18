# Rayah — Tool Architecture (Deliverable E)

Every tool is attached to the Brain agent via an `ai_tool` connection. The agent
chooses tools by their description; each **write** tool is tagged with its
authorization level so the directive can gate it.

| Tool (node) | Level | When the agent uses it |
|---|---|---|
| **Current Date & Time** | L1 | Resolve "tomorrow", "in 5 min", weekday names in Indian/Antananarivo. |
| **Gmail — Search Emails** | L1 | Find emails; builds a Gmail query from natural language. Returns metadata + snippets. |
| **Gmail — Get Full Email** | L1 | Fetch the *complete* body by `messageId` (a snippet is **not** the email). Mandatory before saying what an email contains. |
| **Gmail — Create Draft Reply** | L2 | Prepare a reply on an existing thread — prepared, **not** sent. |
| **Gmail — Send Email (L3)** | **L3** | Send a new/standalone email. External comms — needs authorization per policy. |
| **Calendar — List Events** | L1 | Read schedule / availability / conflicts for a time range. |
| **Calendar — Create Event (L2)** | L2 | Create a genuinely new event (requires a meaningful title). |
| **Calendar — Update Event (L2)** | L2 | Modify an existing event by exact `eventId` (patch only named fields). |
| **Calendar — Delete Event (L4)** | **L4** | Delete/cancel — irreversible; explicit Eli confirmation + exact id only. |
| **Notion — Search Knowledge** | L1 | Connect an event to existing knowledge (projects, notes, records). |
| **Notion — Create Note (L2)** | L2 | Store a new note/page under a known parent when something is worth remembering. |
| **Notion — Update Record (L2)** | L2 | Update an existing database record by exact page id (e.g. a project deadline). Configure the target property in the node. |
| **Sheets — Append Row (L2)** | L2 | Append structured operational data (logs, follow-ups, tracking) — when Sheets is actually appropriate. |
| **WhatsApp — Send Message (L3)** | **L3** | Send a WhatsApp text to a known number (E.164). External comms. |
| **Google Chat — Send Message (L3)** | **L3** | Send to an existing space (`spaces/XXXXX`, normalized). External comms. |
| **Google Chat — Search Messages** | L1 | Keyword search Chat for context / to resolve a space. |
| **Google Chat — List Spaces** | L1 | Resolve a human name to an exact space resource before sending. |

## Additional tools (full belt = 30)
| Tool (node) | Level | When the agent uses it |
|---|---|---|
| **Notion — Create Note / Update Record** | L2 | Store or update knowledge (e.g. a moved deadline). |
| **Google Drive — Search Files** | L1 | Find files/folders related to an event. |
| **Sheets — Append Row** | L2 | Structured operational logging. |
| **Create Automation / List Automations / Update Automation** | L2 / L1 / L2 | Registry layer for simple timed sends (fired by the Automation Runner). |
| **n8n — List/Get Workflows, List/Get Executions** | L1 | Inspect/reuse real n8n workflows; diagnose failures. |
| **n8n — Create Workflow** | L2 | Build a real n8n workflow from an AI-designed definition. |
| **n8n — Update / Activate / Deactivate Workflow** | L3 | Modify/enable an existing workflow (guarded against the Brain). |
| **n8n — Delete Workflow** | L4 | Delete a workflow (explicit confirmation + exact id; Brain-guarded). |

The Automation **Runner** and **Error Handler** are workflows, not agent tools: the Runner
fires due `Automations` rows through the Brain; the Error Handler (set as each workflow's
Error Workflow) reports any failure through the Brain. Network-dependent nodes carry
`retryOnFail` (3× / 2s), and outbound sends continue-on-error to still reach the log.

## Selection rules the directive enforces
- **System of record wins.** Calendar questions → Calendar; email → Gmail; chat →
  Google Chat. The (optional) vector store is supplementary discovery only.
- **Capability pre-check.** Before promising an action the agent confirms the tool can
  do it and that it has (or can retrieve) the parameters; otherwise it says so up front
  and offers a fallback.
- **Tool economy.** One good call beats three. Recovery budget per task: 1 attempt +
  1 corrected retry + 1 fallback, then report.
- **Identifiers only from trusted output.** `messageId ≠ threadId`; display name ≠
  space resource; never invent an id.
- **Draft vs send.** "draft/prepare/compose" → prepare only (L2). "send/do it/go" →
  execute (L3), once.

## Adding more tools
The belt is intentionally lean. Drop in additional nodes (Google Drive search, Notion
create-page, the full Google Chat member-management set from the original workflow) and
connect them to `Rayah — Central Brain` with an `ai_tool` connection. Tag each write
tool's description with its L-level so the policy keeps applying.

## Sub-workflow tools (optional, from the original)
The original had `Get Full Email`, `Create Rayah Automation` and `Automation Control`
as `toolWorkflow` nodes pointing at other workflows by id. They are compatible with this
architecture — re-add them as `ai_tool`s and set the referenced workflow ids. The
Brain here already exposes a native **Gmail — Get Full Email** tool, so the sub-workflow
version is only needed if you want its extra decoding.
