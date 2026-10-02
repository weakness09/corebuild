import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { detectFunctions } from '../../src/core/functions/detector.js';
import { serializeJsonWithBigInt, deserializeJsonWithBigInt } from '../../src/core/utils/json.js';
import fs from 'fs';
import path from 'path';

describe('New Fixtures Verification', () => {
  it('parses and analyzes -O2 optimized inlined assembly correctly', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/o2_inlined.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    expect(program.instructions.length).toBeGreaterThan(8);
    const functions = detectFunctions(program);
    expect(functions.length).toBe(1);

    const fn = functions[0];
    expect(fn.name).toBe('process_array_optimized');

    // Verify natural loop in -O2 code
    expect(fn.cfg.naturalLoops.length).toBe(1);
    expect(fn.cfg.naturalLoops[0].headerBlockId).toBe('block_1318');
  });

  it('correctly handles function pointers and indirect calls', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/func_pointer.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    const indCalls = program.instructions.filter(i => i.category === 'INDIRECT_CALL');
    expect(indCalls.length).toBe(2);

    const call1 = indCalls[0];
    expect(call1.operands[0].kind).toBe('reg');
    if (call1.operands[0].kind === 'reg') {
      expect(call1.operands[0].name).toBe('rax');
    }

    const call2 = indCalls[1];
    expect(call2.operands[0].kind).toBe('mem');

    const functions = detectFunctions(program);
    expect(functions.length).toBe(1);
  });

  it('gracefully handles malformed, corrupt and unknown lines without crashing', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/malformed_corrupt.asm');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const program = parseAssembly(content);

    expect(program.instructions.length).toBeGreaterThan(0);
    expect(program.warnings.length).toBeGreaterThan(0);

    const unknownInsts = program.instructions.filter(i => i.isUnknown);
    expect(unknownInsts.length).toBeGreaterThanOrEqual(1);

    // CFG should still build without throwing
    const functions = detectFunctions(program);
    expect(functions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('JSON BigInt Serializer / Deserializer', () => {
  it('correctly serializes and deserializes objects containing 64-bit BigInt values', () => {
    const data = {
      address: 0x7ffff7dd5000n,
      size: 4096n,
      name: 'mapped_memory',
      nested: {
        entry: 0xdeadbeefcafebaben,
      },
    };

    const json = serializeJsonWithBigInt(data);
    expect(json).toContain('__bigint');

    const parsed = deserializeJsonWithBigInt<typeof data>(json);
    expect(parsed.address).toBe(0x7ffff7dd5000n);
    expect(parsed.size).toBe(4096n);
    expect(parsed.nested.entry).toBe(0xdeadbeefcafebaben);
    expect(parsed.name).toBe('mapped_memory');
  });
});
