import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useAnalysisStore } from '../../store/useAnalysisStore.js';
import { AssemblyEditor } from '../editor/AssemblyEditor.js';
import { CFGView } from '../graph/CFGView.js';
import { CallGraphView } from '../graph/CallGraphView.js';
import { NodeDetailsPanel } from '../details/NodeDetailsPanel.js';
import { ExportMenu } from '../export/ExportMenu.js';
import {
  Network,
  GitGraph,
  Sun,
  Moon,
  Boxes,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    setRawText,
  } = useAnalysisStore();

  const [leftWidth, setLeftWidth] = React.useState(360);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(220, Math.min(800, e.clientX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleLoadExample = (exampleType: string) => {
    switch (exampleType) {
      case 'sum':
        setRawText(`0000000000001129 <sum>:
    1129:	f3 0f 1e fa          	endbr64 
    112d:	55                   	push   rbp
    112e:	48 89 e5             	mov    rbp,rsp
    1131:	89 7d ec             	mov    DWORD PTR [rbp-0x14],edi
    1134:	c7 45 f8 00 00 00 00 	mov    DWORD PTR [rbp-0x8],0x0
    113b:	c7 45 fc 00 00 00 00 	mov    DWORD PTR [rbp-0x4],0x0
    1142:	eb 0a                	jmp    114e <sum+0x25>
    1144:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    1147:	01 45 f8             	add    DWORD PTR [rbp-0x8],eax
    114a:	83 45 fc 01          	add    DWORD PTR [rbp-0x4],0x1
    114e:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    1151:	3b 45 ec             	cmp    eax,DWORD PTR [rbp-0x14]
    1154:	7c ee                	jl     1144 <sum+0x1b>
    1156:	8b 45 f8             	mov    eax,DWORD PTR [rbp-0x8]
    1159:	5d                   	pop    rbp
    115a:	c3                   	ret    `);
        break;
      case 'loop':
        setRawText(`loop_fn:
	pushq	%rbp
	movq	%rsp, %rbp
	movl	$0, -4(%rbp)
.L2:
	cmpl	$9, -4(%rbp)
	jg	.L3
	addl	$1, -4(%rbp)
	jmp	.L2
.L3:
	movl	-4(%rbp), %eax
	popq	%rbp
	ret`);
        break;
      case 'fact':
        setRawText(`0000000000001000 <main>:
    1000:	55                   	push   rbp
    1001:	48 89 e5             	mov    rbp,rsp
    1004:	48 83 ec 10          	sub    rsp,0x10
    1008:	bf 05 00 00 00       	mov    edi,0x5
    100d:	e8 2e 00 00 00       	call   1040 <fact>
    1012:	89 45 fc             	mov    DWORD PTR [rbp-0x4],eax
    1015:	e9 56 00 00 00       	jmp    1070 <tail_helper>

0000000000001040 <fact>:
    1040:	55                   	push   rbp
    1041:	48 89 e5             	mov    rbp,rsp
    1044:	48 83 ec 10          	sub    rsp,0x10
    1048:	89 7d fc             	mov    DWORD PTR [rbp-0x4],edi
    104b:	83 7d fc 01          	cmp    DWORD PTR [rbp-0x4],0x1
    104f:	7f 07                	jg     1058 <fact+0x18>
    1051:	b8 01 00 00 00       	mov    eax,0x1
    1056:	eb 12                	jmp    106a <fact+0x2a>
    1058:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    105b:	83 e8 01             	sub    eax,0x1
    105e:	89 c7                	mov    edi,eax
    1060:	e8 db ff ff ff       	call   1040 <fact>
    1065:	0f af 45 fc          	imul   eax,DWORD PTR [rbp-0x4]
    106a:	c9                   	leave  
    106b:	c3                   	ret    

0000000000001070 <tail_helper>:
    1070:	55                   	push   rbp
    1071:	48 89 e5             	mov    rbp,rsp
    1074:	31 c0                	xor    eax,eax
    1076:	5d                   	pop    rbp
    1077:	c3                   	ret    `);
        break;
      case 'switch':
        setRawText(`0000000000001200 <switch_demo>:
    1200: 55                      push rbp
    1201: 48 89 e5                mov rbp, rsp
    1204: 83 ff 03                cmp edi, 3
    1207: 77 15                   ja 121e <default_case>
    1209: 48 8d 15 00 20 00 00    lea rdx, [rip+0x2000]
    1210: 48 63 ff                movsxd rdi, edi
    1213: ff 24 fa                jmp QWORD PTR [rdx+rdi*8]
    121e: b8 ff ff ff ff          mov eax, 0xffffffff
    1223: c9                      leave
    1224: c3                      ret`);
        break;
    }
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
      {/* Top Application Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-800 select-none z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Boxes size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white font-mono">
              CodeRebuild
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            x86-64 Workbench
          </span>
        </div>

        {/* Center Tabs: CFG vs Call Graph */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('cfg')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'cfg'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitGraph size={14} />
            <span>Kontrol Akış Grafiği (CFG)</span>
          </button>

          <button
            onClick={() => setActiveTab('callGraph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'callGraph'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Network size={14} />
            <span>Çağrı Grafiği (Call Graph)</span>
          </button>
        </div>

        {/* Right Actions: Examples, Export, Theme */}
        <div className="flex items-center gap-2">
          {/* Quick Examples */}
          <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Örnek:</span>
            <button
              onClick={() => handleLoadExample('sum')}
              className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Test 1: sum (For döngüsü)"
            >
              Test 1 (sum)
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => handleLoadExample('loop')}
              className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Test 2: AT&T sözdizimi döngüsü"
            >
              Test 2 (AT&T)
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => handleLoadExample('fact')}
              className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Test 3: Call Graph, tail call ve özyineleme"
            >
              Test 3 (Call Graph)
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => handleLoadExample('switch')}
              className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Switch jump table"
            >
              Switch
            </button>
          </div>

          {/* Export Menu */}
          <ExportMenu />

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            title="Tema Değiştir"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* 3-Pane Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Assembly Editor (Resizable) */}
        <div style={{ width: `${leftWidth}px` }} className="h-full flex-shrink-0">
          <AssemblyEditor />
        </div>

        {/* Resizer Divider */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={`w-1 hover:w-1.5 bg-zinc-800 hover:bg-indigo-500 cursor-col-resize transition-all z-20 flex-shrink-0 select-none ${
            isResizing ? 'bg-indigo-500 w-1.5' : ''
          }`}
          title="Panel genişliğini ayarlamak için sürükleyin"
        />

        {/* Center Pane: Graph Canvas */}
        <div className="flex-1 h-full relative overflow-hidden bg-zinc-950">
          <ReactFlowProvider>
            {activeTab === 'cfg' ? <CFGView /> : <CallGraphView />}
          </ReactFlowProvider>
        </div>

        {/* Right Pane: Node & Condition Details (320px) */}
        <div className="w-80 min-w-[280px] max-w-[480px] h-full flex-shrink-0">
          <NodeDetailsPanel />
        </div>
      </main>
    </div>
  );
};
