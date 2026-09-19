import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.explainability.adr_generator import adr_generator
from app.explainability.c4_generator import c4_generator


def test_adr_generator_creates_madr_compliant_records():
    project_id = uuid.uuid4()
    project_name = "Real-Time Ride Sharing Platform"
    analysis_data = {
        "domain": "Transportation & Logistics",
        "scale": {
            "expected_concurrent_users": 100000,
            "expected_requests_per_second": 15000,
        },
        "functional_requirements": ["Driver Dispatch", "Fare Calculation", "Live GPS Telemetry"],
    }
    review_output_data = {
        "adjudicated_decisions": [
            {
                "category": "Data Architecture",
                "chosen_option": "Read/Write Segregation (CQRS) with PostgreSQL + Redis",
                "rejected_options": ["Monolithic Shared Database"],
                "rationale": "Enables sub-5ms driver telemetry queries and horizontal read scaling.",
                "trade_offs": ["Eventual consistency complexity"],
                "review_status": "approved",
                "evidence_sources": ["Designing Data-Intensive Applications"],
            }
        ],
        "trade_off_analysis": [
            {
                "name": "CQRS Trade-off",
                "category": "Data Architecture",
                "pros": ["High throughput read replicas", "Optimized write path"],
                "cons": ["Eventual consistency delay"],
                "impact_score": "High",
            }
        ],
    }
    evidence = [
        {
            "source": "Designing Data-Intensive Applications",
            "section": "Chapter 5: Replication",
            "excerpt": "Read replicas scale throughput linearly when read load exceeds single node capacity.",
            "relevance_score": 0.94,
        }
    ]

    adrs = adr_generator.generate_adrs(
        project_id=project_id,
        project_name=project_name,
        review_run_id=uuid.uuid4(),
        analysis_data=analysis_data,
        agent_results_data=None,
        review_output_data=review_output_data,
        retrieved_evidence=evidence,
    )

    assert len(adrs) >= 1
    adr_1 = adrs[0]
    assert adr_1["adr_number"] == 1
    assert "ADR-001" in adr_1["title"]
    assert adr_1["status"] == "accepted"
    assert adr_1["category"] == "Data Architecture"
    assert "100,000" in adr_1["context"] or "Transportation" in adr_1["context"]
    assert len(adr_1["consequences_positive"]) >= 1
    assert len(adr_1["evidence_citations"]) >= 1
    assert adr_1["evidence_citations"][0]["source"] == "Designing Data-Intensive Applications"
    assert "## Context and Problem Statement" in adr_1["markdown_content"]
    assert "## Decision Outcome" in adr_1["markdown_content"]


def test_c4_generator_creates_all_three_levels_and_mermaid():
    project_name = "Fintech Core Banking"
    analysis_data = {
        "domain": "Fintech & Banking",
        "system_type": "Distributed Microservices",
        "external_integrations": ["Visa/Mastercard Network", "Twilio SMS", "Identity KYC"],
    }
    agent_results = {
        "architecture": {
            "components": [
                {"name": "Ledger Engine", "type": "Microservice", "description": "Double-entry ledger"},
                {"name": "Auth Guard", "type": "Security", "description": "mTLS & JWT"},
            ]
        }
    }

    c4 = c4_generator.generate_c4_model(
        project_name=project_name,
        analysis_data=analysis_data,
        agent_results_data=agent_results,
        review_output_data=None,
    )

    assert "Fintech Core Banking" in c4["title"]

    # Level 1 checks
    l1 = c4["level_1_context"]
    assert l1["level"] == 1
    assert len(l1["nodes"]) >= 3
    node_ids_1 = [n["id"] for n in l1["nodes"]]
    assert "core_system" in node_ids_1
    assert "C4Context" in c4["mermaid_context"]

    # Level 2 checks
    l2 = c4["level_2_container"]
    assert l2["level"] == 2
    assert len(l2["nodes"]) >= 5
    node_ids_2 = [n["id"] for n in l2["nodes"]]
    assert "frontend_spa" in node_ids_2
    assert "api_gateway" in node_ids_2
    assert "primary_database" in node_ids_2
    assert "C4Container" in c4["mermaid_container"]

    # Level 3 checks
    l3 = c4["level_3_component"]
    assert l3["level"] == 3
    assert len(l3["nodes"]) >= 4
    assert "C4Component" in c4["mermaid_component"]


def test_generate_explainability_api_flow(client: TestClient):
    # 1. Create project
    create_res = client.post(
        "/api/projects",
        json={
            "name": "Global E-Commerce Engine",
            "requirement": "Build a global e-commerce engine handling 50,000 concurrent shoppers with zero payment double-charge risk.",
        },
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Analyze requirement
    analyze_res = client.post(f"/api/projects/{project_id}/analyze-requirement")
    assert analyze_res.status_code == 200

    # 3. Run agents
    agent_res = client.post(f"/api/projects/{project_id}/run-agents")
    assert agent_res.status_code == 200

    # 4. Run review & conflict engine
    review_res = client.post(f"/api/projects/{project_id}/review")
    assert review_res.status_code == 200

    # 5. Generate explainability
    exp_res = client.post(f"/api/projects/{project_id}/explainability")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()

    assert exp_data["project_id"] == project_id
    assert exp_data["status"] == "completed"
    assert len(exp_data["adrs"]) >= 1
    assert exp_data["c4_diagram"] is not None
    assert exp_data["c4_diagram"]["level_1_context"]["level"] == 1
    assert exp_data["c4_diagram"]["level_2_container"]["level"] == 2
    assert exp_data["c4_diagram"]["level_3_component"]["level"] == 3

    # 6. Fetch existing explainability via GET
    get_res = client.get(f"/api/projects/{project_id}/explainability")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["project_id"] == project_id
    assert len(get_data["adrs"]) == len(exp_data["adrs"])

    # 7. Export ADRs markdown via GET
    export_res = client.get(f"/api/projects/{project_id}/adr/export")
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["project_id"] == project_id
    assert "Architecture Decision Records (ADR Bundle)" in export_data["bundled_markdown"]
    assert "ADR-001" in export_data["bundled_markdown"]


def test_explainability_nonexistent_project_404(client: TestClient):
    fake_id = uuid.uuid4()
    res = client.post(f"/api/projects/{fake_id}/explainability")
    assert res.status_code == 404

    res_get = client.get(f"/api/projects/{fake_id}/explainability")
    assert res_get.status_code == 404

    res_exp = client.get(f"/api/projects/{fake_id}/adr/export")
    assert res_exp.status_code == 404
