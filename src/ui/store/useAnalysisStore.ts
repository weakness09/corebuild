import { create } from 'zustand';
import { parseAssembly } from '../../core/parser/parser.js';
import { detectFunctions } from '../../core/functions/detector.js';
import { buildCallGraph } from '../../core/functions/callGraph.js';
import { ParsedProgram } from '../../core/parser/types.js';
import { FunctionInfo, CallGraph } from '../../core/functions/types.js';

export interface AnalysisState {
  rawText: string;
  parsedProgram: ParsedProgram | null;
  functions: FunctionInfo[];
  callGraph: CallGraph | null;
  selectedFunctionId: string | null;
  selectedBlockId: string | null;
  selectedAddress: number | null;
  activeTab: 'cfg' | 'callGraph';
  theme: 'dark' | 'light';
  collapsedBlocks: Set<string>;
  userLabels: Record<string, string>; // key -> label name (e.g. "0x1139" -> "main_handler", "var_4" -> "counter")

  // Actions
  setRawText: (text: string) => void;
  selectFunction: (funcId: string | null) => void;
  selectBlock: (blockId: string | null) => void;
  selectAddress: (addr: number | null) => void;
  setActiveTab: (tab: 'cfg' | 'callGraph') => void;
  toggleBlockCollapse: (blockId: string) => void;
  toggleTheme: () => void;
  setUserLabel: (key: string, name: string) => void;
  removeUserLabel: (key: string) => void;
}

const DEFAULT_SAMPLE_ASM = `0000000000001139 <main>:
    1139:	f3 0f 1e fa          	endbr64 
    113d:	55                   	push   rbp
    113e:	48 89 e5             	mov    rbp,rsp
    1141:	48 83 ec 10          	sub    rsp,0x10
    1145:	c7 45 fc 05 00 00 00 	mov    DWORD PTR [rbp-0x4],0x5
    114c:	83 7d fc 00          	cmp    DWORD PTR [rbp-0x4],0x0
    1150:	7e 0a                	jle    115c <main+0x23>
    1152:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    1155:	89 c7                	mov    edi,eax
    1157:	e8 e4 fe ff ff       	call   1040 <fact>
    115c:	b8 00 00 00 00       	mov    eax,0x0
    1161:	c9                   	leave  
    1162:	c3                   	ret    

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
`;

function analyzeInput(rawText: string) {
  if (!rawText.trim()) {
    return {
      parsedProgram: null,
      functions: [],
      callGraph: null,
      selectedFunctionId: null,
    };
  }
  const parsedProgram = parseAssembly(rawText);
  const rawFunctions = detectFunctions(parsedProgram);
  const { callGraph, updatedFunctions } = buildCallGraph(rawFunctions);

  return {
    parsedProgram,
    functions: updatedFunctions,
    callGraph,
    selectedFunctionId: updatedFunctions.length > 0 ? updatedFunctions[0].id : null,
  };
}

const initialAnalysis = analyzeInput(DEFAULT_SAMPLE_ASM);

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  rawText: DEFAULT_SAMPLE_ASM,
  parsedProgram: initialAnalysis.parsedProgram,
  functions: initialAnalysis.functions,
  callGraph: initialAnalysis.callGraph,
  selectedFunctionId: initialAnalysis.selectedFunctionId,
  selectedBlockId: null,
  selectedAddress: null,
  activeTab: 'cfg',
  theme: 'dark',
  collapsedBlocks: new Set<string>(),
  userLabels: {},

  setRawText: (text: string) => {
    const analysis = analyzeInput(text);
    set({
      rawText: text,
      parsedProgram: analysis.parsedProgram,
      functions: analysis.functions,
      callGraph: analysis.callGraph,
      selectedFunctionId: analysis.selectedFunctionId,
      selectedBlockId: null,
      selectedAddress: null,
    });
  },

  selectFunction: (funcId: string | null) => {
    set({ selectedFunctionId: funcId, selectedBlockId: null });
  },

  selectBlock: (blockId: string | null) => {
    const { functions, selectedFunctionId } = get();
    const currFunc = functions.find(f => f.id === selectedFunctionId);
    let blockAddr: number | null = null;
    if (currFunc && blockId && currFunc.cfg.blocks[blockId]) {
      blockAddr = currFunc.cfg.blocks[blockId].startAddress;
    }
    set({ selectedBlockId: blockId, selectedAddress: blockAddr });
  },

  selectAddress: (addr: number | null) => {
    if (addr === null) {
      set({ selectedAddress: null });
      return;
    }

    const { functions, selectedFunctionId } = get();
    // Check if address belongs to current function
    let targetFunc = functions.find(f => f.id === selectedFunctionId);
    if (!targetFunc || addr < targetFunc.startAddress || addr > targetFunc.endAddress) {
      targetFunc = functions.find(f => addr >= f.startAddress && addr <= f.endAddress);
    }

    if (targetFunc) {
      // Find block containing address
      const matchingBlock = Object.values(targetFunc.cfg.blocks).find(
        b => addr >= b.startAddress && addr <= b.endAddress
      );

      set({
        selectedFunctionId: targetFunc.id,
        selectedBlockId: matchingBlock ? matchingBlock.id : null,
        selectedAddress: addr,
      });
    } else {
      set({ selectedAddress: addr });
    }
  },

  setActiveTab: (tab: 'cfg' | 'callGraph') => {
    set({ activeTab: tab });
  },

  toggleBlockCollapse: (blockId: string) => {
    const collapsed = new Set(get().collapsedBlocks);
    if (collapsed.has(blockId)) {
      collapsed.delete(blockId);
    } else {
      collapsed.add(blockId);
    }
    set({ collapsedBlocks: collapsed });
  },

  toggleTheme: () => {
    set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
  },

  setUserLabel: (key: string, name: string) => {
    set(state => ({
      userLabels: { ...state.userLabels, [key]: name },
    }));
  },

  removeUserLabel: (key: string) => {
    set(state => {
      const nextLabels = { ...state.userLabels };
      delete nextLabels[key];
      return { userLabels: nextLabels };
    });
  },
}));
