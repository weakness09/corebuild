import { ParsedProgram } from '../parser/types.js';
import { FunctionInfo } from './types.js';
import { buildCFG } from '../cfg/cfgBuilder.js';
import { analyzeStackAndArguments } from './frameAnalysis.js';

export function detectFunctions(program: ParsedProgram): FunctionInfo[] {
  const instructions = program.instructions;
  if (instructions.length === 0) return [];

  const entrySet = new Set<number>();
  const validAddresses = new Set<number>(instructions.map(i => i.address));

  // (a) Symbol headers from parsed input
  for (const addrStr of Object.keys(program.symbols)) {
    const addr = parseInt(addrStr, 10);
    if (validAddresses.has(addr)) {
      entrySet.add(addr);
    }
  }

  // (b) Call targets within our code
  for (const inst of instructions) {
    if (inst.category === 'CALL' && inst.targetAddress !== undefined) {
      if (validAddresses.has(inst.targetAddress)) {
        entrySet.add(inst.targetAddress);
      }
    }
  }

  // (c) Prologue patterns: "push rbp; mov rbp, rsp" or "endbr64; push rbp"
  for (let i = 0; i < instructions.length - 1; i++) {
    const curr = instructions[i];
    const next = instructions[i + 1];

    if (
      curr.mnemonic === 'push' &&
      curr.operands[0]?.kind === 'reg' &&
      curr.operands[0].name === 'rbp' &&
      next.mnemonic === 'mov' &&
      next.operands[0]?.kind === 'reg' &&
      next.operands[0].name === 'rbp' &&
      next.operands[1]?.kind === 'reg' &&
      next.operands[1].name === 'rsp'
    ) {
      // Check if previous was endbr64
      if (i > 0 && instructions[i - 1].mnemonic === 'endbr64') {
        entrySet.add(instructions[i - 1].address);
      } else {
        entrySet.add(curr.address);
      }
    }
  }

  // (d) Always include the first instruction if no entries found
  if (entrySet.size === 0) {
    entrySet.add(instructions[0].address);
  }

  // Sort candidate entries
  const sortedEntries = Array.from(entrySet).sort((a, b) => a - b);

  // Group instructions into functions
  const functions: FunctionInfo[] = [];

  for (let eIdx = 0; eIdx < sortedEntries.length; eIdx++) {
    const startAddr = sortedEntries[eIdx];
    const nextStartAddr = sortedEntries[eIdx + 1];

    const funcInsts = instructions.filter(
      inst => inst.address >= startAddr && (nextStartAddr === undefined || inst.address < nextStartAddr)
    );

    if (funcInsts.length === 0) continue;

    const endAddr = funcInsts[funcInsts.length - 1].address;
    const hexAddr = startAddr.toString(16);
    const funcName = program.symbols[startAddr] || `sub_${hexAddr}`;
    const funcId = `func_${hexAddr}`;

    // Build CFG for this specific function
    const cfg = buildCFG(funcInsts, { functionId: funcId });

    // Analyze stack and arguments
    const { frameSize, redZoneSize, isLeaf, stackVariables, argumentCandidates } = analyzeStackAndArguments(funcInsts);

    functions.push({
      id: funcId,
      name: funcName,
      startAddress: startAddr,
      endAddress: endAddr,
      instructions: funcInsts,
      cfg,
      frameSize,
      redZoneSize,
      isLeaf,
      stackVariables,
      argumentCandidates,
      callers: [],
      callees: [],
      isRecursive: false,
      hasTailCalls: false,
    });
  }

  return functions;
}
