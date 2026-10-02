import { BasicBlock, CFGEdge } from '../cfg/types.js';

export function identifyDeadBlocks(
  blocks: BasicBlock[],
  edges: CFGEdge[],
  entryBlockId: string
): BasicBlock[] {
  const reachable = new Set<string>();
  const queue: string[] = [entryBlockId];
  reachable.add(entryBlockId);

  // Build adjacency list for fast lookup
  const adj = new Map<string, string[]>();
  for (const b of blocks) {
    adj.set(b.id, []);
  }
  for (const edge of edges) {
    adj.get(edge.fromBlockId)?.push(edge.toBlockId);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return blocks.map(block => ({
    ...block,
    isDead: !reachable.has(block.id),
  }));
}
