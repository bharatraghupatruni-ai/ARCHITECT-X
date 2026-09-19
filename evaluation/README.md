# ARCHITECT-X Evaluation Framework

This directory contains the evaluation benchmark and runner for the ARCHITECT-X platform.

## Contents

| File | Purpose |
|------|---------|
| `benchmark.json` | 20 benchmark cases across 10 domains |
| `run_evaluation.py` | Evaluation runner — executes the full pipeline per case |
| `results.json` | *(generated)* Machine-readable detailed results |
| `results.csv` | *(generated)* Spreadsheet-friendly summary |

---

## Prerequisites

1. **Backend must be running**:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Install requests** (if not already installed):
   ```bash
   pip install requests
   ```

---

## Running the Evaluation

### Run all 20 cases
```bash
python evaluation/run_evaluation.py
```

### Run specific cases
```bash
python evaluation/run_evaluation.py --cases EC-001,BK-001,HC-001
```

### Point to a custom API URL
```bash
python evaluation/run_evaluation.py --api-url http://your-server:8000
```

### Custom output path
```bash
python evaluation/run_evaluation.py --output evaluation/results_v2
```

### Use environment variable for API URL
```bash
export ARCHITECT_X_API_URL=http://staging-server:8000
python evaluation/run_evaluation.py
```

---

## Metrics

The runner measures 6 metrics per benchmark case:

| Metric | Measurement | Auto/Manual |
|--------|------------|-------------|
| **Requirement Coverage** | Keyword overlap between expected concerns and extracted requirements | Auto |
| **Conflict Detection Rate** | Number of conflicts detected (3+ = full score) | Auto |
| **Evidence Grounding** | Number of RAG evidence items retrieved (4+ = full score) | Auto |
| **Decision Consistency** | ADR count + status (Auto); ADR content vs expected decisions (Manual) | Auto + Manual |
| **Architecture Traceability** | Required component presence + traceability links | Auto |
| **Challenge Coverage** | Proportion of expected scenarios successfully simulated | Auto |

### Scoring Philosophy

- Scores are **0.0 to 1.0** (displayed as percentages in output).
- Scores reflect **measurable pipeline execution quality** — not the subjective correctness of the AI output.
- `decision_consistency` requires **manual human review** to verify ADR decisions match domain expectations.
- Do **not** treat individual scores as accuracy percentages — they measure observable properties.

---

## Interpreting Results

### `results.json` structure
```json
{
  "summary": {
    "total_cases": 20,
    "overall_average_score": 0.73,
    "metric_averages": { ... },
    "manual_review_required": ["decision_consistency"],
    "cases_with_errors": 0
  },
  "results": [
    {
      "case_id": "EC-001",
      "domain": "e-commerce",
      "pipeline_stages": { ... },
      "metrics": { ... },
      "overall_score": 0.82
    }
  ]
}
```

### Red Flags
- `overall_score < 0.5` for a case → pipeline likely failed mid-way; check `pipeline_stages`
- `evidence_grounding.score = 0.0` → RAG knowledge base may not be ingested
- `challenge_coverage.score = 0.0` → Challenge engine not executing scenarios
- High `cases_with_errors` count → API may be misconfigured or services down

---

## Adding New Benchmark Cases

Edit `evaluation/benchmark.json` to add a case:

```json
{
  "id": "MY-001",
  "domain": "my_domain",
  "name": "My Requirement Case",
  "requirement": "The full requirement text...",
  "expected_concerns": ["concern 1", "concern 2"],
  "expected_decisions": ["decision 1", "decision 2"],
  "expected_risks": ["risk 1"],
  "relevant_challenge_scenarios": ["database_unavailable", "traffic_spike_20x"]
}
```

Valid `relevant_challenge_scenarios` IDs:
- `redis_unavailable`
- `database_unavailable`
- `traffic_spike_20x`
- `downstream_service_slow`
- `payment_success_order_fail`
- `message_broker_unavailable`
- `app_service_crash`

---

## Known Limitations

- Evaluation requires a live API (no offline mode).
- `decision_consistency` cannot be fully automated — human review of ADR decisions is recommended.
- Scores are relative to ARCHITECT-X's current mock-mode pipeline; real LLM mode may produce better results.
- Benchmark cases cover representative requirements but are not exhaustive for any domain.
