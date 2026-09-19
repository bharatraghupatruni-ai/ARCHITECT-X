"use client";

import React, { useEffect, useState } from "react";

interface ChallengeLoadingStateProps {
  scenarioName?: string;
}

export const ChallengeLoadingState: React.FC<ChallengeLoadingStateProps> = ({
  scenarioName = "Failure Simulation",
}) => {
  const steps = [
    { text: "Injecting fault condition into architecture component graph...", delay: 0 },
    { text: "Simulating blast radius & cascading dependency failure...", delay: 800 },
    { text: "Evaluating active safeguards against ADR invariants...", delay: 1600 },
    { text: "Retrieving empirical resilience benchmarks from RAG database...", delay: 2400 },
    { text: "Synthesizing mitigation playbook and architectural hardening plan...", delay: 3200 },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="rounded-2xl border border-red-500/30 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden my-6">
      {/* Dynamic Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/25 animate-spin">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-red-500/20 text-red-300 border border-red-500/30">
              Phase 8 Simulation Active
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Failure Injection</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">
            Challenging Architecture: <span className="text-amber-300">{scenarioName}</span>
          </h3>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-300 ${
                isCurrent
                  ? "bg-red-950/40 border-red-500/40 text-white font-medium shadow-sm"
                  : isDone
                  ? "bg-slate-800/40 border-emerald-500/20 text-emerald-300/90"
                  : "bg-slate-900/30 border-slate-800/40 text-slate-500"
              }`}
            >
              {isDone && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
              )}
              {isCurrent && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold animate-pulse">
                  ●
                </span>
              )}
              {isPending && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center text-xs font-mono">
                  {idx + 1}
                </span>
              )}
              <span className="font-mono text-xs md:text-sm">{step.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
