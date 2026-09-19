# ARCHITECT-X Evaluation Methodology

This document describes the evaluation framework used to benchmark the ARCHITECT-X platform against realistic software architecture scenarios.

---

## Overview

The evaluation framework tests ARCHITECT-X's full 9-stage pipeline against a curated benchmark of 20 software requirement cases across 10 application domains. It measures observable, automatable properties of the pipeline output — not subjective architectural correctness.

> **Design principle**: Scores measure *pipeline execution quality* and *output completeness*, not the quality of the underlying AI reasoning. Real AI reasoning quality can only be assessed through human expert review.

---

## Benchmark Dataset

Located at `evaluation/benchmark.json`.

### Coverage

| Domain | Cases | IDs |
|--------|-------|-----|
| E-Commerce | 2 | EC-001, EC-002 |
| Food Delivery | 2 | FD-001, FD-002 |
| Banking & Payment | 2 | BK-001, BK-002 |
| Social Media | 1 | SM-001 |
| Healthcare | 2 | HC-001, HC-002 |
| Logistics | 2 | LG-001, LG-002 |
| Streaming | 2 | ST-001, ST-002 |
| Education | 2 | ED-001, ED-002 |
| SaaS | 2 | SA-001, SA-002 |
| IoT | 2 | IOT-001, IOT-002 |
| General | 1 | GEN-001 |
| **Total** | **20** | |

### Case Structure

Each case contains:

```json
{
  "id": "EC-001",
  "domain": "e-commerce",
  "name": "Human-readable case name",
  "requirement": "Full natural-language requirement text",
  "expected_concerns": ["list of expected architectural concerns"],
  "expected_decisions": ["list of expected architectural decisions"],
  "expected_risks": ["list of expected risks"],
  "relevant_challenge_scenarios": ["scenario_ids to test"]
}
```

---

## Metrics

### 1. Requirement Coverage

**What it measures**: How much of the expected architectural concerns and domain context are captured in the extracted requirement analysis.

**Method**: Keyword overlap between `expected_concerns` keywords and the extracted FRs, NFRs, domain, and system_type fields from the requirement analysis.

**Formula**:
```
score = (matching keywords) / (total expected concern keywords)
capped at 1.0
```

**Auto-measurable**: Yes  
**Manual review required**: No

**Interpretation**: Low scores typically indicate the requirement parser missed important domain signals. May improve with real LLM mode.

---

### 2. Conflict Detection Rate

**What it measures**: How many architectural conflicts the reviewer & conflict engine identified.

**Method**: Count of `ArchitectureConflict` records generated per project.

**Formula**:
```
score = min(1.0, detected_conflicts / 3)
```
(3 or more conflicts = full score; baseline expectation for real-world requirements)

**Auto-measurable**: Yes  
**Manual review required**: No

**Interpretation**: Score of 0 means the conflict engine ran but found no conflicts. For complex requirements, this may indicate the conflict detection thresholds need tuning.

---

### 3. Evidence Grounding

**What it measures**: Whether the RAG engine successfully retrieved technical literature evidence.

**Method**: Count of `evidence_items` in the `RetrievedEvidence` record.

**Formula**:
```
score = min(1.0, evidence_items / 4)
```
(4 or more items = full score)

**Auto-measurable**: Yes  
**Manual review required**: No

**Interpretation**: Score of 0 typically means the knowledge base has no relevant content for the query, or the vector store is empty (run `POST /api/ingest-knowledge-base` first).

---

### 4. Decision Consistency

**What it measures**: Whether the explainability engine generated substantive Architecture Decision Records.

**Auto component**: Count of ADRs generated and their status (`accepted`, `proposed`, `deprecated`).

**Manual component**: Whether ADR decisions align with domain-appropriate choices (e.g., for a banking system, whether the ADRs address ACID guarantees, idempotency, audit logging).

**Formula (auto)**:
```
score = min(1.0, adrs_generated / 3)
```
(3+ ADRs = full auto score)

**Auto-measurable**: Partially  
**Manual review required**: **Yes** — to verify ADR content quality

**How to manually review**: 
1. Open `evaluation/results.json`
2. Find the case's `metrics.decision_consistency.manual_prompt`
3. Compare `pipeline_stages.explainability` ADR titles against the case's `expected_decisions`

---

### 5. Architecture Traceability

**What it measures**: Whether the unified architecture model contains expected components and has traceability links back to requirements.

**Method**:
- Component presence: Checks for standard component IDs in architecture model
- Traceability links: Counts `traceability` array entries in architecture model

**Formula**:
```
component_score = matching_required_components / total_required_components
traceability_score = min(1.0, traceability_links / 3)
score = (component_score + traceability_score) / 2
```

**Auto-measurable**: Yes  
**Manual review required**: No

---

### 6. Challenge Coverage

**What it measures**: Whether all expected challenge scenarios for a case were successfully executed.

**Method**: Compares `relevant_challenge_scenarios` from benchmark case against executed challenge scenario IDs from `ChallengeRun` records.

**Formula**:
```
score = covered_scenarios / expected_scenarios
```

**Auto-measurable**: Yes  
**Manual review required**: No

**Interpretation**: Score of 0 typically indicates the challenge engine failed to execute, or the scenario IDs in the benchmark don't match registered scenarios.

---

## Running the Evaluation

### Prerequisites

1. Backend running: `uvicorn app.main:app --port 8000`
2. Database initialized: `alembic upgrade head`
3. Knowledge base ingested (optional but improves evidence grounding scores)

### Commands

```bash
# All 20 cases (takes ~10-20 minutes depending on API speed)
python evaluation/run_evaluation.py

# Single domain
python evaluation/run_evaluation.py --cases EC-001,EC-002

# Custom API URL
ARCHITECT_X_API_URL=http://staging:8000 python evaluation/run_evaluation.py
```

### Output Files

| File | Format | Contents |
|------|--------|---------|
| `evaluation/results.json` | JSON | Full detailed results per case |
| `evaluation/results.csv` | CSV | Summary row per case (import to Excel/Sheets) |

---

## Interpreting Overall Results

| Overall Score Range | Interpretation |
|--------------------|---------------|
| 0.80 – 1.00 | Pipeline executing well end-to-end |
| 0.60 – 0.79 | Most stages working; check evidence grounding and challenge execution |
| 0.40 – 0.59 | Significant gaps; likely RAG knowledge base is empty or conflict engine thresholds too high |
| Below 0.40 | Pipeline failing mid-way; check `pipeline_stages` per case for broken stages |

---

## Adding New Cases

1. Edit `evaluation/benchmark.json`
2. Add a new case object following the schema above
3. Use a unique ID: `{DOMAIN}-{NNN}` (e.g., `AI-001`, `FINTECH-002`)
4. Run the evaluation with `--cases YOUR-ID` to test the new case in isolation

---

## Limitations

- Evaluation requires a running backend — no offline mode.
- In mock mode (`LLM_MOCK_MODE=True`), all cases get identical mock AI outputs, which limits the diagnostic value of cross-case comparison.
- `decision_consistency` cannot be fully automated without an LLM judge.
- Benchmark cases represent realistic but illustrative requirements; domain experts should review expected_concerns for accuracy.
