import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { CallGraphNode } from './CallGraphNode.js';
import { CustomCFGEdge } from './CustomEdges.js';
import { getLayoutedElements } from './layout.js';
import { CallGraphNode as CallNode } from '../../../core/functions/types.js';

const nodeTypes = {
  callNode: CallGraphNode,
};

const edgeTypes = {
  cfgEdge: CustomCFGEdge,
};

const getCallGraphMiniMapNodeColor = (node: Node) => {
  const fn = (node.data as any)?.node as CallNode | undefined;
  if (!fn) return '#6366f1';
  if (fn.isRecursive) return '#db2777';
  if (fn.isLeaf) return '#059669';
  return '#7c3aed';
};

const getCallGraphMiniMapNodeStrokeColor = (node: Node) => {
  const fn = (node.data as any)?.node as CallNode | undefined;
  if (!fn) return '#818cf8';
  if (fn.isRecursive) return '#f472b6';
  if (fn.isLeaf) return '#34d399';
  return '#a78bfa';
};

export const CallGraphView: React.FC = () => {
  const { callGraph, selectedFunctionId, selectFunction, setActiveTab } = useAnalysisStore();

  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (!callGraph) return { layoutedNodes: [], layoutedEdges: [] };

    const nodesList = Object.values(callGraph.nodes);

    const initialNodes: Node[] = nodesList.map(n => ({
      id: n.id,
      type: 'callNode',
      width: 240,
      height: 120,
      data: {
        node: n,
        isSelected: selectedFunctionId === n.id,
        width: 240,
        height: 120,
      },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = callGraph.edges.map(e => ({
      id: e.id,
      source: e.fromFunctionId,
      target: e.toFunctionId,
      type: 'cfgEdge',
      data: {
        type: e.isTailCall ? 'tail_call' : 'call',
        conditionDescription: e.isTailCall ? 'Tail Call' : (e.isRecursive ? 'Özyinelemeli (Recursive)' : 'Çağrı (Call)'),
        isBackEdge: e.isRecursive,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: e.isTailCall ? '#ec4899' : '#a855f7',
      },
    }));

    const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
    return { layoutedNodes: layouted.nodes, layoutedEdges: layouted.edges };
  }, [callGraph, selectedFunctionId]);

  if (!callGraph || Object.keys(callGraph.nodes).length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 font-mono text-sm">
        Görüntülenecek fonksiyon çağrı grafiği bulunamadı.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-3 py-1.5 shadow-md">
        <span className="text-xs font-mono font-bold text-zinc-200">
          Program Call Graph
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          ({Object.keys(callGraph.nodes).length} fonksiyon, {callGraph.edges.length} çağrı)
        </span>
      </div>

      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectFunction(node.id)}
        onNodeDoubleClick={(_, node) => {
          selectFunction(node.id);
          setActiveTab('cfg');
        }}
        fitView
        minZoom={0.2}
        maxZoom={2}
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#27272a" />
        <Controls
          position="bottom-left"
          className="!absolute !bottom-3 !left-3 !bg-zinc-900 !border-zinc-800 !text-zinc-300 !fill-zinc-300 !m-0 shadow-2xl z-20"
        />
        <MiniMap
          nodeColor={getCallGraphMiniMapNodeColor}
          nodeStrokeColor={getCallGraphMiniMapNodeStrokeColor}
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          maskColor="rgba(9, 9, 11, 0.75)"
          position="bottom-right"
          className="!absolute !bottom-3 !right-3 !bg-zinc-900/95 !border !border-zinc-800 !rounded-lg !m-0 shadow-2xl z-20 overflow-hidden"
          style={{ width: 180, height: 120 }}
        />
      </ReactFlow>
    </div>
  );
};
