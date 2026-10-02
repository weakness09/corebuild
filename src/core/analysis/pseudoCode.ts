import { BasicBlock } from '../cfg/types.js';
import { interpretCondition, formatOperandForDisplay, FormatOperandOptions } from './conditionInterpreter.js';

export function generateBlockPseudoCode(
  block: BasicBlock,
  optionsOrLabels?: Record<string, string> | FormatOperandOptions
): string[] {
  const isOptionsObj = Boolean(
    optionsOrLabels &&
    typeof optionsOrLabels === 'object' &&
    ('userLabels' in optionsOrLabels || 'argMap' in optionsOrLabels || 'functionRange' in optionsOrLabels || 'functionName' in optionsOrLabels || 'blockInstructions' in optionsOrLabels)
  );

  const options: FormatOperandOptions = isOptionsObj
    ? {
        ...(optionsOrLabels as FormatOperandOptions),
        blockInstructions: (optionsOrLabels as FormatOperandOptions).blockInstructions || block.instructions,
      }
    : {
        userLabels: optionsOrLabels as Record<string, string> | undefined,
        blockInstructions: block.instructions,
      };

  const lines: string[] = [];
  const insts = block.instructions;

  if (insts.length === 0) return ['// Boş blok'];

  if (block.isLoopHeader) {
    lines.push('// [Döngü Başlangıcı]');
  }

  // Look for assignments and calls
  for (let i = 0; i < insts.length; i++) {
    const inst = insts[i];

    // Calls
    if (inst.category === 'CALL') {
      const target = inst.operands[0] ? formatOperandForDisplay(inst.operands[0], options) : 'bilinmeyen_fonksiyon';
      lines.push(`${target}();`);
      continue;
    }

    // Returns
    if (inst.category === 'RET') {
      lines.push('return eax;');
      continue;
    }

    // Common arithmetic: add dst, imm / inc dst
    if (inst.mnemonic === 'add' && inst.operands.length === 2) {
      const dst = formatOperandForDisplay(inst.operands[0], options);
      const src = formatOperandForDisplay(inst.operands[1], options);
      lines.push(`${dst} = ${dst} + ${src};`);
    } else if (inst.mnemonic === 'sub' && inst.operands.length === 2 && inst.operands[0].kind === 'reg' && inst.operands[0].name !== 'rsp') {
      const dst = formatOperandForDisplay(inst.operands[0], options);
      const src = formatOperandForDisplay(inst.operands[1], options);
      lines.push(`${dst} = ${dst} - ${src};`);
    } else if (inst.mnemonic === 'inc' && inst.operands.length === 1) {
      const dst = formatOperandForDisplay(inst.operands[0], options);
      lines.push(`${dst}++;`);
    } else if (inst.mnemonic === 'dec' && inst.operands.length === 1) {
      const dst = formatOperandForDisplay(inst.operands[0], options);
      lines.push(`${dst}--;`);
    } else if (inst.mnemonic === 'mov' && inst.operands.length === 2) {
      // Filter out standard prologue / epilogue moves
      const dst = formatOperandForDisplay(inst.operands[0], options);
      const src = formatOperandForDisplay(inst.operands[1], options);
      if (!(dst === 'rbp' && src === 'rsp')) {
        lines.push(`${dst} = ${src};`);
      }
    }
  }

  // Last instruction branch logic
  const last = insts[insts.length - 1];
  if (last.category === 'COND_JUMP') {
    const prev = insts.length >= 2 ? insts[insts.length - 2] : undefined;
    const cond = interpretCondition(last, prev, options);
    if (cond && cond.leftOperand) {
      const opStr = cond.cleanOperator || cond.operator.split(' ')[0];
      lines.push(`if (${cond.leftOperand} ${opStr} ${cond.rightOperand}) goto ${cond.targetDescription};`);
    } else {
      lines.push(`if (${last.mnemonic}) goto hedefe;`);
    }
  } else if (last.category === 'UNCOND_JUMP') {
    const target = last.operands[0] ? formatOperandForDisplay(last.operands[0], options) : 'hedefe';
    lines.push(`goto ${target};`);
  }

  if (lines.length === 0) {
    return ['// Komutlar işlendi'];
  }

  // Limit to at most 6 key lines for clarity
  return lines.slice(0, 6);
}
