"use client";

import React, { useState } from "react";
import {
  ChallengeScenario,
  ChallengeRunResponse,
  UnifiedArchitectureResponse,
} from "@/lib/api";

interface ChallengeViewProps {
  scenarios: ChallengeScenario[];
  activeRun: ChallengeRunResponse | null;
  pastRuns: ChallengeRunResponse[];
  architecture?: UnifiedArchitectureResponse | null;
  isRunning: boolean;
  onRunScenario: (scenarioId: string) => void;
  onSelectPastRun: (run: ChallengeRunResponse) => void;
}

export const ChallengeView: React.FC<ChallengeViewProps> = ({
  scenarios,
  activeRun,
  pastRuns,
  architecture,
  isRunning,
  onRunScenario,
  onSelectPastRun,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    activeRun?.scenario_id || (scenarios[0]?.id ?? "redis_unavailable")
  );

  const activeScenarioDef = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];
  const result = activeRun?.result;

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "high":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      case "low":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      default:
        return "bg-slate-700/30 text-slate-300 border-slate-600/30";
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes("Infrastructure")) return "⚡";
    if (category.includes("Load") || category.includes("Scale")) return "📈";
    if (category.includes("Data") || category.includes("Inconsistency")) return "⚖️";
    if (category.includes("Network") || category.includes("Latency")) return "🌐";
    return "🛡️";
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-slate-900/80 to-amber-950/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                Phase 8 — Chaos & Resilience
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {pastRuns.length} Simulation{pastRuns.length === 1 ? "" : "s"} Run
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Challenge My Architecture</span>
              <span className="text-sm font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                AI Fault Injection
              </span>
            </h2>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Stress-test synthesized system components against realistic failure, scale surge, and distributed data corruption scenarios with AI-grounded failure cascade analysis.
            </p>
          </div>

          {/* Past Runs History Quick Switcher */}
          {pastRuns.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800 self-start md:self-auto">
              <span className="text-xs text-slate-400 font-mono px-2">History:</span>
              <select
                value={activeRun?.id || ""}
                onChange={(e) => {
                  const found = pastRuns.find((r) => r.id === e.target.value);
                  if (found) {
                    setSelectedScenarioId(found.scenario_id);
                    onSelectPastRun(found);
                  }
                }}
                className="bg-slate-800 text-xs text-white rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
              >
                {pastRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.result.scenario.name} ({new Date(run.created_at).toLocaleTimeString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Select Failure or Scale Scenario</span>
            <span className="text-xs text-slate-400 font-mono">({scenarios.length} available)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            const hasRun = pastRuns.some((r) => r.scenario_id === sc.id);

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-800/90 border-red-500/80 shadow-lg shadow-red-500/10 ring-1 ring-red-500"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                      <span>{getCategoryIcon(sc.category)}</span>
                      <span>{sc.category}</span>
                    </span>
                    {hasRun && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Evaluated
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1.5">{sc.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{sc.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-500 truncate">
                    {sc.expected_analysis_areas.length} Analysis Vectors
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScenarioId(sc.id);
                      onRunScenario(sc.id);
                    }}
                    disabled={isRunning}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm hover:brightness-110"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    } disabled:opacity-50`}
                  >
                    {isRunning && isSelected ? "Injecting..." : "Simulate →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Active Simulation View */}
      {result ? (
        <div className="space-y-6">
          {/* Active Scenario Card & Impact Overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Active Scenario Simulation
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getSeverityBadgeClass(
                      result.impact.severity
                    )}`}
                  >
                    Severity: {result.impact.severity.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span>{result.scenario.name}</span>
                </h3>
                <p className="text-xs text-red-300/80 font-mono mt-1">
                  Condition: {result.scenario.failure_condition}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onRunScenario(result.scenario.id)}
                  disabled={isRunning}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>🔄 Re-evaluate Scenario</span>
                </button>
              </div>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <span className="text-xs font-mono text-slate-400 block mb-1">System Impact Summary</span>
                <p className="text-sm font-medium text-slate-200">{result.impact.summary}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <span className="text-xs font-mono text-slate-400 block mb-1">Blast Radius & Scope</span>
                <p className="text-sm font-medium text-slate-200">{result.impact.blast_radius}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <span className="text-xs font-mono text-slate-400 block mb-1">Persistent Data Loss Risk</span>
                <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      result.impact.data_loss_risk.toLowerCase().includes("high")
                        ? "bg-red-500"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span>{result.impact.data_loss_risk}</span>
                </p>
              </div>
            </div>

            {/* Affected Architecture Components */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                Target Architecture Components Affected ({result.affected_components.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.affected_components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-mono shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span>{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Failure Propagation Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⏱️ Cascading Failure Propagation Timeline</span>
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:via-amber-500 before:to-emerald-500">
              {result.failure_propagation.map((step, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-red-500 group-hover:scale-125 transition-transform" />
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs md:text-sm text-slate-200 font-mono">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safeguards vs Gaps Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Existing Safeguards */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 backdrop-blur-xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                <h4 className="font-bold text-emerald-300 text-sm md:text-base">
                  Active Architectural Safeguards
                </h4>
              </div>
              <ul className="space-y-2.5">
                {result.existing_safeguards.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-200">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Identified Gaps */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 backdrop-blur-xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                  ⚠️
                </span>
                <h4 className="font-bold text-amber-300 text-sm md:text-base">
                  Identified Gaps & Vulnerabilities
                </h4>
              </div>
              <ul className="space-y-2.5">
                {result.identified_gaps.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-200">
                    <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Mitigations & Playbook */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛠️ Actionable Mitigation Playbook</span>
            </h3>
            <div className="space-y-3">
              {result.mitigations.map((mit, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60"
                >
                  <span className="w-6 h-6 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm font-medium text-slate-200">{mit}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Evidence Used */}
            {result.evidence_used && result.evidence_used.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Literature Grounding (RAG Evidence)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.evidence_used.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40 text-xs font-mono text-slate-300"
                    >
                      <div className="flex items-center justify-between text-[11px] text-amber-400/90 mb-1">
                        <span>📚 {ev.source}</span>
                        <span>Score: {Math.round((ev.relevance_score || 0.9) * 100)}%</span>
                      </div>
                      <p className="line-clamp-2 text-slate-400 italic">"{ev.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Operational Recovery & Architecture Changes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operational Recovery */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-3">
              <h4 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                <span>🔄 Operational Cluster Recovery Playbook</span>
              </h4>
              <p className="text-xs md:text-sm text-slate-300 font-mono leading-relaxed bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
                {result.recovery_strategy}
              </p>
            </div>

            {/* Architecture Hardening Changes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-3">
              <h4 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                <span>🧱 Architecture Hardening Modifications</span>
              </h4>
              <ul className="space-y-2">
                {result.architecture_changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/60 text-xs md:text-sm text-slate-200"
                  >
                    <span className="text-red-400 font-bold">→</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-3xl mx-auto">
            ⚡
          </div>
          <h3 className="text-xl font-bold text-white">No Simulation Run Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Select one of the 7 failure or scale scenarios above and click "Simulate" to test your architecture's blast radius, failure cascades, and safeguards.
          </p>
          <button
            onClick={() => onRunScenario(selectedScenarioId)}
            disabled={isRunning}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-semibold text-sm shadow-lg shadow-red-500/25 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isRunning ? "Simulating Fault..." : `Simulate ${activeScenarioDef.name} →`}
          </button>
        </div>
      )}
    </div>
  );
};
