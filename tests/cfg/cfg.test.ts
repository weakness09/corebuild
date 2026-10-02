import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { buildCFG } from '../../src/core/cfg/cfgBuilder.js';
import { findLeaders } from '../../src/core/cfg/leader.js';

describe('CFG - Leader Detection', () => {
  it('correctly identifies leaders from jumps and terminators', () => {
    const input = `
      0x1000: mov eax, 5
      0x1004: cmp eax, 0
      0x1007: jg 0x1015
      0x1009: mov ebx, 1
      0x100e: jmp 0x101a
      0x1015: mov ebx, 2
      0x101a: ret
    `;
    const program = parseAssembly(input);
    const leaders = findLeaders(program.instructions);

    // 0x1000 (first)
    // 0x1015 (jg target)
    // 0x1009 (instruction after jg)
    // 0x101a (jmp target)
    // 0x1015 (already leader)
    expect(leaders).toContain(0x1000);
    expect(leaders).toContain(0x1009);
    expect(leaders).toContain(0x1015);
    expect(leaders).toContain(0x101a);
  });
});

describe('CFG - If / Else Control Flow', () => {
  it('builds correct basic blocks and edges for if/else branch', () => {
    const input = `
      0x1000: cmp edi, 10
      0x1003: jle 0x1010
      0x1005: mov eax, 100
      0x100a: jmp 0x1015
      0x1010: mov eax, 200
      0x1015: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);

    // Blocks:
    // 1: 0x1000 - 0x1003 (entry, cmp + jle)
    // 2: 0x1005 - 0x100a (then block, mov + jmp)
    // 3: 0x1010 - 0x1010 (else block, mov)
    // 4: 0x1015 - 0x1015 (exit block, ret)
    const blockList = Object.values(cfg.blocks);
    expect(blockList.length).toBe(4);

    const entryBlock = cfg.blocks[cfg.entryBlockId];
    expect(entryBlock.isEntry).toBe(true);

    const takenEdge = cfg.edges.find(e => e.type === 'jump_taken');
    expect(takenEdge).toBeDefined();
    expect(takenEdge?.fromBlockId).toBe('block_1000');
    expect(takenEdge?.toBlockId).toBe('block_1010');

    const notTakenEdge = cfg.edges.find(e => e.type === 'jump_not_taken');
    expect(notTakenEdge).toBeDefined();
    expect(notTakenEdge?.fromBlockId).toBe('block_1000');
    expect(notTakenEdge?.toBlockId).toBe('block_1005');

    const exitBlock = cfg.blocks['block_1015'];
    expect(exitBlock.isExit).toBe(true);
  });
});

describe('CFG - Loop Detection & Back Edges', () => {
  it('detects natural loops and marks loop header and back edges', () => {
    const loopAsm = `
      0x2000: mov ecx, 0
      0x2005: cmp ecx, 10
      0x2008: jge 0x2015
      0x200a: add ecx, 1
      0x200d: jmp 0x2005
      0x2015: ret
    `;
    const program = parseAssembly(loopAsm);
    const cfg = buildCFG(program.instructions);

    expect(cfg.naturalLoops.length).toBe(1);
    const loop = cfg.naturalLoops[0];
    expect(loop.headerBlockId).toBe('block_2005');
    expect(loop.latchBlockId).toBe('block_200a');

    const headerBlock = cfg.blocks['block_2005'];
    expect(headerBlock.isLoopHeader).toBe(true);

    const backEdge = cfg.edges.find(e => e.isBackEdge);
    expect(backEdge).toBeDefined();
    expect(backEdge?.fromBlockId).toBe('block_200a');
    expect(backEdge?.toBlockId).toBe('block_2005');
  });
});

describe('CFG - Dead Code Detection', () => {
  it('flags unreachable blocks as dead', () => {
    const input = `
      0x3000: mov eax, 1
      0x3005: jmp 0x3015
      0x300a: mov eax, 999
      0x300f: nop
      0x3015: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);

    // block_300a is skipped by jmp 0x3015 and has no predecessors
    const deadBlock = cfg.blocks['block_300a'];
    expect(deadBlock).toBeDefined();
    expect(deadBlock.isDead).toBe(true);

    const activeBlock = cfg.blocks['block_3000'];
    expect(activeBlock.isDead).toBe(false);
  });
});

describe('CFG - Noreturn Function Terminating Block', () => {
  it('treats call exit as block exit and prevents fallthrough', () => {
    const input = `
      0x4000: cmp edi, 0
      0x4003: jne 0x400f
      0x4005: call 0x5000 <exit>
      0x400a: nop
      0x400f: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);

    const exitCallBlock = cfg.blocks['block_4005'];
    expect(exitCallBlock).toBeDefined();
    expect(exitCallBlock.isExit).toBe(true);

    // There should be NO edge from block_4005 to block_400a
    const deadEdge = cfg.edges.find(e => e.fromBlockId === 'block_4005');
    expect(deadEdge).toBeUndefined();
  });
});

describe('CFG - Switch Table & Unresolved Indirect Jumps', () => {
  it('creates an unresolved indirect node for standalone indirect jump', () => {
    const input = `
      0x5000: mov rax, 0x401000
      0x5007: jmp rax
      0x5009: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);

    const indirectEdge = cfg.edges.find(e => e.type === 'indirect');
    expect(indirectEdge).toBeDefined();
    expect(indirectEdge?.toBlockId).toContain('unresolved_indirect_5007');

    const unresolvedBlock = cfg.blocks[indirectEdge!.toBlockId];
    expect(unresolvedBlock).toBeDefined();
    expect(unresolvedBlock.isExit).toBe(true);
  });

  it('detects switch jump table pattern and populates edge condition description', () => {
    const input = `
      0x6000: cmp eax, 4
      0x6003: ja 0x6020
      0x6005: jmp QWORD PTR [rax*8 + 0x7000]
      0x6020: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);

    const switchEdge = cfg.edges.find(e => e.type === 'indirect');
    expect(switchEdge).toBeDefined();
    expect(switchEdge?.conditionDescription).toContain('Switch');

    const takenEdge = cfg.edges.find(e => e.type === 'jump_taken');
    expect(takenEdge?.conditionDescription).toBeDefined();
    expect(takenEdge?.conditionDescription).toBe('doğru (>)');
    expect(takenEdge?.fullCondition).toContain('eğer eax');
  });
});

