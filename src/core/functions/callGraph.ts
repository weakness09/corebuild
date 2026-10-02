import { FunctionInfo, CallGraph, CallGraphEdge, CallGraphNode } from './types.js';

let callEdgeCounter = 0;
function nextCallEdgeId(): string {
  callEdgeCounter += 1;
  return `call_edge_${callEdgeCounter}`;
}

export function resetCallEdgeCounter(): void {
  callEdgeCounter = 0;
}

export function buildCallGraph(functions: FunctionInfo[]): {
  callGraph: CallGraph;
  updatedFunctions: FunctionInfo[];
} {
  resetCallEdgeCounter();
  const edges: CallGraphEdge[] = [];

  // Map starting address to FunctionInfo
  const addrToFunc = new Map<number, FunctionInfo>();
  // Map symbol name to FunctionInfo
  const nameToFunc = new Map<string, FunctionInfo>();

  for (const f of functions) {
    addrToFunc.set(f.startAddress, f);
    nameToFunc.set(f.name, f);
    // Also store without plt or brackets
    nameToFunc.set(f.name.replace(/^<|>$/g, ''), f);
  }

  // Helper to find target function by address or name
  function findTargetFunction(targetAddr?: number, targetName?: string): FunctionInfo | undefined {
    if (targetAddr !== undefined && addrToFunc.has(targetAddr)) {
      return addrToFunc.get(targetAddr);
    }
    if (targetName) {
      const clean = targetName.replace(/^<|>$/g, '');
      if (nameToFunc.has(clean)) {
        return nameToFunc.get(clean);
      }
    }
    return undefined;
  }

  const callersMap = new Map<string, Set<string>>();
  const calleesMap = new Map<string, Set<string>>();
  const recursiveSet = new Set<string>();
  const tailCallSet = new Set<string>();

  for (const f of functions) {
    callersMap.set(f.id, new Set());
    calleesMap.set(f.id, new Set());
  }

  for (const f of functions) {
    for (const inst of f.instructions) {
      // 1. Regular Calls
      if (inst.category === 'CALL') {
        const firstOp = inst.operands[0];
        const targetName = firstOp?.kind === 'label' ? firstOp.name : undefined;
        const target = findTargetFunction(inst.targetAddress, targetName);

        if (target) {
          const isRecursive = f.id === target.id;
          if (isRecursive) {
            recursiveSet.add(f.id);
          }

          calleesMap.get(f.id)?.add(target.id);
          callersMap.get(target.id)?.add(f.id);

          edges.push({
            id: nextCallEdgeId(),
            fromFunctionId: f.id,
            toFunctionId: target.id,
            callAddress: inst.address,
            isRecursive,
          });
        }
      }

      // 2. Tail Calls: JMP outside the current function into another known function
      if (inst.category === 'UNCOND_JUMP' && inst.targetAddress !== undefined) {
        // If jump target is not within f's startAddress..endAddress
        if (inst.targetAddress < f.startAddress || inst.targetAddress > f.endAddress) {
          const target = findTargetFunction(inst.targetAddress);
          if (target) {
            tailCallSet.add(f.id);
            calleesMap.get(f.id)?.add(target.id);
            callersMap.get(target.id)?.add(f.id);

            edges.push({
              id: nextCallEdgeId(),
              fromFunctionId: f.id,
              toFunctionId: target.id,
              callAddress: inst.address,
              isTailCall: true,
            });
          }
        }
      }
    }
  }

  // Update functions with callers, callees, recursive and tail call status
  const updatedFunctions = functions.map(f => {
    const isRecursive = recursiveSet.has(f.id);
    const hasTailCalls = tailCallSet.has(f.id);
    return {
      ...f,
      isRecursive,
      hasTailCalls,
      callers: Array.from(callersMap.get(f.id) || []),
      callees: Array.from(calleesMap.get(f.id) || []),
    };
  });

  // Construct CallGraph nodes
  const nodes: Record<string, CallGraphNode> = {};
  for (const f of updatedFunctions) {
    nodes[f.id] = {
      id: f.id,
      name: f.name,
      address: f.startAddress,
      isRecursive: f.isRecursive,
      frameSize: f.frameSize,
      redZoneSize: f.redZoneSize,
      isLeaf: f.isLeaf ?? (f.callees.length === 0),
      instructionCount: f.instructions.length,
      blockCount: Object.keys(f.cfg.blocks).length,
    };
  }

  return {
    callGraph: { nodes, edges },
    updatedFunctions,
  };
}
