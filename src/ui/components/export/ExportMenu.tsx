import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { exportCFGToDot, exportCallGraphToDot } from '../../../core/export/dotExport.js';
import { serializeJsonWithBigInt } from '../../../core/utils/json.js';
import { computeSha256, exportLabelsToJson } from '../../../core/labels/storage.js';
import { toPng, toSvg } from 'html-to-image';
import { Download, FileText, Image, ChevronDown } from 'lucide-react';

export const ExportMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { functions, selectedFunctionId, callGraph, activeTab, rawText, userLabels } = useAnalysisStore();

  const currentFunc = functions.find(f => f.id === selectedFunctionId) || functions[0];

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDOT = () => {
    if (activeTab === 'cfg' && currentFunc) {
      const dot = exportCFGToDot(currentFunc.cfg, currentFunc.name);
      downloadFile(dot, `${currentFunc.name}_cfg.dot`, 'text/vnd.graphviz');
    } else if (activeTab === 'callGraph' && callGraph) {
      const dot = exportCallGraphToDot(callGraph);
      downloadFile(dot, `callgraph.dot`, 'text/vnd.graphviz');
    }
    setIsOpen(false);
  };

  const handleExportJSON = async () => {
    const sha = await computeSha256(rawText);
    const labelList = Object.entries(userLabels).map(([key, name], idx) => ({
      id: `lbl_${idx + 1}`,
      target: 'address' as const,
      key,
      name,
    }));

    const bundleData = {
      sha256: sha,
      functions,
      callGraph,
      labels: labelList,
      exportedAt: new Date().toISOString(),
    };

    const json = serializeJsonWithBigInt(bundleData);
    downloadFile(json, `coderebuild_analysis.json`, 'application/json');
    setIsOpen(false);
  };

  const handleExportLabelsOnly = async () => {
    const sha = await computeSha256(rawText);
    const labelList = Object.entries(userLabels).map(([key, name], idx) => ({
      id: `lbl_${idx + 1}`,
      target: 'address' as const,
      key,
      name,
    }));
    const json = exportLabelsToJson(sha, labelList);
    downloadFile(json, `coderebuild_labels.json`, 'application/json');
    setIsOpen(false);
  };

  const handleExportImage = async (format: 'png' | 'svg') => {
    const flowElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!flowElement) return;

    try {
      if (format === 'png') {
        const dataUrl = await toPng(flowElement, { backgroundColor: '#09090b' });
        const link = document.createElement('a');
        link.download = `coderebuild_${activeTab}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const dataUrl = await toSvg(flowElement, { backgroundColor: '#09090b' });
        const link = document.createElement('a');
        link.download = `coderebuild_${activeTab}.svg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Image export failed:', err);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
      >
        <Download size={13} className="text-indigo-400" />
        <span>Dışa Aktar</span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl py-1 text-xs z-40">
            <div className="px-3 py-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              Görsel Çıktı
            </div>
            <button
              onClick={() => handleExportImage('png')}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-200"
            >
              <Image size={14} className="text-emerald-400" />
              <span>PNG Görüntüsü</span>
            </button>
            <button
              onClick={() => handleExportImage('svg')}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-200"
            >
              <Image size={14} className="text-sky-400" />
              <span>SVG Vektörel Çizim</span>
            </button>

            <div className="border-t border-zinc-800 my-1" />
            <div className="px-3 py-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              Grafik & Veri
            </div>
            <button
              onClick={handleExportDOT}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-200"
            >
              <FileText size={14} className="text-amber-400" />
              <span>Graphviz DOT (.dot)</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-200"
            >
              <FileText size={14} className="text-purple-400" />
              <span>Tam Analiz JSON (BigInt)</span>
            </button>
            <button
              onClick={handleExportLabelsOnly}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-200"
            >
              <FileText size={14} className="text-indigo-400" />
              <span>Etiketler (JSON)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
