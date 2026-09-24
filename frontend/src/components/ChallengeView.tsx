"use client";

import React, { useState } from "react";
import {
  ChallengeScenario,
  ChallengeRunResponse,
  UnifiedArchitectureResponse,
} from "@/lib/api";
import { StatusBadge } from "./ui/StatusBadge";
import { SectionHeader } from "./ui/SectionHeader";
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Database,
  Radio,
  Server,
  Activity,
  CreditCard,
  Clock,
  Wrench,
} from "lucide-react";

interface ChallengeViewProps {
  scenarios: ChallengeScenario[];
  activeRun: ChallengeRunResponse | null;
  pastRuns: ChallengeRunResponse[];
  architecture?: UnifiedArchitectureResponse | null;
  isRunning: boolean;
  onRunScenario: (scenarioId: string) => void;
  onSelectPastRun: (run: ChallengeRunResponse) => void;
}

// 7 Consistent Backend Challenge Scenarios as Product Cards
const SCENARIO_CARDS = [
  {
    id: "database_unavailable",
    title: "Database Failure",
    subtitle: "Primary database node crashes or experiences storage corruption during peak load.",
    icon: Database,
    category: "Infrastructure",
  },
  {
    id: "redis_unavailable",
    title: "Redis Failure",
    subtitle: "Distributed cache cluster becomes unreachable due to network partition.",
    icon: Zap,
    category: "Infrastructure",
  },
  {
    id: "traffic_spike_20x",
    title: "20× Traffic Surge",
    subtitle: "Traffic abruptly surges from baseline to 20× within 60 seconds.",
    icon: Activity,
    category: "Scalability",
  },
  {
    id: "app_service_crash",
    title: "Service Crash",
    subtitle: "A core domain microservice experiences OOMKilled crash loop.",
    icon: Server,
    category: "Resilience",
  },
  {
    id: "payment_success_order_fail",
    title: "Payment / Order Failure",
    subtitle: "Payment gateway charge succeeds, but subsequent order write fails.",
    icon: CreditCard,
    category: "Consistency",
  },
  {
    id: "message_broker_unavailable",
    title: "Broker Failure",
    subtitle: "Message broker cluster loses quorum or disk fills up.",
    icon: Radio,
    category: "Messaging",
  },
  {
    id: "downstream_service_slow",
    title: "Downstream Slow",
    subtitle: "External dependency latency degrades from 50ms to 8,000ms.",
    icon: Clock,
    category: "Latency",
  },
];

export function ChallengeView({
  scenarios,
  activeRun,
  pastRuns,
  architecture,
  isRunning,
  onRunScenario,
  onSelectPastRun,
}: ChallengeViewProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    activeRun?.scenario_id || "database_unavailable"
  );

  const result = activeRun?.result;

  const handleSelectAndRun = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    onRunScenario(scenarioId);
  };

  const getSeverityVariant = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return "danger" as const;
      case "medium":
        return "warning" as const;
      default:
        return "info" as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <SectionHeader
          title="Challenge Your Architecture"
          description="Explore how your architecture behaves when something fails. Inject realistic chaos failure conditions and evaluate failure cascade propagation."
          actions={
            pastRuns.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-sans">Run History:</span>
                <select
                  value={activeRun?.id || ""}
                  onChange={(e) => {
                    const found = pastRuns.find((r) => r.id === e.target.value);
                    if (found) {
                      setSelectedScenarioId(found.scenario_id);
                      onSelectPastRun(found);
                    }
                  }}
                  className="text-xs font-sans bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {pastRuns.map((r, i) => {
                    const card = SCENARIO_CARDS.find((c) => c.id === r.scenario_id);
                    return (
                      <option key={r.id} value={r.id}>
                        {card?.title || r.scenario_id} (Run #{pastRuns.length - i})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : undefined
          }
        />

        {/* 7 Scenario Product Cards Grid */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-tight">
            Select a Chaos Injection Scenario:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SCENARIO_CARDS.map((scenario) => {
              const Icon = scenario.icon;
              const isSelected = selectedScenarioId === scenario.id;
              const hasRunBefore = pastRuns.some((r) => r.scenario_id === scenario.id);

              return (
                <div
                  key={scenario.id}
                  onClick={() => !isRunning && handleSelectAndRun(scenario.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 flex flex-col justify-between ${
                    isSelected && activeRun?.scenario_id === scenario.id
                      ? "bg-slate-50 border-indigo-600 ring-1 ring-indigo-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  } ${isRunning ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 font-sans">
                          {scenario.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-sans">
                        {scenario.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-sans leading-relaxed">
                      {scenario.subtitle}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {hasRunBefore ? "Evaluated" : "Not tested"}
                    </span>
                    <button
                      type="button"
                      disabled={isRunning}
                      className={`font-semibold inline-flex items-center gap-1 ${
                        isSelected ? "text-indigo-700" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Simulate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading State when running simulation */}
      {isRunning && (
        <div className="bg-white border border-indigo-200 rounded-xl p-8 text-center space-y-3 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
          <h3 className="text-sm font-bold font-sans text-slate-900">
            Simulating Chaos Fault Injection...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Evaluating failure propagation cascades, testing component boundaries, and generating recovery mitigations.
          </p>
        </div>
      )}

      {/* Results View */}
      {!isRunning && result && (
        <div className="space-y-5">
          {/* Scenario & Impact Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <StatusBadge variant={getSeverityVariant(result.impact?.severity)} size="lg">
                  {result.impact?.severity?.toUpperCase()} IMPACT
                </StatusBadge>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  {result.scenario?.name || "Simulation Result"}
                </h3>
              </div>
              <div className="text-xs text-slate-500 font-sans">
                Blast Radius: <strong className="text-slate-700">{result.impact?.blast_radius}</strong>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              {result.impact?.summary}
            </p>

            {/* Direct Affected Components */}
            {result.affected_components?.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <span className="text-[11px] font-semibold uppercase text-slate-600 block">
                  Directly Affected Components:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.affected_components.map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs font-sans font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2-Column Split: Left (Cascade & Safeguards) vs Right (Gaps & Mitigation) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Failure Propagation Chain */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Failure Propagation Cascade</span>
                </h4>
                <div className="space-y-2">
                  {result.failure_propagation?.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 flex items-start gap-2.5"
                    >
                      <span className="font-bold text-rose-600 shrink-0 font-sans">
                        {idx + 1}.
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Safeguards */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Current Architecture Safeguards</span>
                </h4>
                <div className="space-y-2">
                  {result.existing_safeguards?.map((guard, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-lg text-xs font-sans text-emerald-950 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{guard}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Identified Gaps */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Identified Gaps & Vulnerabilities</span>
                </h4>
                <div className="space-y-2">
                  {result.identified_gaps?.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-rose-50/50 border border-rose-200/80 rounded-lg text-xs font-sans text-rose-950 flex items-start gap-2"
                    >
                      <span className="text-rose-600 font-bold shrink-0">•</span>
                      <span className="leading-relaxed">{gap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation & Recovery Strategy */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mitigation Playbook & Recovery</span>
                </h4>
                <div className="space-y-2 text-xs font-sans">
                  {result.mitigations?.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    >
                      <span className="font-semibold text-indigo-700 block mb-0.5">
                        Mitigation Action {idx + 1}:
                      </span>
                      <span className="leading-relaxed">{m}</span>
                    </div>
                  ))}

                  {result.recovery_strategy && (
                    <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-indigo-950">
                      <span className="font-bold block mb-1">
                        Recovery Plan:
                      </span>
                      <span className="leading-relaxed">{result.recovery_strategy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Changes Required */}
          {result.architecture_changes && result.architecture_changes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-700" />
                <span>Permanent Architecture Changes Recommended</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {result.architecture_changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 flex items-start gap-2"
                  >
                    <span className="font-bold text-indigo-600 shrink-0">{idx + 1}.</span>
                    <span>{change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
