import { InstructionCategory, Operand } from './types.js';

export const COND_JUMP_MNEMONICS = new Set<string>([
  'je', 'jz',
  'jne', 'jnz',
  'jg', 'jnle',
  'jge', 'jnl',
  'jl', 'jnge',
  'jle', 'jng',
  'ja', 'jnbe',
  'jae', 'jnb', 'jnc',
  'jb', 'jnae', 'jc',
  'jbe', 'jna',
  'js', 'jns',
  'jo', 'jno',
  'jp', 'jpe', 'jnp', 'jpo',
  'jcxz', 'jecxz', 'jrcxz',
  'loop', 'loope', 'loopne', 'loopz', 'loopnz',
]);

export const UNCOND_JUMP_MNEMONICS = new Set<string>([
  'jmp', 'jmpq',
]);

export const CALL_MNEMONICS = new Set<string>([
  'call', 'callq',
]);

export const RET_MNEMONICS = new Set<string>([
  'ret', 'retq', 'retf',
]);

export const SYSCALL_MNEMONICS = new Set<string>([
  'syscall', 'sysenter', 'int',
]);

export const COMPARE_MNEMONICS = new Set<string>([
  'cmp', 'cmpb', 'cmpw', 'cmpl', 'cmpq',
  'test', 'testb', 'testw', 'testl', 'testq',
]);

export const STACK_MNEMONICS = new Set<string>([
  'push', 'pushq', 'pushw',
  'pop', 'popq', 'popw',
  'leave', 'enter',
]);

export const MOVE_MNEMONICS = new Set<string>([
  'mov', 'movq', 'movl', 'movw', 'movb',
  'movzx', 'movsx', 'movsxd',
  'movabs', 'lea', 'leaq', 'xchg',
  'cmove', 'cmovz', 'cmovne', 'cmovnz',
  'cmova', 'cmovae', 'cmovb', 'cmovbe',
  'cmovg', 'cmovge', 'cmovl', 'cmovle',
]);

export const ARITH_MNEMONICS = new Set<string>([
  'add', 'addq', 'addl', 'addw', 'addb',
  'sub', 'subq', 'subl', 'subw', 'subb',
  'inc', 'incq', 'incl', 'incw', 'incb',
  'dec', 'decq', 'decl', 'decw', 'decb',
  'imul', 'mul', 'idiv', 'div',
  'neg', 'negq', 'negl',
  'adc', 'sbb',
]);

export const LOGIC_MNEMONICS = new Set<string>([
  'and', 'andq', 'andl', 'andw', 'andb',
  'or', 'orq', 'orl', 'orw', 'orb',
  'xor', 'xorq', 'xorl', 'xorw', 'xorb',
  'not', 'notq', 'notl',
  'shl', 'shlq', 'shll', 'shr', 'shrq', 'shrl',
  'sal', 'sar', 'sarq', 'sarl',
  'rol', 'ror',
]);

export const NOP_NOISE_MNEMONICS = new Set<string>([
  'nop', 'nopw', 'nopl', 'endbr64', 'pause',
]);

export const PREFIXES = new Set<string>([
  'lock', 'rep', 'repe', 'repz', 'repne', 'repnz', 'bnd', 'notrack', 'data16',
]);

export function classifyInstruction(mnemonic: string, operands: Operand[]): InstructionCategory {
  const m = mnemonic.toLowerCase();

  if (NOP_NOISE_MNEMONICS.has(m)) return 'NOP';

  if (RET_MNEMONICS.has(m)) return 'RET';

  if (SYSCALL_MNEMONICS.has(m)) return 'SYSCALL';

  if (COND_JUMP_MNEMONICS.has(m)) return 'COND_JUMP';

  if (UNCOND_JUMP_MNEMONICS.has(m)) {
    const firstOp = operands[0];
    if (firstOp && (firstOp.kind === 'reg' || firstOp.kind === 'mem')) {
      return 'INDIRECT_JUMP';
    }
    return 'UNCOND_JUMP';
  }

  if (CALL_MNEMONICS.has(m)) {
    const firstOp = operands[0];
    if (firstOp && (firstOp.kind === 'reg' || firstOp.kind === 'mem')) {
      return 'INDIRECT_CALL';
    }
    return 'CALL';
  }

  if (COMPARE_MNEMONICS.has(m)) return 'COMPARE';
  if (STACK_MNEMONICS.has(m)) return 'STACK';
  if (MOVE_MNEMONICS.has(m)) return 'MOVE';
  if (ARITH_MNEMONICS.has(m)) return 'ARITH';
  if (LOGIC_MNEMONICS.has(m)) return 'LOGIC';

  return 'OTHER';
}

export function isFoldableNoise(mnemonic: string): boolean {
  return NOP_NOISE_MNEMONICS.has(mnemonic.toLowerCase());
}
