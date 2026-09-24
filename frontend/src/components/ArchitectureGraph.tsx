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
  Box,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
  ArrowRight,
  Filter,
} from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

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

  const categories = Array.from(new Set(components.map((c) => c.category)));

  const filteredComponents = components.filter((comp) => {
    return selectedCategory === "all" || comp.category === selectedCategory;
  });

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const getComponentIcon = (category: string) => {
    switch (category) {
      case "database":
        return <Database className="w-4 h-4 text-emerald-600" />;
      case "cache":
        return <Zap className="w-4 h-4 text-amber-600" />;
      case "queue":
        return <Radio className="w-4 h-4 text-sky-600" />;
      case "gateway":
        return <Shield className="w-4 h-4 text-indigo-600" />;
      case "ui":
        return <Globe className="w-4 h-4 text-purple-600" />;
      case "external":
        return <Box className="w-4 h-4 text-slate-500" />;
      default:
        return <Server className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getZoneBadge = (zone: string) => {
    switch (zone) {
      case "public":
        return <StatusBadge variant="info" size="sm">Public Ingress</StatusBadge>;
      case "dmz":
        return <StatusBadge variant="warning" size="sm">DMZ / Edge</StatusBadge>;
      case "vpc_private":
        return <StatusBadge variant="default" size="sm">Private VPC</StatusBadge>;
      case "secure_persistence":
        return <StatusBadge variant="success" size="sm">ACID DB Tier</StatusBadge>;
      default:
        return <StatusBadge variant="neutral" size="sm">{zone.replace(/_/g, " ")}</StatusBadge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All ({components.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-xs font-mono text-slate-500 mr-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Reset Zoom"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Grid of Component Nodes */}
      <div className="relative rounded-xl bg-slate-50/70 border border-slate-200 p-5 overflow-hidden min-h-[360px]">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            transition: "transform 0.2s ease-out",
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
        >
          {filteredComponents.map((comp) => {
            const isSelected = selectedComponentId === comp.id;
            const relatedIncoming = connections.filter((c) => c.target === comp.id);
            const relatedOutgoing = connections.filter((c) => c.source === comp.id);

            return (
              <div
                key={comp.id}
                onClick={() => onSelectComponent(comp.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 ${
                  isSelected
                    ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                      {getComponentIcon(comp.category)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-mono leading-tight">
                        {comp.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {comp.type}
                      </span>
                    </div>
                  </div>

                  {getZoneBadge(comp.security_zone)}
                </div>

                {/* Technology pill */}
                <div className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded truncate">
                  {comp.technology}
                </div>

                {/* Purpose */}
                <p className="text-xs text-slate-600 line-clamp-2 font-sans leading-relaxed">
                  {comp.purpose}
                </p>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>
                    {relatedIncoming.length} In / {relatedOutgoing.length} Out
                  </span>
                  <span className={`font-semibold ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                    {isSelected ? "Inspecting" : "Inspect →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol Connections Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
        <h4 className="text-xs font-mono font-semibold uppercase text-slate-700 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-indigo-600" />
          <span>Inter-Service Communication Protocols ({connections.length})</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {connections.map((conn, idx) => {
            const srcComp = components.find((c) => c.id === conn.source);
            const tgtComp = components.find((c) => c.id === conn.target);

            return (
              <div
                key={idx}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-semibold text-slate-900 truncate">
                    {srcComp?.name || conn.source}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-semibold text-indigo-700 truncate">
                    {tgtComp?.name || conn.target}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-800 shrink-0">
                  {conn.protocol}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
