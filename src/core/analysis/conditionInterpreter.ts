import { Instruction, Operand } from '../parser/types.js';

export interface ConditionInterpretation {
  summary: string; // e.g. "eğer arg1 <= 5 ise block_1058'e atla"
  shortTaken: string; // e.g. "doğru (<=)"
  shortNotTaken: string; // e.g. "değil (<=)"
  leftOperand: string; // "arg1" or "var_4"
  operator: string; // "<=", "==", "!=", "> (işaretsiz)", etc.
  cleanOperator?: string; // "<=", "==", "!=", ">", etc.
  rightOperand: string; // "5"
  targetDescription: string; // "block_1058" or "puts@plt"
  isSigned: boolean;
}

export const SYSTEM_V_ARG_REGS: Record<string, string> = {
  // arg1 (rdi)
  rdi: 'arg1', edi: 'arg1', di: 'arg1', dil: 'arg1',
  // arg2 (rsi)
  rsi: 'arg2', esi: 'arg2', si: 'arg2', sil: 'arg2',
  // arg3 (rdx)
  rdx: 'arg3', edx: 'arg3', dx: 'arg3', dl: 'arg3', dh: 'arg3',
  // arg4 (rcx)
  rcx: 'arg4', ecx: 'arg4', cx: 'arg4', cl: 'arg4', ch: 'arg4',
  // arg5 (r8)
  r8: 'arg5', r8d: 'arg5', r8w: 'arg5', r8b: 'arg5',
  // arg6 (r9)
  r9: 'arg6', r9d: 'arg6', r9w: 'arg6', r9b: 'arg6',
};

export interface FormatOperandOptions {
  userLabels?: Record<string, string>;
  argMap?: Record<string, string>;
  functionRange?: { start: number; end: number };
  functionName?: string;
  blockInstructions?: Instruction[];
}

/**
 * Formats an operand for readable display, prioritizing userLabels > argMap > raw registers,
 * and displaying intra-function jump targets as block names rather than offsets.
 */
export function formatOperandForDisplay(
  op: Operand,
  optionsOrLabels?: Record<string, string> | FormatOperandOptions
): string {
  // Backward compatibility if just userLabels passed
  const options: FormatOperandOptions =
    optionsOrLabels && ('userLabels' in optionsOrLabels || 'argMap' in optionsOrLabels || 'functionRange' in optionsOrLabels || 'functionName' in optionsOrLabels || 'blockInstructions' in optionsOrLabels)
      ? (optionsOrLabels as FormatOperandOptions)
      : { userLabels: optionsOrLabels as Record<string, string> | undefined };

  const { userLabels, argMap = SYSTEM_V_ARG_REGS, functionRange, functionName } = options;

  if (op.kind === 'reg') {
    // 1. User label takes highest priority
    if (userLabels && userLabels[op.name]) {
      return userLabels[op.name];
    }
    if (userLabels && userLabels[op.family]) {
      return userLabels[op.family];
    }
    // 2. Argument candidate map (arg1..argN)
    if (argMap && argMap[op.name.toLowerCase()]) {
      return argMap[op.name.toLowerCase()];
    }
    return op.name;
  }

  if (op.kind === 'imm') {
    return op.raw || op.value.toString();
  }

  if (op.kind === 'mem') {
    // Stack variable check: [rbp - disp]
    if (op.base === 'rbp' && op.disp !== undefined && op.disp < 0) {
      const varKey = `var_${Math.abs(op.disp).toString(16)}`;
      if (userLabels && userLabels[varKey]) {
        return userLabels[varKey];
      }
      return varKey;
    }

    // Memory base might be an arg register: e.g. [rdi] -> [arg1]
    let baseDisplay = op.base || '';
    if (baseDisplay && argMap && argMap[baseDisplay.toLowerCase()]) {
      baseDisplay = userLabels?.[baseDisplay] || argMap[baseDisplay.toLowerCase()];
    }

    return op.raw || `[${baseDisplay}]`;
  }

  if (op.kind === 'label') {
    // 1. User labels for address or block
    if (op.address !== undefined) {
      const hexAddr = `0x${op.address.toString(16)}`;
      const blockId = `block_${op.address.toString(16)}`;
      if (userLabels && (userLabels[blockId] || userLabels[hexAddr])) {
        return userLabels[blockId] || userLabels[hexAddr];
      }
    }

    // 2. Check if target is inside the current function
    if (op.address !== undefined && functionRange) {
      const isInsideFunction = op.address >= functionRange.start && op.address <= functionRange.end;
      if (isInsideFunction) {
        return `block_${op.address.toString(16)}`;
      }
    }

    // 3. Intra-function check by functionName (e.g. op.name starts with "fact+")
    if (functionName && op.name && (op.name.startsWith(`${functionName}+`) || op.name.startsWith(`${functionName}-`))) {
      if (op.address !== undefined) {
        return `block_${op.address.toString(16)}`;
      }
    }

    // 4. User label for symbolic name
    if (op.name && userLabels && userLabels[op.name]) {
      return userLabels[op.name];
    }

    // 5. If outside or no function range, use label name or hex address (preserves external offsets like puts@plt or other+0x10)
    return op.name || (op.address !== undefined ? `0x${op.address.toString(16)}` : op.raw);
  }

  return '';
}

export function interpretCondition(
  jumpInst: Instruction,
  prevInst?: Instruction,
  optionsOrLabels?: Record<string, string> | FormatOperandOptions
): ConditionInterpretation | undefined {
  if (jumpInst.category !== 'COND_JUMP') return undefined;

  const options: FormatOperandOptions =
    optionsOrLabels && ('userLabels' in optionsOrLabels || 'argMap' in optionsOrLabels || 'functionRange' in optionsOrLabels || 'functionName' in optionsOrLabels || 'blockInstructions' in optionsOrLabels)
      ? (optionsOrLabels as FormatOperandOptions)
      : { userLabels: optionsOrLabels as Record<string, string> | undefined };

  const targetDesc = jumpInst.operands[0]
    ? formatOperandForDisplay(jumpInst.operands[0], options)
    : jumpInst.targetAddress !== undefined
    ? `0x${jumpInst.targetAddress.toString(16)}`
    : 'hedefe';

  const jm = jumpInst.mnemonic.toLowerCase();

  // If previous instruction was a compare (cmp) or test
  if (prevInst && prevInst.category === 'COMPARE') {
    const isTest = prevInst.mnemonic.startsWith('test');
    const op1 = prevInst.operands[0];
    const op2 = prevInst.operands[1];

    // Build register copy map for simple intra-block copy propagation
    const regCopies = new Map<string, string>();
    if (options.blockInstructions) {
      const stopInst = prevInst || jumpInst;
      for (const inst of options.blockInstructions) {
        if (inst === stopInst) break;

        // mov dstReg, src
        if (inst.mnemonic === 'mov' && inst.operands.length === 2) {
          const dst = inst.operands[0];
          const src = inst.operands[1];
          if (dst.kind === 'reg') {
            const srcStr = formatOperandForDisplay(src, options);
            const resolvedSrc = (src.kind === 'reg' && regCopies.get(src.name.toLowerCase())) || srcStr;
            regCopies.set(dst.name.toLowerCase(), resolvedSrc);
            regCopies.set(dst.family.toLowerCase(), resolvedSrc);
          }
        } else if (inst.mnemonic === 'lea' && inst.operands.length === 2) {
          const dst = inst.operands[0];
          const src = inst.operands[1];
          if (dst.kind === 'reg') {
            const srcStr = formatOperandForDisplay(src, options);
            regCopies.set(dst.name.toLowerCase(), srcStr);
            regCopies.set(dst.family.toLowerCase(), srcStr);
          }
        } else if (inst.operands.length > 0) {
          // Invalidate on write / clobber
          const dst = inst.operands[0];
          if (dst.kind === 'reg') {
            regCopies.delete(dst.name.toLowerCase());
            regCopies.delete(dst.family.toLowerCase());
          }
        }
      }
    }

    let left = op1 ? formatOperandForDisplay(op1, options) : 'değer';
    let right = op2 ? formatOperandForDisplay(op2, options) : '0';

    // Apply copy propagation if left is a register and has a recorded source (e.g. eax = var_4)
    if (op1 && op1.kind === 'reg') {
      const copied = regCopies.get(op1.name.toLowerCase()) || regCopies.get(op1.family.toLowerCase());
      if (copied && (!options.userLabels || !options.userLabels[op1.name])) {
        left = copied;
      }
    }

    // Apply copy propagation if right is a register and has a recorded source (e.g. edx = var_14)
    if (op2 && op2.kind === 'reg') {
      const copied = regCopies.get(op2.name.toLowerCase()) || regCopies.get(op2.family.toLowerCase());
      if (copied && (!options.userLabels || !options.userLabels[op2.name])) {
        right = copied;
      }
    }

    // If left is a stack variable like 'var_4' and user hasn't explicitly labeled it,
    // check if it was initialized from an argument register earlier in the block
    if (left.startsWith('var_') && (!options.userLabels || !options.userLabels[left])) {
      if (options.blockInstructions) {
        const offsetHex = left.slice(4);
        const offsetVal = parseInt(offsetHex, 16);
        for (const inst of options.blockInstructions) {
          if (inst.mnemonic === 'mov' && inst.operands.length === 2) {
            const dst = inst.operands[0];
            const src = inst.operands[1];
            if (
              dst.kind === 'mem' &&
              dst.base === 'rbp' &&
              dst.disp !== undefined &&
              Math.abs(dst.disp) === offsetVal
            ) {
              const srcDisplay = formatOperandForDisplay(src, options);
              if (srcDisplay.startsWith('arg') || (options.userLabels && options.userLabels[srcDisplay])) {
                left = srcDisplay;
                break;
              }
            }
          }
        }
      }
    }

    if (isTest) {
      // test x, x (zero check) vs test x, mask (bit test)
      if (op1 && op2 && op1.kind === 'reg' && op2.kind === 'reg' && op1.name === op2.name) {
        if (jm === 'jz' || jm === 'je') {
          return {
            summary: `eğer ${left} == 0 ise ${targetDesc}'ye atla`,
            shortTaken: 'doğru (== 0)',
            shortNotTaken: 'değil (!= 0)',
            leftOperand: left,
            operator: '==',
            cleanOperator: '==',
            rightOperand: '0',
            targetDescription: targetDesc,
            isSigned: true,
          };
        }
        if (jm === 'jnz' || jm === 'jne') {
          return {
            summary: `eğer ${left} != 0 ise ${targetDesc}'ye atla`,
            shortTaken: 'doğru (!= 0)',
            shortNotTaken: 'değil (== 0)',
            leftOperand: left,
            operator: '!=',
            cleanOperator: '!=',
            rightOperand: '0',
            targetDescription: targetDesc,
            isSigned: true,
          };
        }
      } else {
        // bitwise mask test
        const condOp = (jm === 'jnz' || jm === 'jne') ? '!=' : '==';
        return {
          summary: `eğer (${left} & ${right}) ${condOp} 0 ise ${targetDesc}'ye atla`,
          shortTaken: `doğru (${condOp} 0)`,
          shortNotTaken: `değil`,
          leftOperand: `(${left} & ${right})`,
          operator: condOp,
          cleanOperator: condOp,
          rightOperand: '0',
          targetDescription: targetDesc,
          isSigned: false,
        };
      }
    }

    // cmp op1, op2
    let operator = '==';
    let cleanOp = '==';
    let isSigned = true;

    switch (jm) {
      case 'je':
      case 'jz':
        operator = '==';
        cleanOp = '==';
        break;
      case 'jne':
      case 'jnz':
        operator = '!=';
        cleanOp = '!=';
        break;
      case 'jg':
      case 'jnle':
        operator = '>';
        cleanOp = '>';
        isSigned = true;
        break;
      case 'jge':
      case 'jnl':
        operator = '>=';
        cleanOp = '>=';
        isSigned = true;
        break;
      case 'jl':
      case 'jnge':
        operator = '<';
        cleanOp = '<';
        isSigned = true;
        break;
      case 'jle':
      case 'jng':
        operator = '<=';
        cleanOp = '<=';
        isSigned = true;
        break;
      case 'ja':
      case 'jnbe':
        operator = '> (işaretsiz)';
        cleanOp = '>';
        isSigned = false;
        break;
      case 'jae':
      case 'jnb':
      case 'jnc':
        operator = '>= (işaretsiz)';
        cleanOp = '>=';
        isSigned = false;
        break;
      case 'jb':
      case 'jnae':
      case 'jc':
        operator = '< (işaretsiz)';
        cleanOp = '<';
        isSigned = false;
        break;
      case 'jbe':
      case 'jna':
        operator = '<= (işaretsiz)';
        cleanOp = '<=';
        isSigned = false;
        break;
      case 'js':
        return {
          summary: `eğer ${left} negatif (< 0) ise ${targetDesc}'ye atla`,
          shortTaken: 'doğru (< 0)',
          shortNotTaken: 'değil (>= 0)',
          leftOperand: left,
          operator: '<',
          cleanOperator: '<',
          rightOperand: '0',
          targetDescription: targetDesc,
          isSigned: true,
        };
      case 'jns':
        return {
          summary: `eğer ${left} pozitif (>= 0) ise ${targetDesc}'ye atla`,
          shortTaken: 'doğru (>= 0)',
          shortNotTaken: 'değil (< 0)',
          leftOperand: left,
          operator: '>=',
          cleanOperator: '>=',
          rightOperand: '0',
          targetDescription: targetDesc,
          isSigned: true,
        };
      default:
        operator = jm;
        cleanOp = jm;
    }

    return {
      summary: `eğer ${left} ${operator} ${right} ise ${targetDesc}'ye atla`,
      shortTaken: `doğru (${cleanOp})`,
      shortNotTaken: `değil (${cleanOp})`,
      leftOperand: left,
      operator,
      cleanOperator: cleanOp,
      rightOperand: right,
      targetDescription: targetDesc,
      isSigned,
    };
  }

  // Standalone jump without preceding compare
  return {
    summary: `koşul (${jm}) sağlanırsa ${targetDesc}'ye atla`,
    shortTaken: `doğru (${jm})`,
    shortNotTaken: `değil (${jm})`,
    leftOperand: '',
    operator: jm,
    cleanOperator: jm,
    rightOperand: '',
    targetDescription: targetDesc,
    isSigned: true,
  };
}
