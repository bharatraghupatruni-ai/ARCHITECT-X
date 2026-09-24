"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Cpu, ShieldCheck, Zap, Activity, Check } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

interface AgentRunningStateProps {
  elapsedSeconds?: number;
}

export function AgentRunningState({ elapsedSeconds: initialElapsed = 0 }: AgentRunningStateProps) {
  const [seconds, setSeconds] = useState(initialElapsed);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Multi-Agent Architecture Review</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Evaluating service decomposition, zero-trust security boundaries, and high-concurrency reliability independently.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1 rounded-md text-xs text-slate-600 font-sans">
          <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Elapsed: {seconds}s</span>
        </div>
      </div>

      {/* 3 Equal Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Architecture Agent */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-900 font-sans">
                  Architecture Agent
                </h3>
                <span className="text-[11px] text-slate-500 font-sans">
                  Senior Software Architect
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Formulating service boundaries, domain decomposition, and persistence topology.
          </p>

          <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs text-indigo-700 font-sans font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing system boundaries...</span>
          </div>
        </div>

        {/* Security Agent */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-900 font-sans">
                  Security Agent
                </h3>
                <span className="text-[11px] text-slate-500 font-sans">
                  Application Security Architect
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Modeling zero-trust identity, OAuth2/OIDC, mTLS attestation, and data encryption.
          </p>

          <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs text-emerald-700 font-sans font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Evaluating threat vectors...</span>
          </div>
        </div>

        {/* Performance & Reliability Agent */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-900 font-sans">
                  Performance Agent
                </h3>
                <span className="text-[11px] text-slate-500 font-sans">
                  Distributed Systems & Reliability
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Calculating P99 latency budgets, caching tiers, event streaming, and failover paths.
          </p>

          <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs text-amber-700 font-sans font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Evaluating scalability...</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 font-sans text-center">
        Independent Evaluation — No agent communicates with or biases another agent during analysis.
      </p>
    </div>
  );
}
