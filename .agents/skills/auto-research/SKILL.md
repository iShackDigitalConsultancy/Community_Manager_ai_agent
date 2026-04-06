---
name: AutoResearch Multi-Document Reading Skill
description: A Karpathy-inspired 5-pass reading protocol for AI agents that need to synthesise answers from multiple community scheme documents (conduct rules, MOI, financials, notices, policies) for tenants and homeowners.
---

# AutoResearch: Multi-Document Reading for Community Management AI

## Core Philosophy

> *"Don't answer from the first search hit. Like a good researcher, read in passes: scan the landscape, dive deep, cross-reference contradictions, then synthesise."*
> — adapted from Karpathy's AutoResearch (propose → observe → commit/revert ratchet)

The agent must treat every resident question as a **research task**, not a lookup task. Even simple questions may require reading across 3–4 document types to give a complete, accurate, and legally defensible answer.

---

## The 5-Pass Reading Protocol

### PASS 1 — LANDSCAPE SCAN
**Goal:** Understand the scope of the question and identify which document types are relevant.

**Action:** Call `decompose_query` with the raw resident question and their role.

**Output:** An ordered list of sub-queries, each tagged with:
- `query` — the specific search phrase
- `documentTypes` — which KB document types to search preferentially
- `rationale` — why this angle matters

**Time budget:** 1 tool call.

---

### PASS 2 — FOCUSED DIVE
**Goal:** Gather authoritative content for each sub-query from the most relevant document types.

**Action:** Call `search_knowledgebase` for each sub-query returned by Pass 1.
- Use `topK=5` or `topK=6` for complex questions
- Where possible, note the source document title and type
- For tenant questions: prioritise `conduct_rules` → `notices` → `policies`
- For owner/trustee questions: prioritise `moi` → `financial` → `governance` → `conduct_rules`

**Time budget:** 2–4 tool calls.

---

### PASS 3 — COUNTER-QUERY
**Goal:** Find exceptions, exemptions, amendments, or contradictions to what Pass 2 found.

**Action:** Formulate a counter-search using phrases like:
- `"amended [topic]"`, `"exception to [rule]"`, `"override [policy]"`
- `"latest [topic]"`, `"updated rules [topic]"`

If Pass 2 found a date on a rule, search for any document created after that date on the same topic.

**Time budget:** 1–2 tool calls.

---

### PASS 4 — TEMPORAL CHECK
**Goal:** Confirm you have the most current version of any rule or policy referenced.

**Action:** If any finding from Passes 2–3 contains a date or refers to "previous" or "old" rules, search specifically for the newer version.

Look for: `"amended conduct rules"`, `"2024 budget"`, `"new policy"`, `"trustee resolution [topic]"`.

**Skip if:** All documents found are marked with the same date or the topic is clearly current.

**Time budget:** 0–1 tool calls.

---

### PASS 5 — SYNTHESISE
**Goal:** Build a coherent, accurate answer and assess whether you have sufficient coverage.

**Action:** Call `synthesise_research` with:
- `question` — the original resident question
- `findings` — array of all raw text returned from Passes 2–4

**Interpret the result:**
| Coverage Score | Action |
|---|---|
| 8–10 | Answer confidently with source references |
| 6–7 | Answer with a caveat: *"Based on current records; please confirm with your managing agent for latest updates"* |
| < 6 | Do NOT answer. Call `escalate_to_human` with a structured gap summary |

---

## Document Reading Priority by Resident Role

### Tenant Residents
Primary documents (in order of authority):
1. **Conduct Rules** — day-to-day behaviour, noise, pets, parking, alterations
2. **Trustee / Management Notices** — recent announcements, works, access
3. **Maintenance Policies** — SLAs, reporting procedures, contractor access
4. **Lease / Occupancy Terms** — if relevant to the query

Questions tenant agents should handle WITHOUT escalation:
- Noise / nuisance complaints
- Parking queries
- Maintenance fault reporting
- Levy balance and payment queries
- Document requests (clearance cert, MOI, minutes)
- Visitor/access rules

### Homeowners (Sectional Title Owners)
Primary documents (in order of authority):
1. **MOI (Memorandum of Incorporation)** — ownership rights, voting, scheme governance
2. **Conduct Rules** — same as tenants, but also covers common property usage
3. **Financial Statements / Budget** — levy calculations, reserve fund
4. **STSM Act / HOA Act** — legislative framework (know the basics, cite chapter/section)
5. **AGM / SGM Minutes** — resolutions, decisions, approvals

Additional topics homeowners ask about (not typical for tenants):
- Alterations requiring trustee approval
- Section boundary disputes
- Trustee elections and governance
- Reserve fund contributions and special levies
- Dispute resolution (CSOS)

### Trustees / Body Corporate
Extended reading authority — can ask about all of the above PLUS:
- Financial controls and audit requirements
- Contractor procurement rules
- Meeting quorum and voting procedures
- STSM Act compliance obligations
- Sectional plan amendments

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|---|---|
| Answer from a single search result | Always run at least 2 searches before answering |
| Fabricate rules not in the KB | Say explicitly: "I could not find this in the scheme's documents" |
| Ignore document age/dates | Always note when a rule was last updated |
| Answer legal or financial advice questions | Acknowledge and redirect: "Consult a sectional title attorney" |
| Give the same generic answer regardless of role | Tailor depth, tone, and document focus to the resident's role |
| Skip escalation when coverage is < 6 | Always escalate with a structured gap summary |

---

## Tool Usage in the AutoResearch Loop

| Pass | Tool | When |
|---|---|---|
| 1 | `decompose_query` | Always — at the start of every complex question |
| 2–4 | `search_knowledgebase` | 2–5 calls per complex question |
| 5 | `synthesise_research` | Always — before composing the final answer |
| 5 (fallback) | `escalate_to_human` | When coverage_score < 6 or resident is distressed |
| Any | `get_announcements` | Questions about recent notices/upcoming works |
| Any | `log_maintenance_request` | Fault/repair reports |
| Any | `query_levy_account` | Levy/account queries |
| Any | `request_document` | Document requests |

---

## Quality Checklist (Before Sending the Final Answer)

- [ ] Did I call `decompose_query` for multi-part questions?
- [ ] Did I search at least 2 different angles?
- [ ] Did I check for amendments or superseding documents?
- [ ] Did I call `synthesise_research` and check the coverage score?
- [ ] Does my answer include source references (document title + section)?
- [ ] Did I address the resident by name?
- [ ] Did I end with a "What would you like to do next?" follow-up?
- [ ] If coverage < 6 — did I escalate instead of guessing?
