"use client";

import React, { useState } from "react";
import {
  ArchitectureComponent,
  ArchitectureConnection,
  SecurityBoundary,
} from "@/lib/api";
import {
  Server,
  Database,
  Radio,
  Shield,
  Layers,
  Globe,
  Zap,
  Lock,
  Terminal,
  Box,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCcw,
  ArrowRight,
  Filter,
  CheckCircle2,
} from "lucide-react";

interface ArchitectureGraphProps {
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
  securityBoundaries: SecurityBoundary[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

export function ArchitectureGraph({
  components,
  connections,
  securityBoundaries,
  selectedComponentId,
  onSelectComponent,
}: ArchitectureGraphProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const categories = Array.from(new Set(components.map((c) => c.category)));
  const zones = Array.from(new Set(components.map((c) => c.security_zone)));

  const filteredComponents = components.filter((comp) => {
    const matchCat = selectedCategory === "all" || comp.category === selectedCategory;
    const matchZone = selectedZone === "all" || comp.security_zone === selectedZone;
    return matchCat && matchZone;
  });

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const getComponentIcon = (category: string) => {
    switch (category) {
      case "database":
        return <Database className="w-5 h-5 text-emerald-400" />;
      case "cache":
        return <Zap className="w-5 h-5 text-amber-400" />;
      case "queue":
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case "gateway":
        return <Shield className="w-5 h-5 text-sky-400" />;
      case "ui":
        return <Globe className="w-5 h-5 text-purple-400" />;
      case "external":
        return <Box className="w-5 h-5 text-slate-400" />;
      default:
        return <Server className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getZoneBorderColor = (zone: string) => {
    switch (zone) {
      case "public":
        return "border-sky-500/50 bg-sky-950/20";
      case "dmz":
        return "border-amber-500/50 bg-amber-950/20";
      case "vpc_private":
        return "border-indigo-500/50 bg-indigo-950/20";
      case "secure_persistence":
        return "border-emerald-500/50 bg-emerald-950/20";
      case "third_party":
        return "border-purple-500/50 bg-purple-950/20";
      default:
        return "border-slate-700 bg-surface-100/40";
    }
  };

  return (
    <div className="space-y-4">
      {/* Graph Toolbar: Zoom & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-100/80 border border-surface-50">
        {/* Category & Zone Filter Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center space-x-1 text-xs font-mono text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filter:</span>
          </div>

          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedZone("all");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedCategory === "all" && selectedZone === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            All ({components.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm font-bold"
                  : "bg-surface-200 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Zoom & Canvas Actions */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <span className="text-xs font-mono text-slate-400 mr-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 border border-surface-50 text-slate-300 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 border border-surface-50 text-slate-300 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 border border-surface-50 text-slate-300 hover:text-white transition-all"
            title="Reset Zoom"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Graph Canvas */}
      <div className="relative rounded-2xl bg-surface-300/60 border border-surface-50 p-6 overflow-hidden min-h-[420px] shadow-inner">
        {/* Background architectural grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Scalable Container */}
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            transition: "transform 0.2s ease-out",
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredComponents.map((comp) => {
            const isSelected = selectedComponentId === comp.id;
            const relatedIncoming = connections.filter((c) => c.target === comp.id);
            const relatedOutgoing = connections.filter((c) => c.source === comp.id);

            return (
              <div
                key={comp.id}
                onClick={() => onSelectComponent(comp.id)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none space-y-3 relative ${getZoneBorderColor(
                  comp.security_zone
                )} ${
                  isSelected
                    ? "ring-2 ring-indigo-400 shadow-2xl scale-[1.02] bg-surface-200"
                    : "hover:bg-surface-200/90 hover:scale-[1.01]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-300 border border-surface-50 flex items-center justify-center flex-shrink-0">
                      {getComponentIcon(comp.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono leading-tight">
                        {comp.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {comp.type}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-surface-300 text-slate-300 border border-surface-50">
                    {comp.security_zone.replace("_", " ")}
                  </span>
                </div>

                {/* Technology pill */}
                <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40 truncate">
                  {comp.technology}
                </div>

                {/* Purpose */}
                <p className="text-xs text-slate-300 line-clamp-2 font-sans leading-relaxed">
                  {comp.purpose}
                </p>

                {/* Connection footer */}
                <div className="pt-2 border-t border-surface-50/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>
                    {relatedIncoming.length} In / {relatedOutgoing.length} Out
                  </span>
                  <span className="text-indigo-400 font-bold">
                    {isSelected ? "Selected ✓" : "Inspect →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol Connections List */}
      <div className="p-4 rounded-xl bg-surface-100/60 border border-surface-50 space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Architecture Data Flows & Protocol Interfaces</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {connections.map((conn, idx) => {
            const srcComp = components.find((c) => c.id === conn.source);
            const tgtComp = components.find((c) => c.id === conn.target);

            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-surface-200/50 border border-surface-50 text-xs flex items-center justify-between space-x-2 font-mono"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-slate-200 font-bold truncate">
                    {srcComp?.name || conn.source}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="text-indigo-300 font-bold truncate">
                    {tgtComp?.name || conn.target}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                    {conn.protocol}
                  </span>
                  {conn.is_async && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">
                      Async
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
