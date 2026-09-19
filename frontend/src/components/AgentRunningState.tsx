"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Cpu, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export function AgentRunningState() {
  const [activeSeconds, setActiveSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-surface-200/95 border border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-50">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <h3 className="text-base sm:text-lg font-bold text-white font-mono">
            Executing Multi-Agent Architecture Review...
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-surface-300 px-3 py-1 rounded-full border border-surface-50">
          Elapsed: {activeSeconds}s • Concurrent Dispatch (3 Agents)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Architecture Agent */}
        <div className="bg-surface-300/80 border border-indigo-500/30 p-4 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs font-semibold">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>Architecture Agent</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Evaluating service boundaries, domain decomposition, and ACID persistence paradigms...
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-indigo-300/80 pt-1">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Formulating topology proposal</span>
          </div>
        </div>

        {/* Security Agent */}
        <div className="bg-surface-300/80 border border-emerald-500/30 p-4 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            <span>Security Agent</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Modeling zero-trust identity, OAuth2/OIDC, mTLS attestation, and data encryption at rest...
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-emerald-300/80 pt-1">
            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
            <span>Analyzing threat vectors</span>
          </div>
        </div>

        {/* Performance Agent */}
        <div className="bg-surface-300/80 border border-amber-500/30 p-4 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs font-semibold">
            <Zap className="w-4 h-4 animate-pulse" />
            <span>Performance & Reliability</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Calculating latency budgets, multi-tier caching (Redis), message queuing, and circuit breakers...
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-amber-300/80 pt-1">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Engineering bottleneck mitigations</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 font-mono text-center pt-2">
        Independent Agent Execution Rule — No agent communicates with or biases another agent.
      </p>
    </div>
  );
}
