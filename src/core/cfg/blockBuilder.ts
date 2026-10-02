import { Instruction } from '../parser/types.js';
import { BasicBlock } from './types.js';
import { isNoReturnFunction, isTerminatingMnemonic } from '../parser/noreturn.js';

export function buildBasicBlocks(
  instructions: Instruction[],
  leaders: number[],
  functionId?: string
): BasicBlock[] {
  if (instructions.length === 0 || leaders.length === 0) return [];

  const leaderSet = new Set<number>(leaders);
  const blocks: BasicBlock[] = [];

  let currentBlockInsts: Instruction[] = [];
  let currentStartAddr = instructions[0].address;

  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];

    // If this instruction is a leader and we already have accumulated instructions, seal previous block
    if (leaderSet.has(inst.address) && currentBlockInsts.length > 0) {
      const lastInst = currentBlockInsts[currentBlockInsts.length - 1];
      const isExit = checkIsExitBlock(lastInst);

      blocks.push({
        id: `block_${currentStartAddr.toString(16)}`,
        functionId,
        startAddress: currentStartAddr,
        endAddress: lastInst.address,
        instructions: currentBlockInsts,
        isEntry: blocks.length === 0,
        isExit,
      });

      currentBlockInsts = [];
      currentStartAddr = inst.address;
    }

    currentBlockInsts.push(inst);
  }

  // Final block
  if (currentBlockInsts.length > 0) {
    const lastInst = currentBlockInsts[currentBlockInsts.length - 1];
    const isExit = checkIsExitBlock(lastInst);

    blocks.push({
      id: `block_${currentStartAddr.toString(16)}`,
      functionId,
      startAddress: currentStartAddr,
      endAddress: lastInst.address,
      instructions: currentBlockInsts,
      isEntry: blocks.length === 0,
      isExit,
    });
  }

  return blocks;
}

function checkIsExitBlock(lastInst: Instruction): boolean {
  if (lastInst.category === 'RET' || isTerminatingMnemonic(lastInst.mnemonic)) {
    return true;
  }
  if (lastInst.category === 'CALL') {
    const firstOp = lastInst.operands[0];
    const targetName = firstOp?.kind === 'label' ? firstOp.name : undefined;
    if (isNoReturnFunction(targetName)) {
      return true;
    }
  }
  return false;
}
