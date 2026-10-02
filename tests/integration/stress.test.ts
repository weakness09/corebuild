import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { detectFunctions } from '../../src/core/functions/detector.js';
import { buildCallGraph } from '../../src/core/functions/callGraph.js';

describe('Performance Stress Test - 5000+ Instructions', () => {
  it('parses and analyzes 5000+ assembly instructions in under 1 second (< 1000ms)', () => {
    // Generate synthetic realistic x86-64 assembly with 50 functions, loops and branches
    const lines: string[] = [];
    let currentAddr = 0x1000;

    for (let f = 0; f < 50; f++) {
      const funcName = `worker_func_${f}`;
      const funcAddrHex = currentAddr.toString(16);
      lines.push(`000000000000${funcAddrHex} <${funcName}>:`);
      lines.push(`  ${currentAddr.toString(16)}: 55                      push rbp`);
      currentAddr += 1;
      lines.push(`  ${currentAddr.toString(16)}: 48 89 e5                mov rbp, rsp`);
      currentAddr += 3;
      lines.push(`  ${currentAddr.toString(16)}: 48 83 ec 20             sub rsp, 0x20`);
      currentAddr += 4;
      lines.push(`  ${currentAddr.toString(16)}: 89 7d ec                mov DWORD PTR [rbp-0x14], edi`);
      currentAddr += 3;
      lines.push(`  ${currentAddr.toString(16)}: c7 45 fc 00 00 00 00    mov DWORD PTR [rbp-0x4], 0x0`);
      currentAddr += 7;

      // Inner loop with 10 iterations per function
      const loopHeaderAddr = currentAddr;
      lines.push(`  ${loopHeaderAddr.toString(16)}: 83 7d fc 64          cmp DWORD PTR [rbp-0x4], 0x64`);
      currentAddr += 4;

      const exitJumpAddr = currentAddr;
      currentAddr += 2; // placeholder for jge

      // Body of loop with 90 arithmetic/move instructions
      for (let i = 0; i < 90; i++) {
        lines.push(`  ${currentAddr.toString(16)}: 8b 45 fc             mov eax, DWORD PTR [rbp-0x4]`);
        currentAddr += 3;
        lines.push(`  ${currentAddr.toString(16)}: 83 c0 01             add eax, 0x1`);
        currentAddr += 3;
        lines.push(`  ${currentAddr.toString(16)}: 89 45 fc             mov DWORD PTR [rbp-0x4], eax`);
        currentAddr += 3;
      }

      // Loop latch: jmp to loop header
      lines.push(`  ${currentAddr.toString(16)}: eb 00                jmp ${loopHeaderAddr.toString(16)}`);
      currentAddr += 2;

      // Exit point
      const loopExitAddr = currentAddr;
      lines.splice(lines.length - 272, 0, `  ${exitJumpAddr.toString(16)}: 7d 00                jge ${loopExitAddr.toString(16)}`);

      // Epilogue
      lines.push(`  ${currentAddr.toString(16)}: 8b 45 fc             mov eax, DWORD PTR [rbp-0x4]`);
      currentAddr += 3;
      lines.push(`  ${currentAddr.toString(16)}: c9                   leave`);
      currentAddr += 1;
      lines.push(`  ${currentAddr.toString(16)}: c3                   ret`);
      currentAddr += 1;
    }

    const assemblyText = lines.join('\n');

    const startTime = performance.now();

    // 1. Parsing
    const program = parseAssembly(assemblyText);

    // 2. Function detection & CFG construction
    const functions = detectFunctions(program);

    // 3. Call Graph
    const { callGraph } = buildCallGraph(functions);

    const endTime = performance.now();
    const elapsedMs = endTime - startTime;

    expect(program.instructions.length).toBeGreaterThan(5000);
    expect(functions.length).toBe(50);
    expect(Object.keys(callGraph.nodes).length).toBe(50);

    // Verify performance requirement: analysis must complete under 1 second (< 1000ms)
    expect(elapsedMs).toBeLessThan(1000);
  });
});
