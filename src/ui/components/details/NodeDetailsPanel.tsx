import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { interpretCondition } from '../../../core/analysis/conditionInterpreter.js';
import { generateBlockPseudoCode } from '../../../core/analysis/pseudoCode.js';
import {
  Code2,
  GitBranch,
  Tag,
  Layers,
  Info,
  Check,
} from 'lucide-react';

export const NodeDetailsPanel: React.FC = () => {
  const {
    functions,
    selectedFunctionId,
    selectedBlockId,
    selectBlock,
    userLabels,
    setUserLabel,
  } = useAnalysisStore();

  const [labelKeyInput, setLabelKeyInput] = useState('');
  const [labelNameInput, setLabelNameInput] = useState('');

  const currentFunc = functions.find(f => f.id === selectedFunctionId);
  const currentBlock = currentFunc && selectedBlockId ? currentFunc.cfg.blocks[selectedBlockId] : null;

  // Compute incoming and outgoing edges for the current block
  const incomingEdges = currentFunc && currentBlock
    ? currentFunc.cfg.edges.filter(e => e.toBlockId === currentBlock.id)
    : [];

  const outgoingEdges = currentFunc && currentBlock
    ? currentFunc.cfg.edges.filter(e => e.fromBlockId === currentBlock.id)
    : [];

  const formatOptions = React.useMemo(() => ({
    userLabels,
    functionRange: currentFunc ? { start: currentFunc.startAddress, end: currentFunc.endAddress } : undefined,
    functionName: currentFunc?.name,
    blockInstructions: currentBlock?.instructions,
  }), [userLabels, currentFunc, currentBlock]);

  // Condition interpretation for the last jump in this block
  const conditionInfo = React.useMemo(() => {
    if (!currentBlock || currentBlock.instructions.length === 0) return undefined;
    const insts = currentBlock.instructions;
    const last = insts[insts.length - 1];
    if (last.category === 'COND_JUMP') {
      const prev = insts.length >= 2 ? insts[insts.length - 2] : undefined;
      return interpretCondition(last, prev, formatOptions);
    }
    return undefined;
  }, [currentBlock, formatOptions]);

  // Block pseudo code
  const pseudoCode = React.useMemo(() => {
    if (!currentBlock) return [];
    return generateBlockPseudoCode(currentBlock, formatOptions);
  }, [currentBlock, formatOptions]);

  const handleSaveLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (labelKeyInput.trim() && labelNameInput.trim()) {
      setUserLabel(labelKeyInput.trim(), labelNameInput.trim());
      setLabelKeyInput('');
      setLabelNameInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-300 overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80">
        <Info size={16} className="text-indigo-400" />
        <span className="text-xs font-semibold text-zinc-200">Blok & Analiz Detayları</span>
      </div>

      <div className="p-3 space-y-4 text-xs font-sans">
        {/* Selected Block Info */}
        {currentBlock ? (
          <>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 font-bold">{currentBlock.id}</span>
                <span className="text-[10px] text-zinc-500">
                  {currentBlock.instructions.length} komut
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Adres: 0x{currentBlock.startAddress.toString(16)} - 0x{currentBlock.endAddress.toString(16)}</span>
                {currentFunc && (
                  <span className="text-purple-400 text-[10px] font-semibold">
                    {currentFunc.isLeaf && (!currentFunc.frameSize || currentFunc.frameSize === 0)
                      ? `Çerçeve: 0 bayt (leaf, red zone: ${currentFunc.redZoneSize || 0} bayt)`
                      : currentFunc.frameSize && currentFunc.frameSize > 0
                      ? `Çerçeve: 0x${currentFunc.frameSize.toString(16)}`
                      : 'Çerçeve: 0 bayt'}
                  </span>
                )}
              </div>
            </div>

            {/* Condition Interpretation */}
            {conditionInfo && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-[11px]">
                  <GitBranch size={13} className="text-amber-400" />
                  <span>Koşul Yorumu (Mantık Çıkarımı)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-200 font-mono text-[11px] leading-relaxed">
                  {conditionInfo.summary}
                </div>
              </div>
            )}

            {/* Pseudo-Code Summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-[11px]">
                <Code2 size={13} className="text-sky-400" />
                <span>Blok Sözde Kod (Pseudo-Code)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sky-300 font-mono text-[11px] space-y-1">
                {pseudoCode.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>

            {/* In / Out Edges */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Incoming */}
              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Gelen Kenarlar ({incomingEdges.length})</span>
                <div className="space-y-1 max-h-28 overflow-y-auto font-mono">
                  {incomingEdges.map(e => (
                    <div
                      key={e.id}
                      onClick={() => selectBlock(e.fromBlockId)}
                      className="p-1 rounded bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{e.fromBlockId}</span>
                      <span className="text-[9px] text-zinc-500">{e.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outgoing */}
              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Giden Kenarlar ({outgoingEdges.length})</span>
                <div className="space-y-1 max-h-28 overflow-y-auto font-mono">
                  {outgoingEdges.map(e => (
                    <div
                      key={e.id}
                      onClick={() => selectBlock(e.toBlockId)}
                      className="p-1 rounded bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{e.toBlockId}</span>
                      <span className="text-[9px] text-zinc-500">{e.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-zinc-500 italic">
            Detaylarını görmek için grafikten bir blok seçin.
          </div>
        )}

        {/* Function Overview & Stack Variables */}
        {currentFunc && (
          <div className="pt-3 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-[11px]">
                <Layers size={13} className="text-purple-400" />
                <span>Fonksiyon: {currentFunc.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[10px] font-bold">
                Çerçeve: {currentFunc.isLeaf && (!currentFunc.frameSize || currentFunc.frameSize === 0)
                  ? `0 bayt (leaf, red zone: ${currentFunc.redZoneSize || 0} bayt)`
                  : currentFunc.frameSize && currentFunc.frameSize > 0
                  ? `0x${currentFunc.frameSize.toString(16)} (${currentFunc.frameSize} bayt)`
                  : '0 bayt'}
              </span>
            </div>

            {/* Stack Variables */}
            {currentFunc.stackVariables.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Yığın Değişkenleri ({currentFunc.stackVariables.length})
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                  {currentFunc.stackVariables.map(v => (
                    <div
                      key={v.name}
                      className="p-1.5 rounded bg-zinc-950/70 border border-zinc-800/60 flex items-center justify-between"
                    >
                      <span className="text-zinc-200">{v.name}</span>
                      <span className="text-[10px] text-zinc-500">-[rbp-{v.offset}]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Argument Candidates */}
            {currentFunc.argumentCandidates.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Argüman Adayları (System V ABI)
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                  {currentFunc.argumentCandidates.map(a => (
                    <div
                      key={a.reg}
                      className="p-1.5 rounded bg-zinc-950/70 border border-zinc-800/60 flex items-center justify-between"
                    >
                      <span className="text-indigo-300">{a.suggestedName}</span>
                      <span className="text-[10px] text-zinc-500">({a.reg})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Annotation / Label Editor */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-[11px]">
            <Tag size={13} className="text-emerald-400" />
            <span>Hızlı Etiket Ekle</span>
          </div>

          <form onSubmit={handleSaveLabel} className="space-y-2">
            <input
              type="text"
              placeholder="Hedef (ör: 0x1139, var_4, fact)"
              value={labelKeyInput}
              onChange={(e) => setLabelKeyInput(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Etiket Adı (ör: calculate_checksum)"
              value={labelNameInput}
              onChange={(e) => setLabelNameInput(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
            >
              <Check size={13} />
              <span>Etiketi Kaydet</span>
            </button>
          </form>

          {/* Active Labels List */}
          {Object.keys(userLabels).length > 0 && (
            <div className="pt-2 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Tanımlı Etiketler
              </span>
              <div className="space-y-1 font-mono text-[11px] max-h-32 overflow-y-auto">
                {Object.entries(userLabels).map(([key, name]) => (
                  <div
                    key={key}
                    className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                  >
                    <span className="text-zinc-400 truncate">{key}</span>
                    <span className="text-emerald-400 font-bold truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
