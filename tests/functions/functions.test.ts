import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { detectFunctions } from '../../src/core/functions/detector.js';
import { buildCallGraph } from '../../src/core/functions/callGraph.js';
import { interpretCondition, formatOperandForDisplay } from '../../src/core/analysis/conditionInterpreter.js';
import { generateBlockPseudoCode } from '../../src/core/analysis/pseudoCode.js';
import fs from 'fs';
import path from 'path';

describe('Function Detection & Call Graph', () => {
  it('detects functions, callers, callees, and recursion from objdump fixture', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/objdump_intel.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    const rawFunctions = detectFunctions(program);
    expect(rawFunctions.length).toBe(2);

    const { callGraph, updatedFunctions } = buildCallGraph(rawFunctions);

    const mainFunc = updatedFunctions.find(f => f.name === 'main');
    const factFunc = updatedFunctions.find(f => f.name === 'fact');

    expect(mainFunc).toBeDefined();
    expect(factFunc).toBeDefined();

    // fact calls fact (recursion)
    expect(factFunc?.isRecursive).toBe(true);
    expect(mainFunc?.isRecursive).toBe(false);

    // main calls fact
    expect(mainFunc?.callees).toContain(factFunc?.id);
    expect(factFunc?.callers).toContain(mainFunc?.id);

    // CallGraph check
    expect(Object.keys(callGraph.nodes).length).toBe(2);
    const recEdge = callGraph.edges.find(e => e.isRecursive);
    expect(recEdge).toBeDefined();
    expect(recEdge?.fromFunctionId).toBe(factFunc?.id);
    expect(recEdge?.toFunctionId).toBe(factFunc?.id);
  });

  it('detects tail calls when jmp jumps outside the current function', () => {
    const input = `
      0000000000001000 <caller>:
        1000: 55                      push rbp
        1001: 48 89 e5                mov rbp, rsp
        1004: e9 17 00 00 00          jmp 1020 <target>

      0000000000001020 <target>:
        1020: 55                      push rbp
        1021: 48 89 e5                mov rbp, rsp
        1024: c3                      ret
    `;
    const program = parseAssembly(input);
    const rawFunctions = detectFunctions(program);
    const { callGraph, updatedFunctions } = buildCallGraph(rawFunctions);

    const callerFunc = updatedFunctions.find(f => f.name === 'caller');
    expect(callerFunc?.hasTailCalls).toBe(true);

    const tailEdge = callGraph.edges.find(e => e.isTailCall);
    expect(tailEdge).toBeDefined();
    expect(tailEdge?.fromFunctionId).toBe(callerFunc?.id);
  });
});

describe('Stack Frame and Argument Candidate Analysis', () => {
  it('detects frame size, stack variables, and System V argument registers', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/objdump_intel.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);
    const functions = detectFunctions(program);

    const factFunc = functions.find(f => f.name === 'fact');
    expect(factFunc).toBeDefined();
    expect(factFunc?.frameSize).toBe(0x10);

    // [rbp-0x4] variable detection
    const var4 = factFunc?.stackVariables.find(v => v.offset === 4);
    expect(var4).toBeDefined();
    expect(var4?.name).toBe('var_4');

    // edi used in fact -> arg1
    const arg1 = factFunc?.argumentCandidates.find(a => a.argIndex === 1);
    expect(arg1).toBeDefined();
    expect(arg1?.family).toBe('rdi');
    expect(arg1?.suggestedName).toBe('arg1');
  });
});

describe('Condition Interpreter', () => {
  it('translates cmp + jle into human readable Turkish condition', () => {
    const input = `
      0x1000: cmp eax, 5
      0x1003: jle 0x1015
    `;
    const program = parseAssembly(input);
    const cond = interpretCondition(program.instructions[1], program.instructions[0]);

    expect(cond).toBeDefined();
    expect(cond?.summary).toContain('eğer eax <= 5 ise 0x1015');
    expect(cond?.operator).toBe('<=');
    expect(cond?.isSigned).toBe(true);
  });

  it('translates unsigned comparisons (cmp + ja)', () => {
    const input = `
      0x1000: cmp eax, 10
      0x1003: ja 0x1020
    `;
    const program = parseAssembly(input);
    const cond = interpretCondition(program.instructions[1], program.instructions[0]);

    expect(cond).toBeDefined();
    expect(cond?.operator).toContain('işaretsiz');
    expect(cond?.isSigned).toBe(false);
  });

  it('translates test eax, eax + jz into equality to 0', () => {
    const input = `
      0x1000: test eax, eax
      0x1002: jz 0x1020
    `;
    const program = parseAssembly(input);
    const cond = interpretCondition(program.instructions[1], program.instructions[0]);

    expect(cond).toBeDefined();
    expect(cond?.summary).toContain('eğer eax == 0 ise 0x1020');
  });
});

describe('Pseudo-Code Generator', () => {
  it('generates concise pseudo-code summary for basic blocks', () => {
    const input = `
      0x1000: mov DWORD PTR [rbp-0x4], 1
      0x1007: add DWORD PTR [rbp-0x4], 5
      0x100b: cmp DWORD PTR [rbp-0x4], 10
      0x100f: jle 0x1020
    `;
    const program = parseAssembly(input);
    const funcs = detectFunctions(program);
    const block = Object.values(funcs[0].cfg.blocks)[0];

    const lines = generateBlockPseudoCode(block);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.some(l => l.includes('var_4'))).toBe(true);
    expect(lines.some(l => l.includes('if'))).toBe(true);
  });

  it('substitutes argument registers (arg1..argN) in pseudo-code and conditions', () => {
    const input = `
0000000000001040 <fact>:
    1040: push rbp
    1041: mov rbp, rsp
    1044: sub rsp, 0x10
    1048: mov DWORD PTR [rbp-0x4], edi
    104b: cmp DWORD PTR [rbp-0x4], 0x1
    104f: jg 1058 <fact+0x18>
    1051: mov eax, 1
    1056: jmp 106a <fact+0x2a>
    1058: mov eax, DWORD PTR [rbp-0x4]
    105b: ret
    `;
    const program = parseAssembly(input);
    const funcs = detectFunctions(program);
    const factFunc = funcs[0];
    const entryBlock = factFunc.cfg.blocks[factFunc.cfg.entryBlockId];

    const pseudo = generateBlockPseudoCode(entryBlock, {
      functionRange: { start: factFunc.startAddress, end: factFunc.endAddress },
      functionName: factFunc.name,
    });

    // 1. Should generate var_4 = arg1;
    expect(pseudo.some(l => l.includes('var_4 = arg1;'))).toBe(true);
    // 2. Should generate if (arg1 > 0x1) goto block_1058;
    expect(pseudo.some(l => l.includes('if (arg1 > 0x1) goto block_1058;'))).toBe(true);

    // If user provides custom label, user label takes precedence
    const customPseudo = generateBlockPseudoCode(entryBlock, {
      userLabels: { edi: 'user_count', var_4: 'n', block_1058: 'recursive_case' },
      functionRange: { start: factFunc.startAddress, end: factFunc.endAddress },
      functionName: factFunc.name,
    });
    expect(customPseudo.some(l => l.includes('n = user_count;'))).toBe(true);
    expect(customPseudo.some(l => l.includes('if (n > 0x1) goto recursive_case;'))).toBe(true);
  });

  it('formats intra-function targets as block names and keeps external offsets', () => {
    const input = `
0000000000001000 <test_fn>:
    1000: cmp edi, 0
    1003: jg 1020 <test_fn+0x20>
    1005: jmp 2050 <external_fn+0x50>
    1020: ret
    `;
    const program = parseAssembly(input);
    const funcs = detectFunctions(program);
    const testFunc = funcs[0];
    const insts = program.instructions;

    // Intra-function jump (1003 -> 1020)
    const intraCond = interpretCondition(insts[1], insts[0], {
      functionRange: { start: testFunc.startAddress, end: testFunc.endAddress },
      functionName: testFunc.name,
    });
    expect(intraCond?.targetDescription).toBe('block_1020');

    // External jump operand (1005 -> external_fn+0x50)
    const extTarget = formatOperandForDisplay(insts[2].operands[0], {
      functionRange: { start: 0x1000, end: 0x1025 },
      functionName: 'test_fn',
    });
    expect(extTarget).toBe('external_fn+0x50');
  });

  it('handles bitwise mask test and sign conditions (js / jns)', () => {
    const input = `
      0x1000: test al, 1
      0x1002: jnz 0x1020
      0x1004: test ecx, ecx
      0x1006: jne 0x1030
      0x1008: cmp edx, 0
      0x100b: js 0x1040
      0x100d: cmp edx, 0
      0x1010: jns 0x1050
    `;
    const program = parseAssembly(input);
    const insts = program.instructions;

    // Mask test
    const maskCond = interpretCondition(insts[1], insts[0]);
    expect(maskCond?.summary).toContain('&');
    expect(maskCond?.shortTaken).toContain('!= 0');

    // test ecx, ecx + jne (ecx maps to arg4)
    const nonZeroCond = interpretCondition(insts[3], insts[2]);
    expect(nonZeroCond?.summary).toContain('arg4 != 0');

    // js (negative)
    const jsCond = interpretCondition(insts[5], insts[4]);
    expect(jsCond?.summary).toContain('negatif');
    expect(jsCond?.shortTaken).toBe('doğru (< 0)');

    // jns (non-negative)
    const jnsCond = interpretCondition(insts[7], insts[6]);
    expect(jnsCond?.summary).toContain('pozitif');
    expect(jnsCond?.shortTaken).toBe('doğru (>= 0)');
  });

  it('handles arithmetic operations and loops in pseudo-code generation', () => {
    const input = `
      0x1000: inc eax
      0x1002: dec ebx
      0x1004: sub ecx, 2
      0x1007: ret
    `;
    const program = parseAssembly(input);
    const funcs = detectFunctions(program);
    const block = Object.values(funcs[0].cfg.blocks)[0];
    block.isLoopHeader = true;

    const pseudo = generateBlockPseudoCode(block);
    expect(pseudo.some(l => l.includes('eax++;'))).toBe(true);
    expect(pseudo.some(l => l.includes('ebx--;'))).toBe(true);
    expect(pseudo.some(l => l.includes('arg4 = arg4 - 2;'))).toBe(true);
    expect(pseudo.some(l => l.includes('return eax;'))).toBe(true);
    expect(pseudo.some(l => l.includes('Döngü Başlangıcı'))).toBe(true);

    // Empty block test
    const emptyBlock = { ...block, instructions: [] };
    const emptyPseudo = generateBlockPseudoCode(emptyBlock);
    expect(emptyPseudo[0]).toContain('Boş blok');
  });

  it('detects leaf function and computes red zone size from lowest negative stack displacement', () => {
    const input = `
      0000000000001500 <leaf_fn>:
        1500: 89 7c 24 e8             mov DWORD PTR [rsp-0x18], edi
        1504: 89 74 24 d8             mov DWORD PTR [rsp-0x28], esi
        1508: 8b 44 24 e8             mov eax, DWORD PTR [rsp-0x18]
        150c: 03 44 24 d8             add eax, DWORD PTR [rsp-0x28]
        1510: c3                      ret
    `;
    const program = parseAssembly(input);
    const funcs = detectFunctions(program);
    expect(funcs.length).toBe(1);
    const fn = funcs[0];

    expect(fn.isLeaf).toBe(true);
    expect(fn.frameSize).toBeUndefined();
    expect(fn.redZoneSize).toBe(0x28); // 40 bytes

    const { callGraph } = buildCallGraph(funcs);
    const node = callGraph.nodes[fn.id];
    expect(node.isLeaf).toBe(true);
    expect(node.redZoneSize).toBe(0x28);
  });

  it('applies intra-block copy propagation to condition summaries (eax replaced with var_4)', () => {
    const input = `
      0x1000: mov eax, DWORD PTR [rbp-0x4]
      0x1003: mov edx, DWORD PTR [rbp-0x14]
      0x1006: cmp eax, edx
      0x1008: jl 0x1020
    `;
    const program = parseAssembly(input);
    const insts = program.instructions;
    const cond = interpretCondition(insts[3], insts[2], {
      blockInstructions: insts,
    });

    expect(cond).toBeDefined();
    expect(cond?.summary).toContain('var_4 < var_14');
    expect(cond?.leftOperand).toBe('var_4');
    expect(cond?.rightOperand).toBe('var_14');
  });

  it('invalidates copy propagation when a register is overwritten before cmp', () => {
    const input = `
      0x1000: mov eax, DWORD PTR [rbp-0x4]
      0x1003: add eax, 1
      0x1006: cmp eax, 10
      0x1009: jge 0x1020
    `;
    const program = parseAssembly(input);
    const insts = program.instructions;
    const cond = interpretCondition(insts[3], insts[2], {
      blockInstructions: insts,
    });

    expect(cond).toBeDefined();
    expect(cond?.summary).toContain('eax >= 10');
    expect(cond?.leftOperand).toBe('eax');
  });

  it('correctly processes Test 3: comprehensive call graph with call, recursion, tail call, and leaf function', () => {
    const input = `
      0000000000001000 <main>:
        1000: 55                      push rbp
        1001: 48 89 e5                mov rbp, rsp
        1004: 48 83 ec 10             sub rsp, 0x10
        1008: bf 05 00 00 00          mov edi, 5
        100d: e8 2e 00 00 00          call 1040 <fact>
        1012: 89 45 fc                mov DWORD PTR [rbp-4], eax
        1015: e9 56 00 00 00          jmp 1070 <tail_helper>

      0000000000001040 <fact>:
        1040: 55                      push rbp
        1041: 48 89 e5                mov rbp, rsp
        1044: 48 83 ec 10             sub rsp, 0x10
        1048: 89 7d fc                mov DWORD PTR [rbp-4], edi
        104b: 83 7d fc 01             cmp DWORD PTR [rbp-4], 1
        104f: 7f 07                   jg 1058 <fact+0x18>
        1051: b8 01 00 00 00          mov eax, 1
        1056: eb 12                   jmp 106a <fact+0x2a>
        1058: 8b 45 fc                mov eax, DWORD PTR [rbp-4]
        105b: 83 e8 01                sub eax, 1
        105e: 89 c7                   mov edi, eax
        1060: e8 db ff ff ff          call 1040 <fact>
        1065: 0f af 45 fc             imul eax, DWORD PTR [rbp-4]
        106a: c9                      leave
        106b: c3                      ret

      0000000000001070 <tail_helper>:
        1070: 55                      push rbp
        1071: 48 89 e5                mov rbp, rsp
        1074: 31 c0                   xor eax, eax
        1076: 5d                      pop rbp
        1077: c3                      ret
    `;
    const program = parseAssembly(input);
    const rawFunctions = detectFunctions(program);
    expect(rawFunctions.length).toBe(3);

    const { callGraph, updatedFunctions } = buildCallGraph(rawFunctions);

    const mainFunc = updatedFunctions.find(f => f.name === 'main');
    const factFunc = updatedFunctions.find(f => f.name === 'fact');
    const tailHelperFunc = updatedFunctions.find(f => f.name === 'tail_helper');

    expect(mainFunc).toBeDefined();
    expect(factFunc).toBeDefined();
    expect(tailHelperFunc).toBeDefined();

    // Call relationships
    expect(mainFunc?.callees).toContain(factFunc?.id);
    expect(mainFunc?.hasTailCalls).toBe(true);

    expect(factFunc?.isRecursive).toBe(true);
    expect(tailHelperFunc?.isLeaf).toBe(true);

    // CallGraph edges
    const tailEdge = callGraph.edges.find(e => e.isTailCall);
    expect(tailEdge).toBeDefined();
    expect(tailEdge?.fromFunctionId).toBe(mainFunc?.id);
    expect(tailEdge?.toFunctionId).toBe(tailHelperFunc?.id);

    const recEdge = callGraph.edges.find(e => e.isRecursive);
    expect(recEdge).toBeDefined();
    expect(recEdge?.fromFunctionId).toBe(factFunc?.id);
    expect(recEdge?.toFunctionId).toBe(factFunc?.id);
  });
});
