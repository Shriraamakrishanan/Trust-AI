
import React, { useMemo } from 'react';
import { GraphData } from '../types';

interface EntityGraphProps {
  graphData: GraphData;
}

const typeConfig: { [key: string]: { legend: string; node: string } } = {
  PERSON: { legend: 'bg-blue-500 dark:bg-blue-400', node: 'stroke-blue-500 dark:stroke-blue-400' },
  ORGANIZATION: { legend: 'bg-emerald-500 dark:bg-emerald-400', node: 'stroke-emerald-500 dark:stroke-emerald-400' },
  LOCATION: { legend: 'bg-amber-500 dark:bg-amber-400', node: 'stroke-amber-500 dark:stroke-amber-400' },
  TOPIC: { legend: 'bg-purple-500 dark:bg-purple-400', node: 'stroke-purple-500 dark:stroke-purple-400' },
  DEFAULT: { legend: 'bg-slate-500 dark:bg-slate-400', node: 'stroke-slate-500 dark:stroke-slate-400' },
};


const EntityGraph: React.FC<EntityGraphProps> = ({ graphData }) => {
  const { nodes, edges } = graphData;

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    if (nodes.length === 0) return pos;

    const width = 500;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;

    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      pos.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
    return pos;
  }, [nodes]);

  const legendItems = useMemo(() => {
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types);
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="text-center text-[--text-secondary] p-4">
        No key entities were identified in this document.
      </div>
    );
  }

  return (
    <div className="p-4 bg-[--background] rounded-lg">
      <h3 className="text-lg font-semibold text-[--text-primary] mb-4 text-center">Key Entities &amp; Relationships</h3>
      <div className="flex justify-center flex-wrap gap-4 mb-4">
        {legendItems.map(type => (
          <div key={type} className="flex items-center space-x-2 text-xs text-[--text-secondary]">
            <div className={`w-3 h-3 rounded-full ${typeConfig[type]?.legend || typeConfig.DEFAULT.legend}`}></div>
            <span>{type}</span>
          </div>
        ))}
      </div>
      <div className="w-full max-w-xl mx-auto">
        <svg viewBox="0 0 500 400" className="w-full h-auto">
          <g className="edges">
            {edges.map((edge, i) => {
              const sourcePos = positions.get(edge.source);
              const targetPos = positions.get(edge.target);
              if (!sourcePos || !targetPos) return null;
              
              const midX = (sourcePos.x + targetPos.x) / 2;
              const midY = (sourcePos.y + targetPos.y) / 2;

              return (
                <g key={i}>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    className="stroke-[--border]"
                    strokeWidth="1.5"
                  />
                  <text
                    x={midX}
                    y={midY}
                    className="fill-[--text-secondary] text-[9px] font-semibold"
                    textAnchor="middle"
                    dy="-3"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
          </g>
          <g className="nodes">
            {nodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const config = typeConfig[node.type] || typeConfig.DEFAULT;

              return (
                <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle
                    r="12"
                    className={`fill-[--surface] ${config.node}`}
                    strokeWidth="2"
                  />
                  <text
                    className="fill-[--text-primary] text-[10px] font-bold"
                    textAnchor="middle"
                    dy="4"
                  >
                    {node.label.length > 5 ? node.id : node.label}
                  </text>
                  <title>{`${node.label} (${node.type})`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default EntityGraph;