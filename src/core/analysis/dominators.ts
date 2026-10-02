import { BasicBlock, CFGEdge } from '../cfg/types.js';

export interface DominanceInfo {
  // blockId -> set of blockIds that dominate it
  dom: Map<string, Set<string>>;
  // blockId -> immediate dominator blockId
  idom: Map<string, string>;
  // blockId -> set of predecessor blockIds
  preds: Map<string, string[]>;
  // blockId -> set of successor blockIds
  succs: Map<string, string[]>;
}

export function computeDominators(
  blocks: BasicBlock[],
  edges: CFGEdge[],
  entryBlockId: string
): DominanceInfo {
  const blockIds = blocks.map(b => b.id);
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();

  for (const id of blockIds) {
    preds.set(id, []);
    succs.set(id, []);
  }

  for (const edge of edges) {
    if (preds.has(edge.toBlockId)) {
      preds.get(edge.toBlockId)!.push(edge.fromBlockId);
    }
    if (succs.has(edge.fromBlockId)) {
      succs.get(edge.fromBlockId)!.push(edge.toBlockId);
    }
  }

  // Iterative Dominator Algorithm:
  // Dom(entry) = { entry }
  // Dom(n) = { n } U (intersection of Dom(p) for all p in preds(n))
  const dom = new Map<string, Set<string>>();

  // Initialize
  dom.set(entryBlockId, new Set([entryBlockId]));
  for (const id of blockIds) {
    if (id !== entryBlockId) {
      dom.set(id, new Set(blockIds));
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of blockIds) {
      if (id === entryBlockId) continue;

      const pList = preds.get(id) || [];
      let newDom: Set<string>;

      if (pList.length === 0) {
        newDom = new Set([id]);
      } else {
        // Intersect dominators of all predecessors
        const firstPredDom = dom.get(pList[0]) || new Set<string>();
        newDom = new Set(firstPredDom);

        for (let i = 1; i < pList.length; i++) {
          const pDom = dom.get(pList[i]) || new Set<string>();
          for (const d of Array.from(newDom)) {
            if (!pDom.has(d)) {
              newDom.delete(d);
            }
          }
        }
        newDom.add(id);
      }

      const currentDom = dom.get(id)!;
      if (newDom.size !== currentDom.size || Array.from(newDom).some(d => !currentDom.has(d))) {
        dom.set(id, newDom);
        changed = true;
      }
    }
  }

  // Compute Immediate Dominators (idom)
  // idom(n) is the unique strict dominator d of n such that d does not dominate any other strict dominator of n
  const idom = new Map<string, string>();
  for (const id of blockIds) {
    if (id === entryBlockId) continue;
    const dominators = Array.from(dom.get(id) || []).filter(d => d !== id);

    let immDom: string | undefined;
    for (const d of dominators) {
      // Check if d dominates all other strict dominators of id
      const dDoms = dom.get(d) || new Set();
      const isCloser = dominators.every(other => other === d || !dDoms.has(other));
      if (isCloser) {
        immDom = d;
        break;
      }
    }
    if (immDom) {
      idom.set(id, immDom);
    }
  }

  return { dom, idom, preds, succs };
}
