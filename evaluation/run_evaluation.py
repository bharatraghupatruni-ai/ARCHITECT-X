#!/usr/bin/env python3
"""
ARCHITECT-X Evaluation Runner
==============================
Runs the benchmark dataset against the live ARCHITECT-X API and measures
quality metrics across the full pipeline:
  1. Requirement Coverage
  2. Conflict Detection Rate
  3. Evidence Grounding
  4. Decision Consistency
  5. Architecture Traceability
  6. Challenge Coverage

Usage:
    python evaluation/run_evaluation.py [--api-url http://localhost:8000] [--cases EC-001,FD-001] [--output evaluation/results]

Requirements:
    - Backend must be running (uvicorn app.main:app)
    - pip install requests

Output:
    - evaluation/results.json  — machine-readable detailed results
    - evaluation/results.csv   — spreadsheet-friendly summary
"""

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not installed. Run: pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BENCHMARK_PATH = Path(__file__).parent / "benchmark.json"
DEFAULT_API_URL = os.getenv("ARCHITECT_X_API_URL", "http://localhost:8000")

# Pipeline endpoint map
ENDPOINTS = {
    "create_project":       "POST /api/projects",
    "analyze_requirement":  "POST /api/projects/{id}/analyze-requirement",
    "run_agents":           "POST /api/projects/{id}/run-agents",
    "run_review":           "POST /api/projects/{id}/review",
    "retrieve_evidence":    "POST /api/projects/{id}/retrieve-evidence",
    "explainability":       "POST /api/projects/{id}/explainability",
    "architecture":         "GET  /api/projects/{id}/architecture",
    "challenge":            "POST /api/projects/{id}/challenge",
    "traceability":         "GET  /api/projects/{id}/traceability-validation",
}

REQUIRED_COMPONENT_IDS = [
    "core_domain_service",
    "primary_database",
    "redis_cache",
    "api_gateway",
    "event_bus",
]


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------

def api_request(method: str, url: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Execute HTTP request and return JSON response or None on failure."""
    try:
        resp = requests.request(method, url, timeout=60, **kwargs)
        if resp.ok:
            return resp.json()
        else:
            print(f"    [WARN] {method} {url} → HTTP {resp.status_code}: {resp.text[:200]}")
            return None
    except Exception as exc:
        print(f"    [ERROR] {method} {url} → {exc}")
        return None


# ---------------------------------------------------------------------------
# Metric evaluation helpers
# ---------------------------------------------------------------------------

def score_requirement_coverage(case: Dict, analysis: Dict) -> Dict:
    """
    AUTO-MEASURABLE: Check whether extracted requirements cover expected concerns.
    Strategy: keyword overlap between expected_concerns and extracted fields.
    """
    if not analysis:
        return {"score": 0.0, "note": "Analysis failed — no data", "manual_review": False}

    expected = " ".join(case.get("expected_concerns", [])).lower()
    extracted = " ".join([
        *analysis.get("analysis", {}).get("functional_requirements", []),
        *analysis.get("analysis", {}).get("non_functional_requirements", []),
        analysis.get("analysis", {}).get("domain", ""),
        analysis.get("analysis", {}).get("system_type", ""),
    ]).lower()

    concern_keywords = [w for w in expected.split() if len(w) > 4]
    hits = sum(1 for kw in concern_keywords if kw in extracted)
    coverage = round(hits / max(len(concern_keywords), 1), 3)

    return {
        "score": min(coverage, 1.0),
        "keywords_expected": len(concern_keywords),
        "keywords_found": hits,
        "note": "Keyword overlap between expected concerns and extracted requirements",
        "manual_review": False,
    }


def score_conflict_detection(case: Dict, review: Dict) -> Dict:
    """
    AUTO-MEASURABLE: Count conflicts detected; flag cases with zero conflicts.
    """
    if not review:
        return {"score": 0.0, "conflicts_detected": 0, "note": "Review failed", "manual_review": False}

    conflicts = review.get("conflicts", [])
    count = len(conflicts)
    categories = list({c.get("category", "") for c in conflicts})

    return {
        "score": min(1.0, count / 3),  # 3+ conflicts = full score
        "conflicts_detected": count,
        "conflict_categories": categories,
        "note": "Score proportional to conflict count (3+ = 1.0)",
        "manual_review": False,
    }


def score_evidence_grounding(case: Dict, evidence: Dict) -> Dict:
    """
    AUTO-MEASURABLE: Check number of evidence items retrieved.
    """
    if not evidence:
        return {"score": 0.0, "evidence_items": 0, "note": "Evidence retrieval failed", "manual_review": False}

    items = evidence.get("evidence_items", [])
    count = len(items)
    sources = list({e.get("source", "") for e in items})

    return {
        "score": min(1.0, count / 4),  # 4+ items = full score
        "evidence_items": count,
        "unique_sources": len(sources),
        "is_sufficient": evidence.get("is_sufficient", False),
        "note": "Score proportional to evidence items (4+ = 1.0)",
        "manual_review": False,
    }


def score_decision_consistency(case: Dict, explainability: Dict) -> Dict:
    """
    AUTO-MEASURABLE: Check ADRs generated and their statuses.
    MANUAL: Whether ADR decisions match expected_decisions from benchmark.
    """
    if not explainability:
        return {"score": 0.0, "adrs_generated": 0, "note": "Explainability failed", "manual_review": True}

    adrs = explainability.get("adrs", [])
    count = len(adrs)
    accepted = sum(1 for adr in adrs if adr.get("status") == "accepted")

    auto_score = min(1.0, count / 3)  # 3+ ADRs = full auto score

    return {
        "score": auto_score,
        "adrs_generated": count,
        "adrs_accepted": accepted,
        "note": "Auto: ADR count (3+=1.0). Manual: validate ADR decisions match expected_decisions.",
        "manual_review": True,
        "manual_prompt": "Review ADR titles and decisions against benchmark expected_decisions.",
    }


def score_architecture_traceability(case: Dict, architecture: Dict) -> Dict:
    """
    AUTO-MEASURABLE: Check required component IDs are present in unified architecture.
    """
    if not architecture:
        return {"score": 0.0, "note": "Architecture load failed", "manual_review": False}

    components = architecture.get("components", [])
    component_ids = {c.get("id") for c in components}
    traceability = architecture.get("traceability", [])

    missing = [cid for cid in REQUIRED_COMPONENT_IDS if cid not in component_ids]
    present_count = len(REQUIRED_COMPONENT_IDS) - len(missing)
    comp_score = round(present_count / len(REQUIRED_COMPONENT_IDS), 3)
    trace_score = min(1.0, len(traceability) / 3)
    combined = round((comp_score + trace_score) / 2, 3)

    return {
        "score": combined,
        "required_components_present": present_count,
        "required_components_missing": missing,
        "traceability_links": len(traceability),
        "total_components": len(components),
        "note": "Combined: component presence + traceability link count",
        "manual_review": False,
    }


def score_challenge_coverage(case: Dict, challenge_results: List[Dict]) -> Dict:
    """
    AUTO-MEASURABLE: Check whether expected challenge scenarios were successfully simulated.
    """
    expected_scenarios = set(case.get("relevant_challenge_scenarios", []))
    executed_scenarios = {r.get("scenario_id") for r in challenge_results if r.get("scenario_id")}
    covered = expected_scenarios & executed_scenarios
    missing = expected_scenarios - executed_scenarios

    score = round(len(covered) / max(len(expected_scenarios), 1), 3) if expected_scenarios else 1.0

    return {
        "score": score,
        "expected_scenarios": list(expected_scenarios),
        "executed_scenarios": list(executed_scenarios),
        "covered_scenarios": list(covered),
        "missing_scenarios": list(missing),
        "note": "Proportion of expected challenge scenarios that were executed",
        "manual_review": False,
    }


# ---------------------------------------------------------------------------
# Pipeline runner for single case
# ---------------------------------------------------------------------------

def run_pipeline_for_case(api_url: str, case: Dict) -> Dict[str, Any]:
    """Execute full ARCHITECT-X pipeline for a single benchmark case."""
    case_id = case["id"]
    domain = case["domain"]
    print(f"\n  → Running pipeline for [{case_id}] {case['name']}")

    result = {
        "case_id": case_id,
        "domain": domain,
        "name": case["name"],
        "timestamp": datetime.utcnow().isoformat(),
        "pipeline_stages": {},
        "metrics": {},
        "overall_score": 0.0,
        "errors": [],
    }

    # 1. Create project
    print(f"     [1/9] Creating project...")
    project = api_request("POST", f"{api_url}/api/projects", json={
        "name": f"[EVAL-{case_id}] {case['name']}",
        "requirement": case["requirement"],
    })
    if not project:
        result["errors"].append("Failed to create project")
        return result

    pid = project["id"]
    result["pipeline_stages"]["project_id"] = pid
    result["pipeline_stages"]["project_created"] = True

    # 2. Analyze requirement
    print(f"     [2/9] Analyzing requirement...")
    analysis = api_request("POST", f"{api_url}/api/projects/{pid}/analyze-requirement")
    result["pipeline_stages"]["analysis_completed"] = bool(analysis)

    # 3. Run agents
    print(f"     [3/9] Running multi-agent evaluation...")
    agents = api_request("POST", f"{api_url}/api/projects/{pid}/run-agents")
    result["pipeline_stages"]["agents_completed"] = bool(agents)

    # 4. Run review
    print(f"     [4/9] Running reviewer & conflict engine...")
    review = api_request("POST", f"{api_url}/api/projects/{pid}/review")
    result["pipeline_stages"]["review_completed"] = bool(review)

    # 5. Retrieve evidence
    print(f"     [5/9] Retrieving RAG evidence...")
    evidence = api_request("POST", f"{api_url}/api/projects/{pid}/retrieve-evidence")
    result["pipeline_stages"]["evidence_completed"] = bool(evidence)

    # 6. Generate explainability
    print(f"     [6/9] Generating ADRs & C4 diagrams...")
    explainability = api_request("POST", f"{api_url}/api/projects/{pid}/explainability")
    result["pipeline_stages"]["explainability_completed"] = bool(explainability)

    # 7. Load architecture
    print(f"     [7/9] Loading unified architecture...")
    architecture = api_request("GET", f"{api_url}/api/projects/{pid}/architecture")
    result["pipeline_stages"]["architecture_completed"] = bool(architecture)

    # 8. Run challenge scenarios
    print(f"     [8/9] Running challenge scenarios...")
    challenge_results = []
    for scenario_id in case.get("relevant_challenge_scenarios", []):
        cr = api_request("POST", f"{api_url}/api/projects/{pid}/challenge",
                         json={"scenario_id": scenario_id})
        if cr:
            challenge_results.append({
                "scenario_id": cr.get("scenario_id"),
                "severity": cr.get("result", {}).get("impact", {}).get("severity"),
            })
    result["pipeline_stages"]["challenges_run"] = len(challenge_results)

    # 9. Traceability validation
    print(f"     [9/9] Validating traceability chain...")
    traceability_report = api_request("GET", f"{api_url}/api/projects/{pid}/traceability-validation")
    result["pipeline_stages"]["traceability_validation_completed"] = bool(traceability_report)
    if traceability_report:
        result["pipeline_stages"]["broken_links"] = traceability_report.get("broken_links_count", 0)

    # Compute metrics
    print(f"     Computing metrics...")
    metrics = {
        "requirement_coverage":      score_requirement_coverage(case, analysis),
        "conflict_detection_rate":   score_conflict_detection(case, review),
        "evidence_grounding":        score_evidence_grounding(case, evidence),
        "decision_consistency":      score_decision_consistency(case, explainability),
        "architecture_traceability": score_architecture_traceability(case, architecture),
        "challenge_coverage":        score_challenge_coverage(case, challenge_results),
    }
    result["metrics"] = metrics

    # Overall score (average of all metric scores)
    scores = [m["score"] for m in metrics.values()]
    result["overall_score"] = round(sum(scores) / len(scores), 3)

    stages_ok = sum(1 for v in result["pipeline_stages"].values() if v is True)
    print(f"     Done. Overall score: {result['overall_score']:.1%}  |  Pipeline stages OK: {stages_ok}/7")

    return result


# ---------------------------------------------------------------------------
# Main evaluation orchestrator
# ---------------------------------------------------------------------------

def run_evaluation(api_url: str, case_filter: Optional[List[str]], output_path: str) -> None:
    """Run full benchmark evaluation and export results."""
    print(f"\n{'='*65}")
    print(f"  ARCHITECT-X Evaluation Runner")
    print(f"  API: {api_url}")
    print(f"  Benchmark: {BENCHMARK_PATH}")
    print(f"  Output: {output_path}.json / {output_path}.csv")
    print(f"{'='*65}")

    # Health check first
    health = api_request("GET", f"{api_url}/api/health")
    if not health:
        print(f"\n[FATAL] Cannot reach API at {api_url}. Ensure backend is running.\n")
        sys.exit(1)
    print(f"\n  API health: {health.get('status', 'unknown')} — {health.get('service', '')}")

    # Load benchmark
    with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
        benchmark = json.load(f)

    cases = benchmark["cases"]
    if case_filter:
        cases = [c for c in cases if c["id"] in case_filter]
        print(f"  Filtered to {len(cases)} cases: {case_filter}")

    print(f"\n  Running {len(cases)} benchmark cases...\n")

    all_results = []
    start_time = time.time()

    for idx, case in enumerate(cases, 1):
        print(f"\n[{idx}/{len(cases)}] {case['id']} — {case['name']}")
        case_result = run_pipeline_for_case(api_url, case)
        all_results.append(case_result)
        # Brief pause between cases to avoid overwhelming the API
        time.sleep(0.5)

    elapsed = round(time.time() - start_time, 1)

    # Aggregate summary
    summary = {
        "total_cases": len(all_results),
        "completed_at": datetime.utcnow().isoformat(),
        "elapsed_seconds": elapsed,
        "api_url": api_url,
        "metric_averages": {},
        "overall_average_score": 0.0,
        "cases_with_errors": sum(1 for r in all_results if r.get("errors")),
        "manual_review_required": [],
    }

    metric_names = ["requirement_coverage", "conflict_detection_rate", "evidence_grounding",
                    "decision_consistency", "architecture_traceability", "challenge_coverage"]

    for metric in metric_names:
        scores = [r["metrics"].get(metric, {}).get("score", 0.0) for r in all_results if r.get("metrics")]
        avg = round(sum(scores) / max(len(scores), 1), 3)
        summary["metric_averages"][metric] = {
            "average_score": avg,
            "min": round(min(scores), 3) if scores else 0.0,
            "max": round(max(scores), 3) if scores else 0.0,
        }

    overall_scores = [r.get("overall_score", 0.0) for r in all_results]
    summary["overall_average_score"] = round(sum(overall_scores) / max(len(overall_scores), 1), 3)

    # Identify metrics needing manual review
    for metric in metric_names:
        samples = [r["metrics"].get(metric, {}) for r in all_results if r.get("metrics")]
        if any(s.get("manual_review") for s in samples):
            summary["manual_review_required"].append(metric)

    # Full output
    output = {
        "summary": summary,
        "results": all_results,
        "benchmark_metadata": {
            "version": benchmark.get("version"),
            "description": benchmark.get("description"),
        },
    }

    # Write JSON
    out_json = Path(f"{output_path}.json")
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    # Write CSV summary
    out_csv = Path(f"{output_path}.csv")
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "case_id", "domain", "name", "overall_score",
            "requirement_coverage", "conflict_detection_rate", "evidence_grounding",
            "decision_consistency", "architecture_traceability", "challenge_coverage",
            "manual_review_needed", "errors",
        ])
        for r in all_results:
            m = r.get("metrics", {})
            writer.writerow([
                r["case_id"],
                r["domain"],
                r["name"],
                r.get("overall_score", 0.0),
                m.get("requirement_coverage", {}).get("score", ""),
                m.get("conflict_detection_rate", {}).get("score", ""),
                m.get("evidence_grounding", {}).get("score", ""),
                m.get("decision_consistency", {}).get("score", ""),
                m.get("architecture_traceability", {}).get("score", ""),
                m.get("challenge_coverage", {}).get("score", ""),
                any(m.get(mn, {}).get("manual_review") for mn in metric_names),
                "; ".join(r.get("errors", [])),
            ])

    # Print summary
    print(f"\n\n{'='*65}")
    print(f"  EVALUATION COMPLETE — {len(all_results)} cases in {elapsed}s")
    print(f"{'='*65}")
    print(f"  Overall Average Score: {summary['overall_average_score']:.1%}")
    print(f"\n  Metric Averages:")
    for metric, data in summary["metric_averages"].items():
        manual_tag = " [MANUAL REVIEW REQUIRED]" if metric in summary["manual_review_required"] else ""
        print(f"    {metric:<32} {data['average_score']:.1%}  (min={data['min']:.1%}, max={data['max']:.1%}){manual_tag}")
    print(f"\n  Cases with errors:      {summary['cases_with_errors']}")
    print(f"  Manual review needed:   {', '.join(summary['manual_review_required']) or 'None'}")
    print(f"\n  Results saved to:")
    print(f"    {out_json}")
    print(f"    {out_csv}")
    print(f"\n  NOTE: Scores for 'decision_consistency' require manual review.")
    print(f"        Inspect evaluation/results.json for full case details.\n")


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ARCHITECT-X Evaluation Runner — benchmark the full pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"Base URL of the ARCHITECT-X API (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--cases",
        default=None,
        help="Comma-separated list of case IDs to run (e.g. EC-001,BK-001). Default: all cases.",
    )
    parser.add_argument(
        "--output",
        default="evaluation/results",
        help="Output file path without extension (default: evaluation/results)",
    )

    args = parser.parse_args()
    case_filter = [c.strip() for c in args.cases.split(",")] if args.cases else None

    run_evaluation(
        api_url=args.api_url.rstrip("/"),
        case_filter=case_filter,
        output_path=args.output,
    )
