import { Instruction, Operand, ParsedProgram, ParseWarning } from './types.js';
import { classifyInstruction, isFoldableNoise, PREFIXES } from './classifier.js';
import { normalizeAttMnemonic, parseOperand } from './normalizer.js';

let instructionCounter = 0;
function nextInstructionId(): string {
  instructionCounter += 1;
  return `ins_${instructionCounter}`;
}

export function resetInstructionCounter(): void {
  instructionCounter = 0;
}

/**
 * Checks if a text line appears to be AT&T syntax.
 */
function detectAttSyntax(lines: string[]): boolean {
  let attCount = 0;
  let intelCount = 0;

  for (const line of lines) {
    if (line.includes('%rax') || line.includes('%rbp') || line.includes('%rsp') || line.includes('%rdi') || line.includes('%esi') || line.includes('(%r') || line.includes('$0x')) {
      attCount += 1;
    }
    if (line.includes('DWORD PTR') || line.includes('QWORD PTR') || line.includes('BYTE PTR') || /\[[a-z0-9\s+-]+\]/i.test(line)) {
      intelCount += 1;
    }
  }

  return attCount > intelCount;
}

/**
 * Separates comment from instruction line.
 */
function splitComment(line: string): { content: string; comment?: string } {
  // Comments can start with # or ; or //
  // Note: in objdump, comments often start with #, e.g. "call 1040 <puts@plt>  # 1040 <puts@plt>"
  const commentIdx = line.search(/[#;]|\/\//);
  if (commentIdx !== -1) {
    return {
      content: line.slice(0, commentIdx).trim(),
      comment: line.slice(commentIdx).trim(),
    };
  }
  return { content: line.trim() };
}

/**
 * Parses comma-separated operands considering nested brackets or parentheses.
 */
function splitOperands(operandsStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < operandsStr.length; i++) {
    const char = operandsStr[i];
    if (char === '[' || char === '(') {
      depth++;
    } else if (char === ']' || char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Main x86-64 assembly parser supporting objdump, GDB, Intel, and AT&T.
 */
export function parseAssembly(rawText: string): ParsedProgram {
  resetInstructionCounter();
  const rawLines = rawText.split(/\r?\n/);
  const isGlobalAtt = detectAttSyntax(rawLines);

  const instructions: Instruction[] = [];
  const warnings: ParseWarning[] = [];
  const symbols: Record<number, string> = {};

  let autoAddress = 0x1000;

  for (let lineNum = 0; lineNum < rawLines.length; lineNum++) {
    const rawLine = rawLines[lineNum];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Filter GDB header / footer noise
    if (trimmed.startsWith('Dump of assembler code') || trimmed.startsWith('End of assembler dump.')) {
      continue;
    }

    // 1. Symbol Header Detection:
    // e.g. "0000000000001139 <main>:" or "<main>:" or "main:" or ".L2:"
    const symMatchWithAngle = trimmed.match(/^(?:([0-9a-fA-F]+)\s+)?<([^>]+)>:\s*$/);
    const symMatchPlain = trimmed.match(/^([a-zA-Z_.][a-zA-Z0-9_$.@]*):\s*$/);

    if (symMatchWithAngle) {
      const addr = symMatchWithAngle[1] ? parseInt(symMatchWithAngle[1], 16) : autoAddress;
      const symName = symMatchWithAngle[2];
      symbols[addr] = symName;
      continue;
    } else if (symMatchPlain) {
      const symName = symMatchPlain[1];
      if (!/^[0-9a-fA-F]+$/.test(symName)) {
        symbols[autoAddress] = symName;
      }
      continue;
    }

    const { content, comment } = splitComment(trimmed);
    if (!content) continue;

    try {
      // 2. Format Line Matching:
      // Case A: objdump format: "  1139:  f3 0f 1e fa   endbr64"
      // or GDB format: "   0x0000000000001139 <+0>:  endbr64"
      // or Simple address format: "0x1139: mov eax, 5"
      // or Plain assembly: "mov eax, 5"
      let address = autoAddress;
      let bytes: string | undefined;
      let remainder = content;

      // Match address prefix:
      // Can be: "0x0000000000001139 <+0>: ...", "1139: f3 0f 1e fa  endbr64", "0x1000: mov eax, 5", "1000: mov eax, 5"
      const addrMatch = remainder.match(/^(?:0x)?([0-9a-fA-F]+)\s*(?:<[+0-9a-zA-Z_.-]+>)?:\s*(.*)$/);
      if (addrMatch && addrMatch[2].length > 0) {
        address = parseInt(addrMatch[1], 16);
        const afterColon = addrMatch[2].trim();

        // Check if there are objdump hex bytes: e.g. "48 89 e5   mov rbp, rsp"
        const bytesMatch = afterColon.match(/^((?:[0-9a-fA-F]{2}\s+)+)\s*(.*)$/);
        if (bytesMatch && bytesMatch[2].length > 0) {
          bytes = bytesMatch[1].trim();
          remainder = bytesMatch[2].trim();
        } else {
          remainder = afterColon;
        }
      }

      // If no address was matched in the line, use autoAddress and advance by 4
      if (address === autoAddress) {
        autoAddress += 4;
      } else {
        autoAddress = address + 4;
      }

      // Check for prefixes like rep, lock, bnd, etc.
      let prefix: string | undefined;
      const firstWord = remainder.split(/\s+/)[0].toLowerCase();
      if (PREFIXES.has(firstWord)) {
        prefix = firstWord;
        remainder = remainder.slice(firstWord.length).trim();
      }

      // Extract mnemonic and raw operands
      const parts = remainder.match(/^([a-zA-Z0-9_.]+)(?:\s+(.*))?$/);
      if (!parts) {
        // Unknown line structure, mark as unknown
        instructions.push({
          id: nextInstructionId(),
          address,
          bytes,
          prefix,
          mnemonic: remainder || 'unknown',
          operands: [],
          category: 'OTHER',
          raw: rawLine,
          comment,
          isUnknown: true,
        });
        warnings.push({
          line: lineNum + 1,
          raw: rawLine,
          message: `Satır ayrıştırılamadı: "${rawLine}"`,
        });
        continue;
      }

      let mnemonic = parts[1];
      const rawOperandsStr = parts[2] ? parts[2].trim() : '';

      // Check line-specific AT&T detection if registers start with % or immediates with $
      const isAttLine = isGlobalAtt || rawOperandsStr.includes('%') || rawOperandsStr.includes('$');

      let normalizedMnemonic = mnemonic;
      if (isAttLine) {
        normalizedMnemonic = normalizeAttMnemonic(mnemonic);
      }

      let rawOps = rawOperandsStr ? splitOperands(rawOperandsStr) : [];

      // For AT&T 2-operand instructions, reverse operand order (src, dst -> dst, src)
      if (isAttLine && rawOps.length === 2) {
        // Exclude instructions that don't reverse operands or are single direction
        rawOps = [rawOps[1], rawOps[0]];
      } else if (isAttLine && rawOps.length === 3 && normalizedMnemonic === 'imul') {
        // AT&T imul $5, %rax, %rbx -> Intel imul rbx, rax, 5
        rawOps = [rawOps[2], rawOps[1], rawOps[0]];
      }

      // Parse operands into Operand structures
      const operands: Operand[] = rawOps.map(op => parseOperand(op, isAttLine));

      const category = classifyInstruction(normalizedMnemonic, operands);
      const isNoise = isFoldableNoise(normalizedMnemonic);

      // Resolve jump/call targetAddress if operand is a label or immediate
      let targetAddress: number | undefined;
      if ((category === 'COND_JUMP' || category === 'UNCOND_JUMP' || category === 'CALL') && operands.length > 0) {
        const firstOp = operands[0];
        if (firstOp.kind === 'label' && firstOp.address !== undefined) {
          targetAddress = firstOp.address;
        } else if (firstOp.kind === 'imm') {
          targetAddress = Number(firstOp.value);
        }
      }

      instructions.push({
        id: nextInstructionId(),
        address,
        bytes,
        prefix,
        mnemonic: normalizedMnemonic,
        operands,
        category,
        raw: rawLine,
        comment,
        isFoldableNoise: isNoise,
        targetAddress,
      });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      instructions.push({
        id: nextInstructionId(),
        address: autoAddress,
        mnemonic: 'unknown',
        operands: [],
        category: 'OTHER',
        raw: rawLine,
        comment,
        isUnknown: true,
      });
      warnings.push({
        line: lineNum + 1,
        raw: rawLine,
        message: `Hata oluştu: ${errMsg}`,
      });
    }
  }

  // 3. Post-pass: Resolve symbolic label addresses (e.g. .L2, .L3, loop_fn)
  const nameToAddress = new Map<string, number>();
  for (const [addrStr, name] of Object.entries(symbols)) {
    const addr = Number(addrStr);
    if (!isNaN(addr)) {
      nameToAddress.set(name, addr);
      nameToAddress.set(name.replace(/^<|>$/g, ''), addr);
    }
  }

  for (const inst of instructions) {
    for (const op of inst.operands) {
      if (op.kind === 'label' && op.address === undefined && op.name) {
        const resolved = nameToAddress.get(op.name);
        if (resolved !== undefined) {
          op.address = resolved;
          if (inst.targetAddress === undefined) {
            inst.targetAddress = resolved;
          }
        }
      }
    }
  }

  return {
    instructions,
    warnings,
    symbols,
    rawText,
  };
}
