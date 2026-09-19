"use client";

import React, { useState } from "react";
import {
  C4Diagram,
  C4LevelData,
  C4Node,
  C4Relationship,
} from "@/lib/api";
import {
  Layers,
  Server,
  User,
  Shield,
  Database,
  Radio,
  Globe,
  Terminal,
  Lock,
  Box,
  Zap,
  ArrowRight,
  Copy,
  Check,
  Code2,
  Eye,
  Info,
  ExternalLink,
} from "lucide-react";

interface C4VisualizerProps {
  c4Diagram: C4Diagram;
  projectName?: string;
}

export function C4Visualizer({ c4Diagram, projectName }: C4VisualizerProps) {
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(2);
  const [viewFormat, setViewFormat] = useState<"interactive" | "mermaid">("interactive");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  const getActiveLevelData = (): { data: C4LevelData; mermaid: string } => {
    switch (activeLevel) {
      case 1:
        return { data: c4Diagram.level_1_context, mermaid: c4Diagram.mermaid_context };
      case 2:
        return { data: c4Diagram.level_2_container, mermaid: c4Diagram.mermaid_container };
      case 3:
        return { data: c4Diagram.level_3_component, mermaid: c4Diagram.mermaid_component };
    }
  };

  const { data: currentLevelData, mermaid: currentMermaid } = getActiveLevelData();

  // Find currently selected node for the inspector
  const selectedNode = currentLevelData.nodes.find((n) => n.id === selectedNodeId) || currentLevelData.nodes[0] || null;

  // Find relationships for selected node
  const incomingRelationships = currentLevelData.relationships.filter((r) => r.target === selectedNode?.id);
  const outgoingRelationships = currentLevelData.relationships.filter((r) => r.source === selectedNode?.id);

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(currentMermaid);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  // Icon helper
  const getNodeIcon = (type: string, iconKey?: string | null) => {
    switch (type) {
      case "person":
        return <User className="w-5 h-5 text-sky-400" />;
      case "system":
        return <Globe className="w-5 h-5 text-purple-400" />;
      case "gateway":
        return <Shield className="w-5 h-5 text-amber-400" />;
      case "queue":
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case "database":
        return <Database className="w-5 h-5 text-emerald-400" />;
      case "component":
        if (iconKey === "lock") return <Lock className="w-5 h-5 text-rose-400" />;
        if (iconKey === "terminal") return <Terminal className="w-5 h-5 text-indigo-400" />;
        return <Box className="w-5 h-5 text-indigo-400" />;
      default:
        return <Server className="w-5 h-5 text-indigo-400" />;
    }
  };

  // Security zone badge helper
  const getSecurityZoneBadge = (zone?: string | null) => {
    switch (zone) {
      case "public":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 border border-sky-800/60 text-sky-300">
            Public Zone
          </span>
        );
      case "dmz":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 border border-amber-800/60 text-amber-300">
            DMZ Ingress
          </span>
        );
      case "vpc_private":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
            Private VPC
          </span>
        );
      case "secure_persistence":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
            Encrypted Persistence
          </span>
        );
      case "third_party":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 border border-purple-800/60 text-purple-300">
            External 3rd-Party
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Visualizer Level Selector & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-100/70 border border-surface-50">
        {/* Level Tabs */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-2">
          <button
            onClick={() => {
              setActiveLevel(1);
              setSelectedNodeId(null);
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeLevel === 1
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              1
            </span>
            <span>System Context</span>
          </button>

          <button
            onClick={() => {
              setActiveLevel(2);
              setSelectedNodeId(null);
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeLevel === 2
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Container Topology</span>
          </button>

          <button
            onClick={() => {
              setActiveLevel(3);
              setSelectedNodeId(null);
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeLevel === 3
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Component Deep-Dive</span>
          </button>
        </div>

        {/* Interactive vs Mermaid Switcher */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewFormat("interactive")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              viewFormat === "interactive"
                ? "bg-surface-300 text-white border border-surface-50"
                : "bg-surface-200/60 text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual Graph</span>
          </button>

          <button
            onClick={() => setViewFormat("mermaid")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              viewFormat === "mermaid"
                ? "bg-surface-300 text-white border border-surface-50"
                : "bg-surface-200/60 text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Mermaid C4</span>
          </button>
        </div>
      </div>

      {/* Level Description Banner */}
      <div className="p-3.5 rounded-xl bg-surface-100/40 border border-surface-50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold font-mono text-white flex items-center space-x-2">
            <span>{currentLevelData.title}</span>
            <span className="text-slate-500 font-normal">|</span>
            <span className="text-[11px] text-slate-400 font-sans font-normal">
              {currentLevelData.description}
            </span>
          </h3>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <span>{currentLevelData.nodes.length} Nodes</span>
          <span>•</span>
          <span>{currentLevelData.relationships.length} Links</span>
        </div>
      </div>

      {viewFormat === "mermaid" ? (
        /* Mermaid Code Tab */
        <div className="relative">
          <pre className="p-5 rounded-2xl bg-surface-300/90 border border-surface-50 text-xs font-mono text-cyan-300 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
            {currentMermaid}
          </pre>
          <button
            onClick={handleCopyMermaid}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 border border-surface-50 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-all shadow-lg"
          >
            {copiedMermaid ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Mermaid</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Mermaid</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Interactive Architecture Grid with Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Nodes Canvas */}
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentLevelData.nodes.map((node) => {
                const isSelected = (selectedNodeId || currentLevelData.nodes[0]?.id) === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none space-y-3 relative overflow-hidden ${
                      isSelected
                        ? "bg-surface-200/90 border-indigo-500 shadow-xl shadow-indigo-950/30 scale-[1.01]"
                        : "bg-surface-100/60 border-surface-50 hover:bg-surface-100 hover:border-slate-700"
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400" />
                    )}

                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-lg bg-surface-300 border border-surface-50 flex items-center justify-center flex-shrink-0">
                          {getNodeIcon(node.type, node.icon)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-mono leading-snug">
                            {node.label}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            [{node.type}]
                          </span>
                        </div>
                      </div>

                      {getSecurityZoneBadge(node.security_zone)}
                    </div>

                    {node.technology && (
                      <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-800/30">
                        {node.technology}
                      </div>
                    )}

                    <p className="text-xs text-slate-400 line-clamp-2 font-sans">
                      {node.description}
                    </p>

                    {/* Quick Link Count Footer */}
                    <div className="pt-2 border-t border-surface-50/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Click to inspect</span>
                      <span className="text-indigo-400">View I/O Routes →</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Architecture Connections Table */}
            <div className="p-4 rounded-xl bg-surface-100/40 border border-surface-50 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>Inter-Node Communication Channels & Protocols</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {currentLevelData.relationships.map((rel, rIdx) => {
                  const srcNode = currentLevelData.nodes.find((n) => n.id === rel.source);
                  const tgtNode = currentLevelData.nodes.find((n) => n.id === rel.target);

                  return (
                    <div
                      key={rIdx}
                      className="p-2.5 rounded-lg bg-surface-200/50 border border-surface-50 text-xs flex items-center justify-between space-x-2 font-mono"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-slate-200 font-bold truncate">
                          {srcNode?.label || rel.source}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-indigo-300 font-bold truncate">
                          {tgtNode?.label || rel.target}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                          {rel.protocol}
                        </span>
                        {rel.is_async && (
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

          {/* Node Inspector Sidebar (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            {selectedNode ? (
              <div className="p-5 rounded-2xl bg-surface-200/90 border border-indigo-500/40 shadow-2xl space-y-5 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-surface-50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-300 border border-surface-50 flex items-center justify-center">
                      {getNodeIcon(selectedNode.type, selectedNode.icon)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        {selectedNode.label}
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-300 uppercase">
                        Topology Inspector
                      </span>
                    </div>
                  </div>
                  {getSecurityZoneBadge(selectedNode.security_zone)}
                </div>

                {/* Technology Spec */}
                {selectedNode.technology && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Technology Implementation
                    </span>
                    <div className="p-2 rounded-lg bg-surface-300/80 border border-surface-50 text-xs font-mono text-cyan-300 font-semibold">
                      {selectedNode.technology}
                    </div>
                  </div>
                )}

                {/* Responsibilities */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Responsibilities & Capabilities
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-surface-100/50 p-3 rounded-lg border border-surface-50/60">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Incoming Connections */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Inbound Ingress ({incomingRelationships.length})</span>
                  </span>
                  {incomingRelationships.length === 0 ? (
                    <div className="text-[11px] text-slate-500 font-mono italic">
                      No direct upstream callers.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {incomingRelationships.map((inc, iIdx) => {
                        const caller = currentLevelData.nodes.find((n) => n.id === inc.source);
                        return (
                          <div
                            key={iIdx}
                            className="p-2 rounded bg-surface-100/70 border border-surface-50 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200 font-mono">
                                {caller?.label || inc.source}
                              </span>
                              <span className="text-[9px] font-mono text-cyan-400">
                                {inc.protocol}
                              </span>
                            </div>
                            {inc.description && (
                              <p className="text-[10px] text-slate-400 font-sans">
                                {inc.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Outgoing Connections */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Outbound Egress ({outgoingRelationships.length})</span>
                  </span>
                  {outgoingRelationships.length === 0 ? (
                    <div className="text-[11px] text-slate-500 font-mono italic">
                      No downstream egress dependencies.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {outgoingRelationships.map((outg, oIdx) => {
                        const target = currentLevelData.nodes.find((n) => n.id === outg.target);
                        return (
                          <div
                            key={oIdx}
                            className="p-2 rounded bg-surface-100/70 border border-surface-50 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-300 font-mono">
                                {target?.label || outg.target}
                              </span>
                              <span className="text-[9px] font-mono text-cyan-400">
                                {outg.protocol}
                              </span>
                            </div>
                            {outg.description && (
                              <p className="text-[10px] text-slate-400 font-sans">
                                {outg.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-surface-200/50 border border-surface-50 text-center text-xs text-slate-500 font-mono">
                Click any node in the canvas to inspect its protocols, technologies, and I/O connections.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
