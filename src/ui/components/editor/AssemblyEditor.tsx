import React, { useRef, useState } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { formatOperandForDisplay } from '../../../core/analysis/conditionInterpreter.js';
import { Upload, AlertCircle, FileCode, Play, ListFilter, Binary } from 'lucide-react';

export const AssemblyEditor: React.FC = () => {
  const {
    rawText,
    setRawText,
    parsedProgram,
    selectedAddress,
    selectAddress,
    functions,
    selectedFunctionId,
    selectFunction,
    userLabels,
  } = useAnalysisStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showBytes, setShowBytes] = useState(false);
  const [editorText, setEditorText] = useState(rawText);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFunc = functions.find(f => f.id === selectedFunctionId);

  const formatOptions = {
    userLabels,
    functionRange: currentFunc ? { start: currentFunc.startAddress, end: currentFunc.endAddress } : undefined,
    functionName: currentFunc?.name,
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setEditorText(content);
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyText = () => {
    setRawText(editorText);
    setIsEditing(false);
  };

  const getCategoryClass = (category?: string) => {
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
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-300">
      {/* Top Header / Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 gap-2 whitespace-nowrap select-none">
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          <FileCode size={15} className="text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-zinc-200">Assembly</span>
          {parsedProgram && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 flex-shrink-0 font-medium"
              title={`${parsedProgram.instructions.length} komut`}
            >
              {parsedProgram.instructions.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isEditing && (
            <button
              onClick={() => setShowBytes(!showBytes)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
                showBytes
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
              }`}
              title="Hex bayt sütununu göster/gizle"
            >
              <Binary size={12} />
              <span>Bayt</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".s,.asm,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            title="Dosya yükle (.s, .asm, .txt)"
          >
            <Upload size={12} />
            <span>Yükle</span>
          </button>

          <button
            onClick={() => {
              if (isEditing) {
                handleApplyText();
              } else {
                setEditorText(rawText);
                setIsEditing(true);
              }
            }}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-medium transition-colors ${
              isEditing
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
          >
            {isEditing ? (
              <>
                <Play size={12} />
                <span>Analiz</span>
              </>
            ) : (
              <span>Düzenle</span>
            )}
          </button>
        </div>
      </div>

      {/* Function Filter Selector */}
      {functions.length > 0 && !isEditing && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/40 border-b border-zinc-800/80 text-xs">
          <ListFilter size={13} className="text-zinc-500" />
          <span className="text-zinc-500 text-[11px]">Fonksiyon:</span>
          <select
            value={selectedFunctionId || ''}
            onChange={(e) => selectFunction(e.target.value || null)}
            className="bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-0.5 outline-none focus:border-indigo-500 flex-1 truncate"
          >
            {functions.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} (0x{f.startAddress.toString(16)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warnings Bar */}
      {parsedProgram && parsedProgram.warnings.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px]">
          <AlertCircle size={13} />
          <span>{parsedProgram.warnings.length} satırda uyarı veya bozuk komut var.</span>
        </div>
      )}

      {/* Editor or Line-by-Line Viewer */}
      <div className="flex-1 overflow-x-auto overflow-y-auto font-mono text-xs select-text">
        {isEditing ? (
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            placeholder="Buraya objdump, GDB, Intel veya AT&T assembly yapıştırın..."
            className="w-full h-full p-3 bg-zinc-950 text-zinc-200 resize-none outline-none font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="divide-y divide-zinc-800/20 py-1 min-w-full inline-block">
            {parsedProgram ? (
              parsedProgram.instructions.map((inst, idx) => {
                const isSelected = selectedAddress === inst.address;
                return (
                  <div
                    key={inst.id}
                    onClick={() => selectAddress(inst.address)}
                    className={`flex items-baseline px-2 py-0.5 cursor-pointer transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-indigo-600/30 text-white font-bold ring-1 ring-inset ring-indigo-500'
                        : 'hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    {/* Line Number */}
                    <span className="w-8 text-right pr-2 text-zinc-600 select-none text-[10px] flex-shrink-0">
                      {idx + 1}
                    </span>

                    {/* Address Column */}
                    <span className="w-16 text-right pr-3 text-zinc-500 select-none text-[10px] flex-shrink-0 font-mono">
                      0x{inst.address.toString(16)}:
                    </span>

                    {/* Optional Hex Bytes Column */}
                    {showBytes && (
                      <span className="w-28 text-left pr-3 text-zinc-500 select-all text-[10px] flex-shrink-0 font-mono truncate">
                        {inst.bytes || ''}
                      </span>
                    )}

                    {/* Mnemonic & Operands */}
                    {inst.mnemonic ? (
                      <div className="flex items-baseline gap-2 flex-shrink-0 pr-4">
                        <span className={`w-14 flex-shrink-0 font-mono ${getCategoryClass(inst.category)}`}>
                          {inst.mnemonic}
                        </span>
                        <span className="font-mono text-zinc-200">
                          {inst.operands
                            .map(op => formatOperandForDisplay(op, formatOptions))
                            .join(', ')}
                        </span>
                        {inst.comment && (
                          <span className="text-zinc-500 italic text-[11px] font-mono select-text">
                            ; {inst.comment}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono whitespace-pre flex-shrink-0 pr-4 text-zinc-400">
                        {inst.raw.replace(/^[0-9a-fA-F]+:\s*/, '')}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-zinc-500 italic">
                Assembly komutu bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
