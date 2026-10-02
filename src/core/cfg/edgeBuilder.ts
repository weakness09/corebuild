import { BasicBlock, CFGEdge } from './types.js';
import { Instruction } from '../parser/types.js';
import { isNoReturnFunction, isTerminatingMnemonic } from '../parser/noreturn.js';
import { interpretCondition } from '../analysis/conditionInterpreter.js';
import { resolveSwitchTable } from './switchResolver.js';

let edgeCounter = 0;
function nextEdgeId(): string {
  edgeCounter += 1;
  return `edge_${edgeCounter}`;
}

export function resetEdgeCounter(): void {
  edgeCounter = 0;
}

export function buildCFGEdges(
  blocks: BasicBlock[],
  allInstructions?: Instruction[]
): { edges: CFGEdge[]; syntheticBlocks: BasicBlock[] } {
  resetEdgeCounter();
  const edges: CFGEdge[] = [];
  const syntheticBlocks: BasicBlock[] = [];

  // Map starting address to block ID
  const addrToBlockId = new Map<number, string>();
  for (const b of blocks) {
    addrToBlockId.set(b.startAddress, b.id);
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];
    const instCount = block.instructions.length;
    const lastInst = block.instructions[instCount - 1];

    if (!lastInst) continue;

    // 1. Return or Terminator -> No outgoing edges
    if (lastInst.category === 'RET' || isTerminatingMnemonic(lastInst.mnemonic)) {
      continue;
    }

    // 2. Call to noreturn function -> No outgoing edges
    if (lastInst.category === 'CALL') {
      const firstOp = lastInst.operands[0];
      const targetName = firstOp?.kind === 'label' ? firstOp.name : undefined;
      if (isNoReturnFunction(targetName)) {
        continue;
      }
    }

    // 3. Conditional Jump -> jump_taken AND jump_not_taken with conditionDescription
    if (lastInst.category === 'COND_JUMP') {
      const prevInst = instCount >= 2 ? block.instructions[instCount - 2] : undefined;
      const minAddr = blocks.length > 0 ? blocks[0].startAddress : 0;
      const maxAddr = blocks.length > 0 ? blocks[blocks.length - 1].endAddress : 0;
      const cond = interpretCondition(lastInst, prevInst, {
        functionRange: { start: minAddr, end: maxAddr },
        blockInstructions: block.instructions,
      });

      // Taken branch
      if (lastInst.targetAddress !== undefined) {
        const targetBlockId = addrToBlockId.get(lastInst.targetAddress);
        if (targetBlockId) {
          edges.push({
            id: nextEdgeId(),
            fromBlockId: block.id,
            toBlockId: targetBlockId,
            type: 'jump_taken',
            conditionDescription: cond?.shortTaken || 'doğru',
            fullCondition: cond?.summary,
          });
        }
      }

      // Not taken branch (fallthrough to next sequential block)
      if (nextBlock) {
        edges.push({
          id: nextEdgeId(),
          fromBlockId: block.id,
          toBlockId: nextBlock.id,
          type: 'jump_not_taken',
          conditionDescription: cond?.shortNotTaken || 'değil',
          fullCondition: cond?.summary,
        });
      }
      continue;
    }

    // 4. Unconditional Jump -> unconditional to target block
    if (lastInst.category === 'UNCOND_JUMP') {
      if (lastInst.targetAddress !== undefined) {
        const targetBlockId = addrToBlockId.get(lastInst.targetAddress);
        if (targetBlockId) {
          edges.push({
            id: nextEdgeId(),
            fromBlockId: block.id,
            toBlockId: targetBlockId,
            type: 'unconditional',
            conditionDescription: 'Doğrudan atlama',
          });
        }
      }
      continue;
    }

    // 5. Indirect Jump -> resolve switch or create unresolved indirect node
    if (lastInst.category === 'INDIRECT_JUMP') {
      const instList = allInstructions || block.instructions;
      const switchMatch = resolveSwitchTable(instList, lastInst.address);

      if (lastInst.targetAddress !== undefined && addrToBlockId.has(lastInst.targetAddress)) {
        edges.push({
          id: nextEdgeId(),
          fromBlockId: block.id,
          toBlockId: addrToBlockId.get(lastInst.targetAddress)!,
          type: 'indirect',
          conditionDescription: 'Endirekt atlama',
        });
      } else {
        // Create an unresolved indirect block
        const unresId = `unresolved_indirect_${lastInst.address.toString(16)}`;
        if (!syntheticBlocks.some(sb => sb.id === unresId)) {
          syntheticBlocks.push({
            id: unresId,
            functionId: block.functionId,
            startAddress: lastInst.address,
            endAddress: lastInst.address,
            instructions: [],
            isEntry: false,
            isExit: true,
          });
        }

        const desc = switchMatch.isSwitch
          ? `Switch (${switchMatch.maxCases ?? 0} case)`
          : 'Çözümlenemeyen endirekt atlama (Unresolved Indirect)';

        edges.push({
          id: nextEdgeId(),
          fromBlockId: block.id,
          toBlockId: unresId,
          type: 'indirect',
          conditionDescription: desc,
        });
      }
      continue;
    }

    // 6. Normal Fallthrough to next block
    if (nextBlock) {
      edges.push({
        id: nextEdgeId(),
        fromBlockId: block.id,
        toBlockId: nextBlock.id,
        type: 'fallthrough',
        conditionDescription: 'Ardışık akış (fallthrough)',
      });
    }
  }

  return { edges, syntheticBlocks };
}
