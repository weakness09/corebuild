import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { BasicBlockNode } from './BasicBlockNode.js';
import { CustomCFGEdge } from './CustomEdges.js';
import { getLayoutedElements } from './layout.js';
import { BasicBlock } from '../../../core/cfg/types.js';
import { Maximize2 } from 'lucide-react';

const nodeTypes = {
  basicBlock: BasicBlockNode,
};

const edgeTypes = {
  cfgEdge: CustomCFGEdge,
};

const getMiniMapNodeColor = (node: Node) => {
  const block = (node.data as any)?.block as BasicBlock | undefined;
  if (!block) return '#4f46e5';
  if (block.isDead) return '#3f3f46';
  if (block.isEntry) return '#2563eb';
  if (block.isExit) return '#059669';
  if (block.isLoopHeader) return '#d97706';
  return '#4f46e5';
};

const getMiniMapNodeStrokeColor = (node: Node) => {
  const block = (node.data as any)?.block as BasicBlock | undefined;
  if (!block) return '#818cf8';
  if (block.isDead) return '#71717a';
  if (block.isEntry) return '#60a5fa';
  if (block.isExit) return '#34d399';
  if (block.isLoopHeader) return '#fbbf24';
  return '#818cf8';
};

export const CFGView: React.FC = () => {
  const {
    functions,
    selectedFunctionId,
    selectedBlockId,
    selectBlock,
    collapsedBlocks,
  } = useAnalysisStore();

  const reactFlowInstance = useReactFlow();

  const currentFunc = useMemo(() => {
    return functions.find(f => f.id === selectedFunctionId) || functions[0];
  }, [functions, selectedFunctionId]);

  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (!currentFunc) return { layoutedNodes: [], layoutedEdges: [] };

    const blocks = Object.values(currentFunc.cfg.blocks);

    const initialNodes: Node[] = blocks.map(b => {
      const isSelected = selectedBlockId === b.id;
      const isCollapsed = collapsedBlocks.has(b.id);
      const estHeight = isCollapsed ? 50 : 40 + b.instructions.length * 24;

      return {
        id: b.id,
        type: 'basicBlock',
        width: 320,
        height: estHeight,
        data: {
          block: b,
          isSelected,
          width: 320,
          height: estHeight,
        },
        position: { x: 0, y: 0 },
      };
    });

    const initialEdges: Edge[] = currentFunc.cfg.edges.map(e => ({
      id: e.id,
      source: e.fromBlockId,
      target: e.toBlockId,
      type: 'cfgEdge',
      data: {
        type: e.type,
        conditionDescription: e.conditionDescription,
        isBackEdge: e.isBackEdge,
      },
    }));

    const layouted = getLayoutedElements(initialNodes, initialEdges, 'TB');
    const nodes = layouted.nodes;

    // Calculate maximum X of the graph for outer back-edge routing
    const maxGraphX = Math.max(
      ...nodes.map(n => n.position.x + (n.width ?? 320)),
      400
    );

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Map back-edge indices for separate routing tracks
    const backEdges = currentFunc.cfg.edges.filter(e => e.isBackEdge);
    const backEdgeIndexMap = new Map<string, number>();
    backEdges.forEach((e, idx) => {
      backEdgeIndexMap.set(e.id, idx);
    });

    // Assign taken/not-taken handles dynamically based on target X coordinates
    // This ensures lines never intersect each other
    const edgeHandleMap = new Map<string, string>();
    for (const b of blocks) {
      const outgoing = currentFunc.cfg.edges.filter(e => e.fromBlockId === b.id);
      const taken = outgoing.find(e => e.type === 'jump_taken');
      const notTaken = outgoing.find(e => e.type === 'jump_not_taken');

      if (taken && notTaken) {
        const takenTarget = nodeMap.get(taken.toBlockId);
        const notTakenTarget = nodeMap.get(notTaken.toBlockId);

        if (takenTarget && notTakenTarget) {
          if (takenTarget.position.x <= notTakenTarget.position.x) {
            edgeHandleMap.set(taken.id, 'left');
            edgeHandleMap.set(notTaken.id, 'right');
          } else {
            edgeHandleMap.set(taken.id, 'right');
            edgeHandleMap.set(notTaken.id, 'left');
          }
        }
      }
    }

    const finalEdges: Edge[] = currentFunc.cfg.edges.map(e => {
      let sourceHandle = 'default';
      let targetHandle: string | undefined = undefined;

      if (e.isBackEdge) {
        sourceHandle = 'back-source';
        targetHandle = 'back-target';
      } else if (edgeHandleMap.has(e.id)) {
        sourceHandle = edgeHandleMap.get(e.id)!;
      } else if (e.type === 'jump_taken') {
        sourceHandle = 'left';
      } else if (e.type === 'jump_not_taken') {
        sourceHandle = 'right';
      }

      const backEdgeIndex = backEdgeIndexMap.get(e.id);

      return {
        id: e.id,
        source: e.fromBlockId,
        target: e.toBlockId,
        sourceHandle,
        targetHandle,
        type: 'cfgEdge',
        data: {
          type: e.type,
          conditionDescription: e.isBackEdge ? 'döngü geri kenarı' : e.conditionDescription,
          isBackEdge: e.isBackEdge,
          maxGraphX,
          backEdgeIndex,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: e.isBackEdge
            ? '#f59e0b'
            : e.type === 'jump_taken'
            ? '#22c55e'
            : e.type === 'jump_not_taken'
            ? '#ef4444'
            : e.type === 'unconditional'
            ? '#38bdf8'
            : '#71717a',
        },
      };
    });

    return { layoutedNodes: nodes, layoutedEdges: finalEdges };
  }, [currentFunc, selectedBlockId, collapsedBlocks]);

  // Center on selected block if selection changes
  useEffect(() => {
    if (selectedBlockId && reactFlowInstance) {
      const targetNode = layoutedNodes.find(n => n.id === selectedBlockId);
      if (targetNode) {
        reactFlowInstance.setCenter(
          targetNode.position.x + 160,
          targetNode.position.y + 80,
          { zoom: 1.1, duration: 400 }
        );
      }
    }
  }, [selectedBlockId, layoutedNodes, reactFlowInstance]);

  const handleCenterView = () => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
  };

  if (!currentFunc) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 font-mono text-sm">
        Görüntülenecek fonksiyon seçilmedi.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-3 py-1.5 shadow-md">
        <span className="text-xs font-mono font-bold text-zinc-200">
          {currentFunc.name}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          (0x{currentFunc.startAddress.toString(16)} - {Object.keys(currentFunc.cfg.blocks).length} blok)
        </span>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={handleCenterView}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 shadow-md transition-colors"
          title="Tümünü sığdır"
        >
          <Maximize2 size={13} />
          <span>Sığdır</span>
        </button>
      </div>

      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectBlock(node.id)}
        onPaneClick={() => selectBlock(null)}
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
          nodeColor={getMiniMapNodeColor}
          nodeStrokeColor={getMiniMapNodeStrokeColor}
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
