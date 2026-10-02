import { Instruction } from '../parser/types.js';

export interface SwitchPatternMatch {
  isSwitch: boolean;
  maxCases?: number;
  indexRegister?: string;
  tableBase?: string;
  defaultTarget?: number;
  targets?: number[];
  unresolved: boolean;
}

/**
 * Attempts to detect and resolve a switch jump table pattern:
 * e.g.:
 *   cmp reg, N
 *   ja default_target
 *   jmp [table + reg*8]
 */
export function resolveSwitchTable(
  instructions: Instruction[],
  jumpAddress: number
): SwitchPatternMatch {
  const indirectJumpIndex = instructions.findIndex(i => i.address === jumpAddress);
  if (indirectJumpIndex === -1) {
    return { isSwitch: false, unresolved: true };
  }

  const jumpInst = instructions[indirectJumpIndex];
  if (!jumpInst || jumpInst.category !== 'INDIRECT_JUMP') {
    return { isSwitch: false, unresolved: false };
  }

  const op = jumpInst.operands[0];
  let tableBase: string | undefined;
  let indexRegister: string | undefined;

  if (op && op.kind === 'mem') {
    indexRegister = op.index;
    tableBase = op.base;
  } else if (op && op.kind === 'reg') {
    indexRegister = op.name;
  }

  // Look backwards for cmp and ja/jbe
  let maxCases: number | undefined;
  let defaultTarget: number | undefined;

  for (let i = indirectJumpIndex - 1; i >= Math.max(0, indirectJumpIndex - 10); i--) {
    const prev = instructions[i];

    // Check bounds jump: ja / jg / jbe
    if (prev.category === 'COND_JUMP' && (prev.mnemonic === 'ja' || prev.mnemonic === 'jbe' || prev.mnemonic === 'jg')) {
      if (prev.targetAddress !== undefined) {
        defaultTarget = prev.targetAddress;
      }
    }

    // Check cmp reg, N
    if (prev.category === 'COMPARE' && prev.mnemonic === 'cmp') {
      const cmpDst = prev.operands[0];
      const cmpSrc = prev.operands[1];

      if (cmpSrc && cmpSrc.kind === 'imm') {
        maxCases = Number(cmpSrc.value);
      } else if (cmpDst && cmpDst.kind === 'imm') {
        maxCases = Number(cmpDst.value);
      }
    }
  }

  if (maxCases !== undefined && (tableBase || indexRegister)) {
    return {
      isSwitch: true,
      maxCases,
      indexRegister,
      tableBase,
      defaultTarget,
      unresolved: false,
    };
  }

  // Cannot resolve table destinations statically
  return {
    isSwitch: false,
    unresolved: true,
  };
}
