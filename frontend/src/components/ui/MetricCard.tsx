"use client";

import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  badge,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 font-mono tracking-tight">
          {label}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
        {badge && <div>{badge}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-mono">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
