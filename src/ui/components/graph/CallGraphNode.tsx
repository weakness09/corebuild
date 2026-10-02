import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CallGraphNode as CallNode } from '../../../core/functions/types.js';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { Layers, RefreshCw, Cpu } from 'lucide-react';

interface CallGraphNodeProps {
  data: {
    node: CallNode;
    isSelected: boolean;
  };
}

export const CallGraphNode: React.FC<CallGraphNodeProps> = ({ data }) => {
  const { node, isSelected } = data;
  const { selectFunction, setActiveTab } = useAnalysisStore();

  const handleDoubleClick = () => {
    selectFunction(node.id);
    setActiveTab('cfg');
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`relative min-w-[220px] rounded-xl border p-3 shadow-xl transition-all duration-150 cursor-pointer select-none ${
        isSelected
          ? 'border-indigo-500 bg-zinc-900 ring-2 ring-indigo-500/50'
          : 'border-zinc-800 bg-zinc-900/95 hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: '-4px', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-100 font-mono">
            <Cpu size={15} className="text-indigo-400" />
            <span className="truncate max-w-[140px]">{node.name}</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            0x{node.address.toString(16)}
          </div>
        </div>

        {node.isRecursive && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <RefreshCw size={9} /> RECURSIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-400 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/60 font-mono">
        <div className="flex items-center gap-1">
          <Layers size={11} className="text-zinc-500" />
          <span>{node.blockCount} blok</span>
        </div>
        <div>
          <span>{node.instructionCount} komut</span>
        </div>
        {node.isLeaf && (!node.frameSize || node.frameSize === 0) ? (
          <div className="col-span-2 text-[10px] text-purple-300 font-mono">
            Çerçeve: 0 bayt (leaf, red zone: {node.redZoneSize || 0} bayt)
          </div>
        ) : node.frameSize && node.frameSize > 0 ? (
          <div className="col-span-2 text-[10px] text-zinc-400">
            Yığın: 0x{node.frameSize.toString(16)} ({node.frameSize} bayt)
          </div>
        ) : (
          <div className="col-span-2 text-[10px] text-zinc-500">
            Yığın: 0 bayt
          </div>
        )}
      </div>

      <div className="mt-2 text-[9px] text-center text-zinc-500 italic">
        Çift tıkla: CFG'ye git
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: '-4px', opacity: 0 }}
        className="!w-2 !h-2 pointer-events-none"
      />
    </div>
  );
};
