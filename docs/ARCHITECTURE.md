# Rayah — Architecture

> Deliverables **A** (current analysis), **B** (new architecture), **C** (node-by-node
> changes) and **F** (autonomous behavior).

---

## A. Current architecture & why it fails

The original workflow ("Rayah Personal Assistant — PRODUCTION FINAL") is a **single
chat-driven agent** with a large tool belt. It is a very capable *chatbot*, but it is
not an *assistant* in the sense you want. Concretely:

| Problem | Why it fails |
|---|---|
| **Only two real entry points** — a Chat Trigger and an Execute-Workflow trigger. | The system only ever runs when Eli talks to it (or an automation fires). It cannot *observe*. A new email or WhatsApp never reaches the brain on its own. |
| **The Gmail Trigger exists but only sorts/labels & embeds threads.** | It classifies email into "Colleagues/Kunde" and stores threads in an in-memory vector store. It never asks *"is this important? does it need action? should I tell Eli?"* — the reasoning layer is bypassed for real events. |
| **No authorization model in the data.** | Safety lives entirely inside the system prompt. There is no per-event `mode`, no policy object, no distinction between "Eli asked me" and "this just happened". The agent can be prompt-nudged by email/message content. |
| **No idempotency for observations.** | The webhook/trigger paths have no dedup. The same event can be processed twice. |
| **In-memory vector store.** | `vectorStoreInMemory` is wiped on every restart/instance — "long-term" knowledge is not durable. |
| **No prioritization / notification policy.** | There is no LOW/MEDIUM/HIGH/CRITICAL gate, so a proactive version would either spam Eli or stay silent. |
| **No verification/observability layer as nodes.** | "Verify the tool result" is only a prompt instruction; nothing structurally captures event → decision → tool → result → notification. |
| **Everything in one giant workflow.** | Triggers, tools, embeddings, classifier and agent are entangled; hard to reason about, hard to test, one failure blast-radius. |

**Verdict:** the tool belt and the directive are excellent and worth keeping. The
*shape* is wrong: a command-response chatbot cannot become proactive by adding more
tools. It needs an event pipeline in front of the brain.

---

## B. New architecture

One **central Brain** (the reasoning layer) that every channel feeds through a
**normalized envelope**. Observation is separated from reasoning.

```
  OBSERVE (thin workflows)              REASON (one brain)            ACT / REPORT
 ┌───────────────────────┐
 │ Gmail Trigger         │──┐
 ├───────────────────────┤  │        ┌───────────────────────┐
 │ WhatsApp Trigger      │──┤        │  RAYAH — CENTRAL BRAIN │
 ├───────────────────────┤  │  env   │                       │   ┌────────────┐
 │ Schedule (briefing)   │──┼──────► │ Normalize → Dedup →   │──►│ Route by   │──► WhatsApp
 ├───────────────────────┤  │        │ Frame → AGENT →       │   │ channel    │──► Google Chat
 │ (future: Chat/Drive)  │──┘        │ Verify → Log          │   └────────────┘──► Chat reply
 └───────────────────────┘           └───────────┬───────────┘                └──► (internal only)
                                                  │
   Interactive:  Chat Trigger ────────────────────┘        tools: Gmail · Calendar · Notion ·
                                                             Sheets · WhatsApp · Google Chat · Date
                                     memory: short-term buffer (per session/channel)
```

The pipeline inside the Brain **is** the OBSERVE → … → REMEMBER loop:

| Stage | Node | Does |
|---|---|---|
| OBSERVE | `Input Normalizer` | Any trigger → one `envelope` (channel, mode, event_id, text, sender, reply_to, policy). |
| — | `Idempotency Gate` | Drops events whose `event_id` was already processed (workflow static data). Interactive chat is never deduped. |
| UNDERSTAND/REASON/DECIDE | `Frame Event for Agent` + `Rayah — Central Brain` (agent) | For observations, the envelope is framed so the agent runs the explicit reasoning loop instead of "chatting". The directive carries the whole decision framework. |
| ACT | tool nodes | The agent calls the minimum tools; each write tool is tagged L2/L3/L4. |
| VERIFY | `Verify & Structure Report` | Reads the agent output, attaches routing + builds an observability record. |
| REPORT | `Route Output by Channel` (Switch) | Sends the reply to the right channel (WhatsApp number, Chat space, chat UI) or keeps it internal. |
| REMEMBER | `Short-Term Memory` + (directive-gated) durable memory | Conversation memory keyed per channel/session; durable facts only when the directive says so. |
| trace | `Observability Log` | Structured, non-sensitive trace line per event. |

### Why this fixes the failures
- **It observes.** Three thin workflows turn real-world events into envelopes and call
  the Brain — Eli does not have to ask.
- **One brain, one directive.** Every channel gets identical judgment; you change
  behavior in one place.
- **Authorization is data, not vibes.** Each envelope carries `mode` +
  `policy`; the directive enforces L1–L4 against it.
- **Idempotent.** `event_id` dedup on every observation path (WhatsApp message id,
  Gmail message id, schedule hour).
- **Prioritized.** The directive's LOW/MEDIUM/HIGH/CRITICAL gate means proactive runs
  notify only when they should.
- **Testable & isolated.** Observation workflows can be run independently; the Brain
  can be invoked directly with a hand-made envelope.

---

## C. Node-by-node changes

**Kept (proven, reused):** the Gmail / Calendar / Google Chat tool nodes and their
`$fromAI` prompts, the OpenAI chat model, the window-buffer memory pattern. These were
well built and are carried into the Brain's tool belt (trimmed to the essentials —
see `TOOLS.md`).

**Added:**
| Node | Purpose |
|---|---|
| `Input Normalizer` (Code) | Unifies all triggers into one envelope + injects the policy. |
| `Idempotency Gate` (Code) | Deterministic dedup via `event_id`. |
| `Frame Event for Agent` (Code) | Turns observation envelopes into a reasoning prompt. |
| `Verify & Structure Report` (Code) | Post-agent verification + routing metadata + trace record. |
| `Route Output by Channel` (Switch) | Sends the reply to WhatsApp / Chat / chat UI / internal. |
| `Observability Log` (Code) | Structured, non-sensitive event trace. |
| `WhatsApp — Send …` (HTTP) & `WhatsApp Trigger` | WhatsApp as a real channel (in + out) with message-id idempotency. |
| `Sheets — Append Row (L2)` | Structured operational logging when appropriate. |
| `Notion — Search Knowledge` | Knowledge lookups tied to events. |
| Observation workflows ×3 | `Observe: Email`, `Observe: WhatsApp`, `Proactive: Briefing & Sweep`. |

**Changed:**
- The former "sort & label + embed threads" Gmail branch is replaced by an
  **Observe: Email** workflow that hands *every* new email to the Brain for a genuine
  importance/action decision. (You can keep the labeling branch alongside if you still
  want automatic labels — it is orthogonal.)
- The agent's system message is replaced by the **v8 directive** (`DIRECTIVE.txt`),
  which adds the envelope contract, the explicit reasoning loop, the L1–L4 policy, the
  notification gate and the anti-hallucination rules.
- The vector store note: for durable long-term knowledge use Notion/Sheets/Drive (the
  systems of record) rather than the in-memory store, which does not survive restarts.

**Removed / demoted:** redundant duplicate Gmail draft/send nodes were consolidated to
one of each (search, get, draft, send). Extra Google Chat member-management tools from
the original are optional and omitted from the default Brain to keep the belt lean; add
them back if you manage spaces.

---

## F. Autonomous behavior — what it observes & how it decides

**Events observed (out of the box):**
1. **New email** — `Observe: Email` (Gmail Trigger, every minute).
2. **Inbound WhatsApp** — `Observe: WhatsApp` (WhatsApp Trigger).
3. **Time** — `Proactive: Briefing & Sweep` (07:00 local full briefing; hourly light
   urgent sweep of email + next 2h of calendar).

**How it decides (per event, from the directive):**
`WHAT HAPPENED → WHO/WHAT → RELEVANT? → HOW IMPORTANT (LOW/MED/HIGH/CRIT) → NEEDS
ACTION? → AUTHORIZED IN THIS MODE? → BEST ACTION + TOOL → DID IT SUCCEED? → REPORT?`

**Decision → notification mapping:**
- LOW → log only, no ping.
- MEDIUM → fold into the next briefing.
- HIGH → notify Eli on the configured channel.
- CRITICAL → notify immediately, lead with why.

**Decision → action mapping (mode-gated):**
- In OBSERVATION/AUTOMATION mode the Brain may do L1 (read) and L2 (reminder, note,
  Sheets row, notify) freely; L3 (send email/WhatsApp/Chat) only if the policy
  authorizes that channel, else it prepares a draft and surfaces it; **never** L4.
- In INTERACTIVE mode Eli's clear instruction authorizes L1–L3 immediately; L4 needs
  an explicit confirmation with an exact target/ID.

**Multi-tool reasoning example ("Project X deadline moved to Oct 15"):**
Gmail get full email → Notion search "Project X" → Calendar check related dates →
(if authorized) Sheets update tracker / Notion note → report to Eli with the change and
a labelled recommendation. Nothing is hard-wired; the agent chooses the chain.
