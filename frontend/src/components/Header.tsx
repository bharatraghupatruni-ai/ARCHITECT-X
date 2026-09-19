"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Layers, Activity, CheckCircle2, AlertCircle } from "lucide-react";

export function Header() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted && res.status === "ok") {
          setApiOnline(true);
        }
      })
      .catch(() => {
        if (isMounted) setApiOnline(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="border-b border-surface-50 bg-[#090D16]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div className="flex items-center space-x-4">
            <div className="w-9 h-9 rounded-lg bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light font-mono font-bold text-lg shadow-sm">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wider text-slate-100 font-mono">
                  ARCHITECT<span className="text-indigo-400">-X</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                  Phase 1
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Evidence-Grounded Multi-Agent Architecture Review
              </p>
            </div>
          </div>

          {/* Navigation Placeholders */}
          <nav className="flex items-center space-x-1 sm:space-x-4">
            <button
              type="button"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white rounded-md hover:bg-surface-100 transition-colors"
              title="Dashboard (Phase 1 Placeholder)"
            >
              Dashboard
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white rounded-md hover:bg-surface-100 transition-colors"
              title="Projects (Phase 1 Placeholder)"
            >
              Projects
            </button>

            {/* Backend Health Status Badge */}
            <div className="ml-4 pl-4 border-l border-surface-50 flex items-center space-x-2 text-xs font-mono">
              {apiOnline === null ? (
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-slate-500" />
                  <span className="hidden md:inline">Connecting...</span>
                </div>
              ) : apiOnline ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">API Online</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">API Offline</span>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
