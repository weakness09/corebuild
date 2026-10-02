import { BasicBlock, CFGEdge, NaturalLoop } from '../cfg/types.js';
import { DominanceInfo } from './dominators.js';

let loopCounter = 0;
function nextLoopId(): string {
  loopCounter += 1;
  return `loop_${loopCounter}`;
}

export function resetLoopCounter(): void {
  loopCounter = 0;
}

export function detectNaturalLoops(
  blocks: BasicBlock[],
  edges: CFGEdge[],
  domInfo: DominanceInfo
): { naturalLoops: NaturalLoop[]; updatedEdges: CFGEdge[]; updatedBlocks: BasicBlock[] } {
  resetLoopCounter();
  const naturalLoops: NaturalLoop[] = [];
  const loopHeaderIds = new Set<string>();
  const blockLoopMap = new Map<string, string[]>();

  for (const b of blocks) {
    blockLoopMap.set(b.id, []);
  }

  const updatedEdges = edges.map(edge => {
    const fromDom = domInfo.dom.get(edge.fromBlockId);
    // If the target block dominates the source block, this is a back edge!
    const isBackEdge = fromDom ? fromDom.has(edge.toBlockId) : false;

    if (isBackEdge) {
      const headerId = edge.toBlockId;
      const latchId = edge.fromBlockId;
      loopHeaderIds.add(headerId);

      // Find all blocks in the natural loop
      const loopBlocks = new Set<string>([headerId, latchId]);
      const worklist: string[] = [latchId];

      while (worklist.length > 0) {
        const curr = worklist.pop()!;
        if (curr === headerId) continue;

        const preds = domInfo.preds.get(curr) || [];
        for (const pred of preds) {
          if (!loopBlocks.has(pred)) {
            loopBlocks.add(pred);
            worklist.push(pred);
          }
        }
      }

      const loopId = nextLoopId();
      const blockIdList = Array.from(loopBlocks);
      for (const bId of blockIdList) {
        blockLoopMap.get(bId)?.push(loopId);
      }

      naturalLoops.push({
        id: loopId,
        headerBlockId: headerId,
        latchBlockId: latchId,
        blockIds: blockIdList,
      });

      return {
        ...edge,
        isBackEdge: true,
        conditionDescription: 'döngü geri kenarı',
      };
    }

    return edge;
  });

  const updatedBlocks = blocks.map(block => {
    const isHeader = loopHeaderIds.has(block.id);
    const loops = blockLoopMap.get(block.id) || [];
    return {
      ...block,
      isLoopHeader: isHeader,
      loopIds: loops.length > 0 ? loops : undefined,
    };
  });

  return {
    naturalLoops,
    updatedEdges,
    updatedBlocks,
  };
}
