# RAYAH Automation Runner — Root Cause Analysis & Fix

**Scope:** `RAYAH — Automation Runner — PRODUCTION FINAL (CHAT + EMAIL)`
**Target:** n8n 2.35.4, Data Table `Rayah_Automations`
**Deliverable:** `RAYAH_Automation_Runner_PRODUCTION_FINAL_CHAT_EMAIL_v3.json` (importable)

> Note: only the Runner workflow JSON was available (pasted in the request). The
> `Rayah Personal Assistant` and `Create Automation` workflows were not present
> in the repository or on disk, so this analysis is scoped to the Runner. Where
> the Create side is implicated (how `next_run` is written) it is called out
> explicitly, and the Runner is made robust to every plausible format it emits.

---

## 1. Root cause (plain language)

The runner stopped at **Find Due Automations → Any Due? → FALSE → Runner Idle**
because **Find Due Automations decided nothing was due** — even when an active
automation's time had clearly passed.

There are two independent defects, and both had to be fixed:

### Primary defect — timezone comparison in `Find Due Automations`

`next_run` is compared like this in the current code:

```js
if (rawNextRun.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(rawNextRun)) {
  nextRun = new Date(rawNextRun);
} else {
  nextRun = new Date(`${rawNextRun}Z`);   // <-- assumes UTC
}
```

The `else` branch takes any timestamp **without** a `Z` or `+03:00` offset and
**forces it to be UTC** by appending `Z`. But the Rayah user timezone is
`Indian/Antananarivo` (**UTC+3**). If the Create/schedule step stores the
wall-clock time (e.g. `2026-09-17T15:00:00`, meaning 15:00 in Antananarivo =
**12:00 UTC**), this code reads it as **15:00 UTC** — three hours in the future.

Proven with the actual logic:

```
OLD  parsed(UTC): 2026-09-17T15:00:00.000Z | due? false
```

Real "now" was `12:05 UTC` and the job was due, but the runner saw it as due at
`15:00 UTC` and skipped it. Result: `due.length === 0` → the `NO_DUE_AUTOMATIONS`
control item → `Any Due? = FALSE` → `Runner Idle`. **Google Chat is never
reached** — exactly the reported symptom, and it "self-corrects" ~3 hours later
(18:00 local), which is why it looked intermittent.

The same `else` branch also produces **`Invalid Date`** for a space-separated SQL
datetime (`2026-09-17 15:00:00Z` is not parseable), and if the Data Table ever
returns `next_run` as a native `Date` object, `String(dateObj)` yields
`"Thu Sep 17 2026 ..."` which becomes `Invalid Date` too — both silently `continue`
and drop the item.

This is why the earlier "Any Due?" boolean fix (string→boolean) **did not solve
the problem**: the boolean gate was correct, but it was only ever receiving the
`due:false` control item, because the *item never reached the gate as due in the
first place*. The bug was upstream, in the date math.

### Secondary defect — delivery would fail even once a job became due

Even when a job eventually became "due", it could not deliver:

* **`spaces/spaces/…` 404** — the Chat URL was built by concatenating a value
  that already contained `spaces/…`, producing
  `https://chat.googleapis.com/v1/spaces/spaces/-eqEiyAAAAE/messages`.
* **Broken claim/update filters** — both Data Table `update` nodes had a filter
  condition with a `keyValue` but **no `keyName`**, so they did not reliably
  target the row by `id`.
* **Merge stall risk** — `Merge Execution Results` waited on inputs from three
  provider branches while only one branch ever runs per execution.

Together these meant: on the rare occasions a job *did* pass the due gate, it
either 404'd on Chat, failed to claim/update the right row, or stalled at Merge —
so **Sarobidy never received a message** and the job churned on the 5-minute
retry.

---

## 2. Exact nodes responsible

| # | Node | Defect |
|---|------|--------|
| 1 | **RAYAH — Find Due Automations1** | Naive `next_run` forced to UTC (UTC+3 offset lost) → job never "due"; `Invalid Date` on SQL/Date inputs silently dropped items. **(primary)** |
| 2 | **RAYAH — Send Google Chat1** | URL could yield `spaces/spaces/…` → 404. |
| 3 | **RAYAH — Claim Automation1** | Filter condition missing `keyName` (no reliable `id` match); also reset `run_count` to 0. |
| 4 | **RAYAH — Update Automation Status1** | Filter condition missing `keyName`. |
| 5 | **RAYAH — Merge Execution Results1** | Multi-input merge on a single-active-branch flow → stall risk. |

---

## 3. Why previous fixes didn't work

* The **Any Due? string→boolean** fix corrected the *gate*, but the gate was
  fed the `NO_DUE` control item because Find Due mis-computed "due". Fixing the
  gate could never make a mis-dated job appear.
* The **forced-test hack** (`_control: 'FORCED_TEST'`, `due:true`) *did* make
  the job run — which "proved" everything downstream worked — but it masked the
  real date bug and is not production-safe. It has been removed entirely.
* The **URL normalizer** fixed the 404 but only mattered *after* a job became
  due, which it wasn't — so Chat was still never reached.

---

## 4. The fix (what changed in v3)

1. **Timezone-correct due detection.** `Find Due` now:
   * trusts absolute timestamps (`…Z` or `…+03:00`) as-is;
   * interprets **naive** timestamps in the automation's `timezone`
     (default `Indian/Antananarivo`, UTC+3) via luxon, with a fixed-offset
     fallback, and converts to **UTC** before comparing to `Date.now()` (UTC);
   * handles `Date` objects, luxon `DateTime`, ISO-Z, ISO+offset and
     space-separated SQL datetimes — no more silent `Invalid Date` drops;
   * writes the canonical **UTC** `next_run` back on completion, so the stored
     value self-heals to `…Z` after the first run.

   Verified across all four formats:
   ```
   2026-09-17T15:00:00        => UTC 2026-09-17T12:00:00.000Z | due? true
   2026-09-17T12:00:00.000Z   => UTC 2026-09-17T12:00:00.000Z | due? true
   2026-09-17T15:00:00+03:00  => UTC 2026-09-17T12:00:00.000Z | due? true
   2026-09-17 15:00:00        => UTC 2026-09-17T12:00:00.000Z | due? true
   ```

2. **Deterministic control flow.** `Find Due` always returns either due items
   or exactly one `NO_DUE_AUTOMATIONS` item; `Any Due?` (strict boolean) routes
   TRUE→Claim / FALSE→Runner Idle.

3. **Chat URL hardening.** `.replace(/^(spaces\/)+/, 'spaces/')` collapses any
   number of leading `spaces/` and strips a full URL prefix; the final URL can
   never contain `spaces/spaces/`. Invalid spaces throw instead of 404-ing.

4. **Verified success only.** Chat success = HTTP 2xx **or** a response body
   whose `name` starts with `spaces/` (`fullResponse` enabled); Gmail success =
   a returned message/thread id; Rayah success = no explicit failure flag.
   A Code node merely running is never treated as success.

5. **Correct claiming & no lost counts.** Both `update` filters now match on
   `keyName: id`. Claim sets `status=running`, `last_status=running`,
   `last_run=<claim time>` and **no longer resets `run_count`**. The final
   status update increments the real `run_count`.

6. **Crash recovery + dedup.** Claim matches `status = claim_from_status`
   (`active`, or `running` when reclaiming). A row stuck in `running` for
   >10 min is auto-recovered; a concurrent claim that matches 0 rows produces
   0 items and safely stops (no double send).

7. **Merge removed.** Each Verify node feeds `Prepare Final Automation Status`
   directly, so a single-branch execution never stalls.

8. **Status semantics.** once+success → `completed`; recurring+success →
   `active` with `next_run` advanced in UTC (hourly/daily/weekly/monthly);
   any failure → `active`, retry in 5 minutes.

Credentials preserved by **id**: Chat `orrCQI2p40Yp6RqT` (`Chat account 2`),
Gmail `rQw4tzUCIaiIEwnp` (`Gmail account 3`). The workflow is imported inactive —
review, reconnect credentials if prompted, then activate.

---

## 5. Data-side checklist (Create Automation — verify these)

The Runner is now robust regardless, but confirm on the Create side:

* `next_run` is written as an **absolute** timestamp — ideally UTC `…Z`, or an
  offset `…+03:00`. If it is stored as Antananarivo wall-clock without a marker,
  the Runner now handles it, and it self-heals to UTC after the first run.
* The natural-language `schedule` (e.g. `"in 2 minutes"`) is converted to an
  absolute `next_run` and is **not** itself used for comparison. The Runner only
  compares `next_run`.
* The row carries the delivery fields the providers need: `destination`,
  `chat_space`, `message`, and for email `recipient_email`/`subject`.

---

## 6. Final test procedure (traces one job end-to-end)

Create a test row in `Rayah_Automations`:

```
name         RAYAH ROOT CAUSE TEST
status       active
schedule_type once
task_type    chat
destination  chat
chat_space   spaces/-eqEiyAAAAE
message      🔔 RAYAH ROOT CAUSE TEST
timezone     Indian/Antananarivo
next_run     <a time ~2 min in the PAST, in whatever format Create writes>
```

Trigger the runner (wait for the minute, or "Execute Workflow") and confirm at
each node:

| Node | Expected |
|------|----------|
| Get Automations1 | row present; `checked_count` includes it |
| Find Due Automations1 | item with `due: true`, `next_run` as `…Z`, `claim_from_status: active` — **not** `NO_DUE_AUTOMATIONS` |
| Any Due?1 | **TRUE** branch |
| Claim Automation1 | 1 updated row; `status=running` |
| Prepare Claimed Automation1 | full payload incl. `chat_space`, `message` |
| Is Google Chat?1 | **TRUE** branch |
| Send Google Chat1 | URL `https://chat.googleapis.com/v1/spaces/-eqEiyAAAAE/messages` (no `spaces/spaces/`); HTTP 200; body `name` starts `spaces/` |
| Verify Google Chat1 | `execution_success: true` |
| Prepare Final Automation Status1 | `final_status: completed` (once), `final_last_status: success` |
| Update Automation Status1 | row → `completed`, `run_count` incremented |
| Runner Result1 | `ok:true`, verified message |

**Success = Sarobidy receives `🔔 RAYAH ROOT CAUSE TEST` and the row becomes
`completed`.** For the negative test, an idle minute must go
Find Due → `NO_DUE_AUTOMATIONS` → Any Due? FALSE → Runner Idle → END.
