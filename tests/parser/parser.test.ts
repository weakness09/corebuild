import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { classifyInstruction, isFoldableNoise } from '../../src/core/parser/classifier.js';
import { getRegisterInfo, isSameRegisterFamily } from '../../src/core/parser/registers.js';
import { isNoReturnFunction, isTerminatingMnemonic } from '../../src/core/parser/noreturn.js';
import fs from 'fs';
import path from 'path';

describe('Register Map and Aliases', () => {
  it('correctly maps 64, 32, 16, 8 bit registers to their physical families', () => {
    expect(isSameRegisterFamily('rax', 'eax')).toBe(true);
    expect(isSameRegisterFamily('eax', 'al')).toBe(true);
    expect(isSameRegisterFamily('rax', 'rbx')).toBe(false);
    expect(isSameRegisterFamily('rdi', 'dil')).toBe(true);
    expect(isSameRegisterFamily('r8', 'r8d')).toBe(true);
  });

  it('retrieves accurate register size information', () => {
    expect(getRegisterInfo('rax')?.size).toBe(64);
    expect(getRegisterInfo('eax')?.size).toBe(32);
    expect(getRegisterInfo('ax')?.size).toBe(16);
    expect(getRegisterInfo('al')?.size).toBe(8);
  });
});

describe('Instruction Classifier', () => {
  it('classifies conditional jumps and terminators', () => {
    expect(classifyInstruction('je', [])).toBe('COND_JUMP');
    expect(classifyInstruction('jle', [])).toBe('COND_JUMP');
    expect(classifyInstruction('jmp', [{ kind: 'label', name: 'target', raw: 'target' }])).toBe('UNCOND_JUMP');
    expect(classifyInstruction('jmp', [{ kind: 'reg', name: 'rax', size: 64, family: 'rax' }])).toBe('INDIRECT_JUMP');
    expect(classifyInstruction('call', [{ kind: 'label', name: 'printf', raw: 'printf' }])).toBe('CALL');
    expect(classifyInstruction('ret', [])).toBe('RET');
  });

  it('classifies arith, logic, move, compare, stack', () => {
    expect(classifyInstruction('add', [])).toBe('ARITH');
    expect(classifyInstruction('sub', [])).toBe('ARITH');
    expect(classifyInstruction('xor', [])).toBe('LOGIC');
    expect(classifyInstruction('mov', [])).toBe('MOVE');
    expect(classifyInstruction('lea', [])).toBe('MOVE');
    expect(classifyInstruction('cmp', [])).toBe('COMPARE');
    expect(classifyInstruction('test', [])).toBe('COMPARE');
    expect(classifyInstruction('push', [])).toBe('STACK');
    expect(classifyInstruction('pop', [])).toBe('STACK');
    expect(classifyInstruction('syscall', [])).toBe('SYSCALL');
    expect(classifyInstruction('endbr64', [])).toBe('NOP');
  });

  it('identifies foldable noise instructions', () => {
    expect(isFoldableNoise('endbr64')).toBe(true);
    expect(isFoldableNoise('nop')).toBe(true);
    expect(isFoldableNoise('mov')).toBe(false);
  });
});

describe('Noreturn & Terminators', () => {
  it('recognizes standard noreturn functions and terminators', () => {
    expect(isNoReturnFunction('exit')).toBe(true);
    expect(isNoReturnFunction('abort')).toBe(true);
    expect(isNoReturnFunction('__stack_chk_fail@plt')).toBe(true);
    expect(isNoReturnFunction('printf')).toBe(false);
    expect(isTerminatingMnemonic('ret')).toBe(true);
    expect(isTerminatingMnemonic('hlt')).toBe(true);
    expect(isTerminatingMnemonic('ud2')).toBe(true);
  });
});

describe('Assembly Parser - objdump intel format', () => {
  it('parses objdump intel disassembly correctly', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/objdump_intel.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    expect(program.instructions.length).toBeGreaterThan(15);
    expect(program.symbols[0x1139]).toBe('main');
    expect(program.symbols[0x1040]).toBe('fact');

    const first = program.instructions[0];
    expect(first.address).toBe(0x1139);
    expect(first.mnemonic).toBe('endbr64');
    expect(first.isFoldableNoise).toBe(true);

    const callFact = program.instructions.find(i => i.mnemonic === 'call' && i.address === 0x1157);
    expect(callFact).toBeDefined();
    expect(callFact?.category).toBe('CALL');
    expect(callFact?.targetAddress).toBe(0x1040);
  });
});

describe('Assembly Parser - GDB format', () => {
  it('parses GDB disassemble output', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/gdb_disas.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    expect(program.instructions.length).toBeGreaterThan(10);
    const jle = program.instructions.find(i => i.mnemonic === 'jle');
    expect(jle).toBeDefined();
    expect(jle?.category).toBe('COND_JUMP');
    expect(jle?.targetAddress).toBe(0x121d);
  });
});

describe('Assembly Parser - AT&T format', () => {
  it('normalizes AT&T mnemonics and operands to Intel standard', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/att_syntax.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    expect(program.instructions.length).toBeGreaterThan(8);
    // movq %rsp, %rbp -> normalized to mov rbp, rsp
    const mov = program.instructions.find(i => i.mnemonic === 'mov' && i.operands.length === 2);
    expect(mov).toBeDefined();
    if (mov && mov.operands.length === 2) {
      expect(mov.operands[0].kind).toBe('reg');
      if (mov.operands[0].kind === 'reg') {
        expect(mov.operands[0].name).toBe('rbp');
      }
      expect(mov.operands[1].kind).toBe('reg');
      if (mov.operands[1].kind === 'reg') {
        expect(mov.operands[1].name).toBe('rsp');
      }
    }
  });
});

describe('Assembly Parser - Complex Memory and Prefixes', () => {
  it('parses scaled index, displacement, and size directives', () => {
    const input = `
      mov QWORD PTR [rbp - 0x18], rax
      mov edx, DWORD PTR [rax + rcx*4 + 0x20]
      rep stosb
      call rax
      call QWORD PTR [r12]
    `;
    const program = parseAssembly(input);
    expect(program.instructions.length).toBe(5);

    const first = program.instructions[0];
    expect(first.operands[0].kind).toBe('mem');
    if (first.operands[0].kind === 'mem') {
      expect(first.operands[0].base).toBe('rbp');
      expect(first.operands[0].disp).toBe(-0x18);
      expect(first.operands[0].size).toBe(8);
    }

    const second = program.instructions[1];
    expect(second.operands[1].kind).toBe('mem');
    if (second.operands[1].kind === 'mem') {
      expect(second.operands[1].base).toBe('rax');
      expect(second.operands[1].index).toBe('rcx');
      expect(second.operands[1].scale).toBe(4);
      expect(second.operands[1].disp).toBe(0x20);
      expect(second.operands[1].size).toBe(4);
    }

    const rep = program.instructions[2];
    expect(rep.prefix).toBe('rep');

    const indCall1 = program.instructions[3];
    expect(indCall1.category).toBe('INDIRECT_CALL');

    const indCall2 = program.instructions[4];
    expect(indCall2.category).toBe('INDIRECT_CALL');
  });
});

describe('Assembly Parser - Robustness and Unknown Lines', () => {
  it('does not crash on unknown or invalid instructions', () => {
    const invalidInput = `
      0000000000001000 <broken>:
        1000: ??? random gibberish here
        1004: mov eax, 1
    `;
    const program = parseAssembly(invalidInput);
    expect(program.instructions.length).toBeGreaterThanOrEqual(1);
    expect(program.warnings.length).toBeGreaterThanOrEqual(1);
    const unknown = program.instructions.find(i => i.isUnknown);
    expect(unknown).toBeDefined();
  });
});

