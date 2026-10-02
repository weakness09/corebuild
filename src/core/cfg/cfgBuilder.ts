import { Instruction } from '../parser/types.js';
import { ControlFlowGraph } from './types.js';
import { findLeaders } from './leader.js';
import { buildBasicBlocks } from './blockBuilder.js';
import { buildCFGEdges } from './edgeBuilder.js';
import { computeDominators } from '../analysis/dominators.js';
import { detectNaturalLoops } from '../analysis/loops.js';
import { identifyDeadBlocks } from '../analysis/deadCode.js';

export function buildCFG(
  instructions: Instruction[],
  options?: {
    functionId?: string;
    knownFunctionEntries?: Set<number>;
  }
): ControlFlowGraph {
  if (instructions.length === 0) {
    return {
      id: `cfg_${options?.functionId || 'empty'}`,
      functionId: options?.functionId,
      entryBlockId: '',
      blocks: {},
      edges: [],
      naturalLoops: [],
    };
  }

  // 1. Find Leaders
  const leaders = findLeaders(instructions, options?.knownFunctionEntries);

  // 2. Build Basic Blocks
  const rawBlocks = buildBasicBlocks(instructions, leaders, options?.functionId);
  const entryBlockId = rawBlocks[0].id;

  // 3. Build Edges & Detect Indirect Jumps
  const { edges: rawEdges, syntheticBlocks } = buildCFGEdges(rawBlocks, instructions);
  const allBlocks = [...rawBlocks, ...syntheticBlocks];

  // 4. Compute Dominators
  const domInfo = computeDominators(allBlocks, rawEdges, entryBlockId);

  // 5. Detect Natural Loops and back-edges
  const { naturalLoops, updatedEdges, updatedBlocks: loopBlocks } = detectNaturalLoops(
    allBlocks,
    rawEdges,
    domInfo
  );

  // 6. Identify Dead (Unreachable) Blocks
  const finalBlocks = identifyDeadBlocks(loopBlocks, updatedEdges, entryBlockId);

  // Convert array to record
  const blockRecord: Record<string, typeof finalBlocks[0]> = {};
  for (const b of finalBlocks) {
    blockRecord[b.id] = b;
  }

  return {
    id: `cfg_${options?.functionId || finalBlocks[0].startAddress.toString(16)}`,
    functionId: options?.functionId,
    entryBlockId,
    blocks: blockRecord,
    edges: updatedEdges,
    naturalLoops,
  };
}
