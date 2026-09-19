"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

const STAGES = [
  "Extracting requirements",
  "Identifying scale & volumetric metrics",
  "Classifying constraints & trade-offs",
  "Detecting ambiguities & unspecified variables",
  "Building structured specification",
];

export function AnalysisLoadingState() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface-200/90 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-xl shadow-indigo-500/5">
      <div className="flex items-center space-x-3 mb-6">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <h3 className="text-base sm:text-lg font-bold text-white font-mono">
          Analyzing Requirements...
        </h3>
      </div>

      <div className="space-y-3 font-mono text-xs sm:text-sm">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div
              key={stage}
              className={`flex items-center space-x-3 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? "bg-indigo-950/60 border border-indigo-500/40 text-indigo-200"
                  : isDone
                  ? "text-emerald-400/80 bg-surface-300/40"
                  : "text-slate-600"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-700 flex-shrink-0" />
              )}
              <span className="flex-1">{stage}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-slate-500 font-mono text-center">
        Requirement Engine v1 — Validating explicit parameters against Pydantic schema
      </p>
    </div>
  );
}
