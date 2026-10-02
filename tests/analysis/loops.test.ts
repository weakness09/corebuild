import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { buildCFG } from '../../src/core/cfg/cfgBuilder.js';
import { computeDominators } from '../../src/core/analysis/dominators.js';
import { buildBasicBlocks } from '../../src/core/cfg/blockBuilder.js';
import { buildCFGEdges } from '../../src/core/cfg/edgeBuilder.js';
import { findLeaders } from '../../src/core/cfg/leader.js';

describe('Dominators & Loops Analysis - Advanced Patterns', () => {
  it('correctly detects nested loops (outer and inner loops)', () => {
    // Nested for loops:
    // for (i = 0; i < 10; i++)
    //   for (j = 0; j < 5; j++)
    const nestedLoopAsm = `
      0x1000: mov DWORD PTR [rbp-0x4], 0
      0x1007: jmp 0x1030

      # Outer loop header
      0x1009: mov DWORD PTR [rbp-0x8], 0
      0x1010: jmp 0x1020

      # Inner loop body
      0x1012: add DWORD PTR [rbp-0x8], 1

      # Inner loop header / check
      0x1020: cmp DWORD PTR [rbp-0x8], 5
      0x1024: jl 0x1012

      # Outer loop increment
      0x1026: add DWORD PTR [rbp-0x4], 1

      # Outer loop check
      0x1030: cmp DWORD PTR [rbp-0x4], 10
      0x1034: jl 0x1009

      0x1036: ret
    `;
    const program = parseAssembly(nestedLoopAsm);
    const cfg = buildCFG(program.instructions);

    expect(cfg.naturalLoops.length).toBe(2);

    // One loop is inner, one is outer
    const loop1 = cfg.naturalLoops[0];
    const loop2 = cfg.naturalLoops[1];

    const innerLoop = loop1.blockIds.length < loop2.blockIds.length ? loop1 : loop2;
    const outerLoop = loop1.blockIds.length > loop2.blockIds.length ? loop1 : loop2;

    expect(innerLoop.blockIds.length).toBeLessThan(outerLoop.blockIds.length);
    // Inner loop blocks must be a subset of outer loop blocks
    for (const bId of innerLoop.blockIds) {
      expect(outerLoop.blockIds).toContain(bId);
    }
  });

  it('handles irreducible control flow graphs safely without crashing or hanging', () => {
    // Irreducible CFG:
    // Entry -> A and B
    // A -> B
    // B -> A
    // Neither A dominates B nor B dominates A!
    const irreducibleAsm = `
      0x2000: cmp edi, 0
      0x2003: jne 0x2010

      # Node A
      0x2005: mov eax, 1
      0x200a: jmp 0x2015

      # Node B
      0x2010: mov eax, 2
      0x2015: cmp eax, 10
      0x2018: jle 0x2005
      0x201a: ret
    `;
    const program = parseAssembly(irreducibleAsm);
    const leaders = findLeaders(program.instructions);
    const blocks = buildBasicBlocks(program.instructions, leaders);
    const { edges } = buildCFGEdges(blocks, program.instructions);

    const domInfo = computeDominators(blocks, edges, blocks[0].id);

    // Verify immediate dominators converge and algorithm terminates safely
    expect(domInfo.dom.size).toBe(blocks.length);

    const cfg = buildCFG(program.instructions);
    expect(cfg).toBeDefined();
    expect(Object.keys(cfg.blocks).length).toBeGreaterThan(2);
  });

  it('handles multiple back-edges to the same loop header (e.g. continue statements)', () => {
    // Loop with two branches that jump back to loop header
    const multiLatchAsm = `
      0x3000: mov eax, 0
      # Header
      0x3005: cmp eax, 100
      0x3008: jge 0x3025
      # Branch check
      0x300a: cmp edi, 1
      0x300d: je 0x3017
      # Latch 1
      0x300f: add eax, 1
      0x3012: jmp 0x3005
      # Latch 2
      0x3017: add eax, 2
      0x301a: jmp 0x3005
      0x3025: ret
    `;
    const program = parseAssembly(multiLatchAsm);
    const cfg = buildCFG(program.instructions);

    // Both latches target 0x3005
    const backEdges = cfg.edges.filter(e => e.isBackEdge && e.toBlockId === 'block_3005');
    expect(backEdges.length).toBe(2);

    const header = cfg.blocks['block_3005'];
    expect(header.isLoopHeader).toBe(true);
  });

  it('labels back edges as "döngü geri kenarı" instead of fallthrough/Ardışık akış', () => {
    const loopAsm = `
      0x1000: mov eax, 0
      0x1005: cmp eax, 10
      0x1008: jge 0x1015
      0x100a: add eax, 1
      0x100d: jmp 0x1005
      0x1015: ret
    `;
    const program = parseAssembly(loopAsm);
    const cfg = buildCFG(program.instructions);

    const backEdge = cfg.edges.find(e => e.isBackEdge);
    expect(backEdge).toBeDefined();
    expect(backEdge?.conditionDescription).toBe('döngü geri kenarı');
    expect(backEdge?.conditionDescription).not.toContain('Ardışık akış');
  });

  it('correctly processes Test 2: AT&T syntax loop with loop header and back edge', () => {
    const attLoopAsm = `
      loop_fn:
        pushq %rbp
        movq %rsp, %rbp
        movl $0, -4(%rbp)
      .L2:
        cmpl $9, -4(%rbp)
        jg .L3
        addl $1, -4(%rbp)
        jmp .L2
      .L3:
        movl -4(%rbp), %eax
        popq %rbp
        ret
    `;
    const program = parseAssembly(attLoopAsm);
    expect(program.instructions.length).toBeGreaterThan(0);

    const cfg = buildCFG(program.instructions);
    expect(cfg.naturalLoops.length).toBe(1);

    const backEdge = cfg.edges.find(e => e.isBackEdge);
    expect(backEdge).toBeDefined();
    expect(backEdge?.conditionDescription).toBe('döngü geri kenarı');

    const header = cfg.blocks[cfg.naturalLoops[0].headerBlockId];
    expect(header).toBeDefined();
    expect(header.isLoopHeader).toBe(true);
  });
});
