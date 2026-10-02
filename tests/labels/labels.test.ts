import { describe, it, expect } from 'vitest';
import { validateLabel, filterLabels, buildLabelMap } from '../../src/core/labels/labelManager.js';
import { substituteLabels } from '../../src/core/labels/substitutor.js';
import { computeSha256, exportLabelsToJson, importLabelsFromJson } from '../../src/core/labels/storage.js';
import { exportCFGToDot, exportCallGraphToDot } from '../../src/core/export/dotExport.js';
import { parseAssembly } from '../../src/core/parser/parser.js';
import { buildCFG } from '../../src/core/cfg/cfgBuilder.js';
import { buildCallGraph } from '../../src/core/functions/callGraph.js';
import { detectFunctions } from '../../src/core/functions/detector.js';

describe('Label Manager & Conflict Detection', () => {
  it('validates label names and prevents duplicate names on different targets', () => {
    const existing = [
      { id: 'l1', target: 'function' as const, key: '0x1040', name: 'calculate_sum' },
    ];

    const valid = validateLabel(existing, {
      target: 'function',
      key: '0x1040',
      name: 'calculate_sum',
    }, 'l1');
    expect(valid.isValid).toBe(true);

    const conflict = validateLabel(existing, {
      target: 'function',
      key: '0x1080',
      name: 'calculate_sum',
    });
    expect(conflict.isValid).toBe(false);
    expect(conflict.error).toContain('zaten');
  });

  it('filters labels by search query and target', () => {
    const labels = [
      { id: '1', target: 'function' as const, key: '0x1000', name: 'entry_main', note: 'program entry' },
      { id: '2', target: 'variable' as const, key: 'var_4', name: 'counter_var' },
      { id: '3', target: 'address' as const, key: '0x1020', name: 'loop_check' },
    ];

    const searchRes = filterLabels(labels, 'counter');
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].name).toBe('counter_var');

    const targetRes = filterLabels(labels, '', 'function');
    expect(targetRes.length).toBe(1);
    expect(targetRes[0].name).toBe('entry_main');
  });
});

describe('Label Substitution', () => {
  it('replaces target keys with user defined label names', () => {
    const labelMap = {
      '0x1040': 'calculate_factorial',
      'var_4': 'loop_counter',
      'sub_1139': 'main_entry',
    };

    const asmText = 'call 0x1040\nmov eax, var_4\njmp sub_1139';
    const replaced = substituteLabels(asmText, labelMap);

    expect(replaced).toContain('call calculate_factorial');
    expect(replaced).toContain('mov eax, loop_counter');
    expect(replaced).toContain('jmp main_entry');
  });
});

describe('Label Storage & SHA-256 Integrity', () => {
  it('computes SHA-256 and exports/imports label bundles with warning on mismatch', async () => {
    const asm1 = 'mov eax, 1\nret';
    const asm2 = 'mov eax, 2\nret';

    const sha1 = await computeSha256(asm1);
    const sha2 = await computeSha256(asm2);

    expect(sha1).not.toBe(sha2);

    const labels = [
      { id: '1', target: 'function' as const, key: '0x1000', name: 'sample_fn' },
    ];

    const json = exportLabelsToJson(sha1, labels);
    expect(json).toContain(sha1);

    // Import into same sha
    const matchingImport = importLabelsFromJson(json, sha1);
    expect(matchingImport.warning).toBeUndefined();
    expect(matchingImport.labels.length).toBe(1);

    // Import into different sha triggers warning
    const mismatchImport = importLabelsFromJson(json, sha2);
    expect(mismatchImport.warning).toBeDefined();
    expect(mismatchImport.warning).toContain('uyuşmuyor');
  });
});

describe('Graphviz DOT Export', () => {
  it('generates valid DOT format for CFG and Call Graph', () => {
    const input = `
      0x1000: cmp eax, 0
      0x1003: jne 0x1009
      0x1005: mov eax, 1
      0x1009: ret
    `;
    const program = parseAssembly(input);
    const cfg = buildCFG(program.instructions);
    const dotCFG = exportCFGToDot(cfg, 'test_func');

    expect(dotCFG).toContain('digraph "test_func"');
    expect(dotCFG).toContain('block_1000');
    expect(dotCFG).toContain('->');

    const funcs = detectFunctions(program);
    const { callGraph } = buildCallGraph(funcs);
    const dotCall = exportCallGraphToDot(callGraph);

    expect(dotCall).toContain('digraph "CallGraph"');
  });
});

describe('Label Utilities & LocalStorage Mocking', () => {
  it('builds label map with scope filter and supports localStorage', async () => {
    const labels = [
      { id: '1', target: 'address' as const, key: '0x1000', name: 'main_entry', scope: '0x1000' },
      { id: '2', target: 'variable' as const, key: 'var_4', name: 'counter', scope: '0x2000' },
    ];

    const mapScoped = buildLabelMap(labels, '0x1000');
    expect(mapScoped['0x1000']).toBe('main_entry');
    expect(mapScoped['var_4']).toBeUndefined();

    // Mock localStorage
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v; },
    };
    // @ts-expect-error test mock
    globalThis.localStorage = mockStorage;

    const { saveLabelsToStorage, loadLabelsFromStorage } = await import('../../src/core/labels/storage.js');
    saveLabelsToStorage('test_sha', labels);
    const loaded = loadLabelsFromStorage('test_sha');
    expect(loaded.length).toBe(2);
    expect(loaded[0].name).toBe('main_entry');
  });

  it('serializes and deserializes BigInt and address objects safely', async () => {
    const {
      serializeJsonWithBigInt,
      deserializeJsonWithBigInt,
      toHexAddress,
      parseHexAddress,
    } = await import('../../src/core/utils/json.js');

    const obj = {
      address: 0x40001000n,
      val: -9999999999999999n,
      str: 'test',
      num: 42,
    };

    const json = serializeJsonWithBigInt(obj);
    expect(json).toContain('"__bigint": "1073745920"');

    const parsed = deserializeJsonWithBigInt<typeof obj>(json);
    expect(parsed.address).toBe(0x40001000n);
    expect(parsed.val).toBe(-9999999999999999n);
    expect(parsed.str).toBe('test');
    expect(parsed.num).toBe(42);

    expect(toHexAddress(0x1000n)).toBe('0x1000');
    expect(parseHexAddress('0x2000')).toBe(0x2000n);
    expect(parseHexAddress('3000')).toBe(0x3000n);
  });
});

