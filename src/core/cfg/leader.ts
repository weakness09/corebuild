import { Instruction } from '../parser/types.js';
import { isNoReturnFunction, isTerminatingMnemonic } from '../parser/noreturn.js';

export function findLeaders(
  instructions: Instruction[],
  knownFunctionEntries: Set<number> = new Set()
): number[] {
  if (instructions.length === 0) return [];

  const leaderSet = new Set<number>();
  const validAddresses = new Set<number>(instructions.map(i => i.address));

  // 1. The first instruction is always a leader
  leaderSet.add(instructions[0].address);

  // 2. Known function entries are leaders
  for (const entryAddr of knownFunctionEntries) {
    if (validAddresses.has(entryAddr)) {
      leaderSet.add(entryAddr);
    }
  }

  for (let idx = 0; idx < instructions.length; idx++) {
    const inst = instructions[idx];
    const nextInst = instructions[idx + 1];

    // Jump targets and next instructions are leaders
    if (
      inst.category === 'COND_JUMP' ||
      inst.category === 'UNCOND_JUMP' ||
      inst.category === 'INDIRECT_JUMP'
    ) {
      if (inst.targetAddress !== undefined && validAddresses.has(inst.targetAddress)) {
        leaderSet.add(inst.targetAddress);
      }
      // Any instruction following a jump is a leader
      if (nextInst) {
        leaderSet.add(nextInst.address);
      }
    }

    // Terminators (ret, hlt, ud2): the next instruction is a leader
    if (inst.category === 'RET' || isTerminatingMnemonic(inst.mnemonic)) {
      if (nextInst) {
        leaderSet.add(nextInst.address);
      }
    }

    // Call to noreturn function: next instruction is a leader
    if (inst.category === 'CALL') {
      const firstOp = inst.operands[0];
      const targetName = firstOp?.kind === 'label' ? firstOp.name : undefined;
      if (isNoReturnFunction(targetName)) {
        if (nextInst) {
          leaderSet.add(nextInst.address);
        }
      }
    }
  }

  // Sort leaders in ascending order by address
  return Array.from(leaderSet).sort((a, b) => a - b);
}
