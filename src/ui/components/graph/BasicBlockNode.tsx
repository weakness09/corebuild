import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { BasicBlock } from '../../../core/cfg/types.js';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { formatOperandForDisplay } from '../../../core/analysis/conditionInterpreter.js';
import { ChevronDown, ChevronRight, RotateCw, Skull } from 'lucide-react';

interface BasicBlockNodeProps {
  data: {
    block: BasicBlock;
    isSelected: boolean;
  };
}

export const BasicBlockNode: React.FC<BasicBlockNodeProps> = ({ data }) => {
  const { block, isSelected } = data;
  const {
    collapsedBlocks,
    toggleBlockCollapse,
    selectedAddress,
    selectAddress,
    userLabels,
    functions,
    selectedFunctionId,
  } = useAnalysisStore();

  const currentFunc = functions.find(f => f.id === selectedFunctionId);
  const isCollapsed = collapsedBlocks.has(block.id);


  const formatOptions = {
    userLabels,
    functionRange: currentFunc ? { start: currentFunc.startAddress, end: currentFunc.endAddress } : undefined,
    functionName: currentFunc?.name,
  };

  // Category color mapper for syntax highlighting
  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'COND_JUMP':
      case 'UNCOND_JUMP':
      case 'INDIRECT_JUMP':
        return 'text-amber-400 font-semibold';
      case 'CALL':
      case 'INDIRECT_CALL':
        return 'text-purple-400 font-semibold';
      case 'RET':
        return 'text-rose-400 font-semibold';
      case 'COMPARE':
        return 'text-yellow-300';
      case 'ARITH':
      case 'LOGIC':
        return 'text-sky-400';
      case 'MOVE':
        return 'text-emerald-400';
      case 'STACK':
        return 'text-orange-300';
      case 'NOP':
        return 'text-zinc-500 italic';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div
      className={`relative min-w-[280px] max-w-[420px] rounded-lg border text-xs shadow-xl transition-all duration-150 ${
        block.isDead
          ? 'opacity-40 border-zinc-700 bg-zinc-900/50'
          : isSelected
          ? 'border-indigo-500 bg-zinc-900 ring-2 ring-indigo-500/50'
          : 'border-zinc-800 bg-zinc-900/95 hover:border-zinc-700'
      }`}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ top: '-4px', left: '50%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />

      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b rounded-t-lg select-none cursor-pointer ${
          block.isEntry
            ? 'bg-blue-950/40 border-blue-900/50 text-blue-200'
            : block.isExit
            ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200'
            : block.isLoopHeader
            ? 'bg-amber-950/40 border-amber-900/50 text-amber-200'
            : 'bg-zinc-800/60 border-zinc-800 text-zinc-300'
        }`}
        onClick={() => toggleBlockCollapse(block.id)}
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-tight">
          <button className="text-zinc-400 hover:text-zinc-200">
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <span>
            0x{block.startAddress.toString(16)} - 0x{block.endAddress.toString(16)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1">
          {block.isEntry && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              ENTRY
            </span>
          )}
          {block.isExit && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              EXIT
            </span>
          )}
          {block.isLoopHeader && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <RotateCw size={9} /> LOOP
            </span>
          )}
          {block.isDead && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Skull size={9} /> DEAD
            </span>
          )}
        </div>
      </div>

      {/* Instructions Body */}
      {!isCollapsed && (
        <div className="p-2 space-y-1 font-mono text-[11px] divide-y divide-zinc-800/30">
          {block.instructions.length === 0 ? (
            <div className="text-zinc-500 italic py-1 text-center">Unresolved indirect destination</div>
          ) : (
            block.instructions.map(inst => {
              const isInstSelected = selectedAddress === inst.address;
              return (
                <div
                  key={inst.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAddress(inst.address);
                  }}
                  className={`flex items-baseline gap-2 py-0.5 px-1.5 rounded cursor-pointer transition-colors ${
                    isInstSelected
                      ? 'bg-indigo-600/30 text-white font-bold ring-1 ring-indigo-500'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-zinc-500 text-[10px] w-10 text-right select-none">
                    {inst.address.toString(16)}:
                  </span>
                  <span className={getCategoryClass(inst.category)}>
                    {inst.mnemonic}
                  </span>
                  <span className="text-zinc-300 truncate">
                    {inst.operands
                      .map(op => formatOperandForDisplay(op, formatOptions))
                      .join(', ')}
                  </span>
                  {inst.comment && (
                    <span className="text-zinc-500 text-[10px] italic truncate">
                      {inst.comment}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 text-zinc-500 text-[10px] italic text-center">
          {block.instructions.length} komut gizlendi
        </div>
      )}

      {/* Right Handles for Loops / Back Edges */}
      <Handle
        id="back-target"
        type="target"
        position={Position.Right}
        style={{ right: '-4px', top: '50%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />
      <Handle
        id="back-source"
        type="source"
        position={Position.Right}
        style={{ right: '-4px', top: '50%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />

      {/* Outgoing Bottom Handles */}
      <Handle
        id="left"
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', left: '25%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', left: '75%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />
      <Handle
        id="default"
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', left: '50%', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />

      {/* Backward-compatibility aliases for legacy taken/not-taken handles */}
      <Handle
        id="taken"
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', left: '25%', opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="not-taken"
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', left: '75%', opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
};
