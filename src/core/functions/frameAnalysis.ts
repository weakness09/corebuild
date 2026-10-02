import { Instruction } from '../parser/types.js';
import { StackVariable, ArgumentCandidate } from './types.js';
import { getRegisterInfo, SYSTEM_V_ARG_FAMILIES } from '../parser/registers.js';

export function analyzeStackAndArguments(instructions: Instruction[]): {
  frameSize?: number;
  redZoneSize?: number;
  isLeaf?: boolean;
  stackVariables: StackVariable[];
  argumentCandidates: ArgumentCandidate[];
} {
  let frameSize: number | undefined;
  let minNegativeDisp = 0;
  const stackVarMap = new Map<number, StackVariable>();
  const argCandidateMap = new Map<string, ArgumentCandidate>();

  // Track registers written before read
  const writtenFamilies = new Set<string>();

  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];

    // 1. Frame size detection (look in the first 8 instructions for sub rsp, imm)
    if (i < 8 && !frameSize) {
      if (inst.mnemonic === 'sub' && inst.operands.length === 2) {
        const dst = inst.operands[0];
        const src = inst.operands[1];
        if (dst.kind === 'reg' && dst.name === 'rsp' && src.kind === 'imm') {
          frameSize = Number(src.value);
        }
      }
    }

    // 2. Stack variable and Red Zone offset detection: [rbp - disp] or [rsp - disp]
    for (const op of inst.operands) {
      if (op.kind === 'mem' && op.disp !== undefined && op.disp < 0) {
        if (op.base === 'rsp' || op.base === 'rbp') {
          if (op.disp < minNegativeDisp) {
            minNegativeDisp = op.disp;
          }
        }
        if (op.base === 'rbp') {
          const absOffset = Math.abs(op.disp);
          if (!stackVarMap.has(absOffset)) {
            stackVarMap.set(absOffset, {
              offset: absOffset,
              name: `var_${absOffset.toString(16)}`,
              size: op.size,
            });
          }
        }
      }
    }

    // 3. System V ABI Argument candidate detection
    // In System V, args are in rdi, rsi, rdx, rcx, r8, r9
    // If instruction reads an arg register before it is clobbered:
    for (let opIdx = 0; opIdx < inst.operands.length; opIdx++) {
      const op = inst.operands[opIdx];
      let regName: string | undefined;

      if (op.kind === 'reg') {
        regName = op.name;
      } else if (op.kind === 'mem' && op.base) {
        regName = op.base;
      }

      if (regName) {
        const regInfo = getRegisterInfo(regName);
        if (regInfo) {
          const family = regInfo.family;
          const argFamilyIdx = SYSTEM_V_ARG_FAMILIES.indexOf(family as any);

          if (argFamilyIdx !== -1 && !writtenFamilies.has(family)) {
            // Is it being read?
            // In 2-operand instructions like mov dst, src: opIdx 0 is dst, opIdx 1 is src.
            // If it's opIdx 1, it's definitely read.
            // If it's cmp, test, add, sub, push, even opIdx 0 is read!
            const isRead =
              opIdx > 0 ||
              inst.category === 'COMPARE' ||
              inst.category === 'ARITH' ||
              inst.category === 'LOGIC' ||
              inst.category === 'STACK' ||
              op.kind === 'mem';

            if (isRead && !argCandidateMap.has(family)) {
              argCandidateMap.set(family, {
                reg: regInfo.name,
                family,
                argIndex: argFamilyIdx + 1,
                suggestedName: `arg${argFamilyIdx + 1}`,
              });
            }
          }
        }
      }
    }

    // Mark destination register as written if it's a simple MOV instruction
    if (inst.mnemonic === 'mov' && inst.operands.length >= 1) {
      const dst = inst.operands[0];
      if (dst.kind === 'reg') {
        const rInfo = getRegisterInfo(dst.name);
        if (rInfo) {
          writtenFamilies.add(rInfo.family);
        }
      }
    }
  }

  // Sort argument candidates by argument index
  const argumentCandidates = Array.from(argCandidateMap.values()).sort(
    (a, b) => a.argIndex - b.argIndex
  );

  // Sort stack variables by offset
  const stackVariables = Array.from(stackVarMap.values()).sort((a, b) => a.offset - b.offset);

  // A leaf function contains no CALL or INDIRECT_CALL instructions
  const isLeaf = !instructions.some(
    inst => inst.category === 'CALL' || inst.category === 'INDIRECT_CALL'
  );
  const redZoneSize = minNegativeDisp < 0 ? Math.abs(minNegativeDisp) : 0;

  return {
    frameSize,
    redZoneSize,
    isLeaf,
    stackVariables,
    argumentCandidates,
  };
}
