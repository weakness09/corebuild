import { Operand } from './types.js';
import { getRegisterInfo } from './registers.js';

/**
 * Normalizes an AT&T mnemonic (e.g., movq, movl, addq) into a standard mnemonic.
 */
export function normalizeAttMnemonic(mnemonic: string): string {
  const m = mnemonic.toLowerCase().trim();

  // If it's a known noise or jump/call, return base
  if (m === 'endbr64' || m === 'nop' || m.startsWith('j') || m.startsWith('call')) {
    if (m === 'callq') return 'call';
    if (m === 'jmpq') return 'jmp';
    return m;
  }

  // Remove AT&T size suffixes when appropriate
  const suffixes = ['q', 'l', 'w', 'b'];
  for (const s of suffixes) {
    if (m.endsWith(s) && m.length > 2) {
      const base = m.slice(0, -1);
      // check if base is a recognized mnemonic or prefix
      const commonMnemonics = [
        'mov', 'add', 'sub', 'xor', 'and', 'or', 'cmp', 'test',
        'imul', 'inc', 'dec', 'push', 'pop', 'neg', 'not', 'lea',
        'sal', 'sar', 'shl', 'shr'
      ];
      if (commonMnemonics.includes(base)) {
        return base;
      }
    }
  }

  return m;
}

/**
 * Parses memory size keyword from Intel syntax (e.g. QWORD PTR, DWORD PTR, BYTE PTR).
 */
export function parseSizeDirective(text: string): { size?: number; cleaned: string } {
  const upper = text.toUpperCase();
  let size: number | undefined;

  if (upper.includes('QWORD PTR')) size = 8;
  else if (upper.includes('DWORD PTR')) size = 4;
  else if (upper.includes('WORD PTR')) size = 2;
  else if (upper.includes('BYTE PTR')) size = 1;
  else if (upper.includes('XMMWORD PTR')) size = 16;
  else if (upper.includes('YMMWORD PTR')) size = 32;

  const cleaned = text
    .replace(/(?:QWORD|DWORD|WORD|BYTE|XMMWORD|YMMWORD)\s+PTR\s*/gi, '')
    .trim();

  return { size, cleaned };
}

/**
 * Parses an AT&T memory expression like `disp(base, index, scale)` or `-0x14(%rbp)`.
 */
export function parseAttMemory(opText: string): Operand | null {
  // AT&T indirect jump prefix '*'
  let text = opText.trim();
  if (text.startsWith('*')) {
    text = text.slice(1).trim();
  }

  // disp(base, index, scale) pattern
  const match = text.match(/^(?:([+-]?(?:0x[0-9a-fA-F]+|\d+)))?\s*\(\s*(%[a-zA-Z0-9]+)?\s*(?:,\s*(%[a-zA-Z0-9]+))?\s*(?:,\s*(\d+))?\s*\)$/);
  if (!match) return null;

  const dispStr = match[1];
  const baseStr = match[2];
  const indexStr = match[3];
  const scaleStr = match[4];

  let disp: number | undefined;
  if (dispStr) {
    disp = dispStr.startsWith('0x') || dispStr.startsWith('-0x') || dispStr.startsWith('+0x')
      ? parseInt(dispStr, 16)
      : parseInt(dispStr, 10);
  }

  const base = baseStr ? baseStr.replace(/^%/, '').toLowerCase() : undefined;
  const index = indexStr ? indexStr.replace(/^%/, '').toLowerCase() : undefined;
  const scale = scaleStr ? parseInt(scaleStr, 10) : undefined;

  const ripRelative = base === 'rip';

  return {
    kind: 'mem',
    base,
    index,
    scale,
    disp,
    ripRelative,
    raw: opText.trim(),
  };
}

/**
 * Parses an Intel memory expression like `[rbp - 0x14]`, `[rax + rdx*4 + 0x10]`, `[rip + 0x200]`.
 */
export function parseIntelMemory(opText: string, size?: number): Operand | null {
  const bracketMatch = opText.match(/\[([^\]]+)\]/);
  if (!bracketMatch) return null;

  const inside = bracketMatch[1].trim();
  let base: string | undefined;
  let index: string | undefined;
  let scale: number | undefined;
  let disp: number | undefined;

  // Split tokens by + or - while keeping sign
  const tokens = inside.match(/[+-]?[^+-]+/g) || [inside];

  for (let rawToken of tokens) {
    let token = rawToken.trim();
    if (!token) continue;

    let sign = 1;
    if (token.startsWith('+')) {
      token = token.slice(1).trim();
    } else if (token.startsWith('-')) {
      sign = -1;
      token = token.slice(1).trim();
    }

    // Check scale: e.g. rdx*4 or 4*rdx
    if (token.includes('*')) {
      const parts = token.split('*').map(s => s.trim());
      if (!isNaN(Number(parts[0]))) {
        scale = parseInt(parts[0], 10);
        index = parts[1].toLowerCase();
      } else {
        index = parts[0].toLowerCase();
        scale = parseInt(parts[1], 10);
      }
      continue;
    }

    // Check register
    const regInfo = getRegisterInfo(token);
    if (regInfo) {
      if (!base) {
        base = regInfo.name;
      } else if (!index) {
        index = regInfo.name;
        scale = 1;
      }
      continue;
    }

    // Check number (displacement)
    let num: number | null = null;
    if (token.startsWith('0x') || token.startsWith('0X')) {
      num = parseInt(token, 16);
    } else if (!isNaN(Number(token))) {
      num = parseInt(token, 10);
    }

    if (num !== null) {
      disp = (disp ?? 0) + sign * num;
    }
  }

  const ripRelative = base === 'rip';

  return {
    kind: 'mem',
    base,
    index,
    scale,
    disp,
    size,
    ripRelative,
    raw: opText.trim(),
  };
}

/**
 * Parses an individual operand string into our Operand type.
 */
export function parseOperand(rawOperand: string, isAttSyntax: boolean = false): Operand {
  let text = rawOperand.trim();

  // AT&T immediate: $10, $0x20
  if (isAttSyntax && text.startsWith('$')) {
    const valStr = text.slice(1).trim();
    try {
      const val = BigInt(valStr);
      return { kind: 'imm', value: val, raw: text };
    } catch {
      // If parsing BigInt fails, try hex or integer
      let v = 0n;
      if (valStr.startsWith('0x') || valStr.startsWith('-0x')) {
        v = BigInt(valStr);
      }
      return { kind: 'imm', value: v, raw: text };
    }
  }

  // AT&T register: %rax
  if (isAttSyntax && text.startsWith('%')) {
    const regName = text.slice(1).toLowerCase();
    const reg = getRegisterInfo(regName);
    if (reg) {
      return { kind: 'reg', name: reg.name, size: reg.size, family: reg.family };
    }
  }

  // AT&T memory format
  if (isAttSyntax) {
    const attMem = parseAttMemory(text);
    if (attMem) return attMem;
  }

  // Intel Memory format with optional size directive: QWORD PTR [rbp - 0x14]
  const { size, cleaned } = parseSizeDirective(text);
  if (cleaned.includes('[') && cleaned.includes(']')) {
    const mem = parseIntelMemory(cleaned, size);
    if (mem) {
      mem.raw = text;
      return mem;
    }
  }

  // Pure register check (e.g. rax, rbp)
  const reg = getRegisterInfo(cleaned);
  if (reg) {
    return { kind: 'reg', name: reg.name, size: reg.size, family: reg.family };
  }

  // Immediate number (e.g. 0x10, 42, -5)
  if (/^[+-]?(?:0x[0-9a-fA-F]+|\d+)$/.test(cleaned)) {
    try {
      const val = BigInt(cleaned);
      return { kind: 'imm', value: val, raw: text };
    } catch {
      // Fall through to label
    }
  }

  // Address with label: e.g. "1040 <fact>", "0x121d <calculate+29>", "<main>"
  const addrWithLabelMatch = cleaned.match(/^(?:(?:0x)?([0-9a-fA-F]+)\s+)?<([^>]+)>$/);
  if (addrWithLabelMatch) {
    const addrStr = addrWithLabelMatch[1];
    const nameStr = addrWithLabelMatch[2];
    const addr = addrStr ? parseInt(addrStr, 16) : undefined;
    return {
      kind: 'label',
      name: nameStr,
      address: addr,
      raw: text,
    };
  }

  // Label or symbol address (e.g. <main>, 0x401136, loc_401120, exit@plt)
  const labelClean = cleaned.replace(/^<|>$/g, '');
  const addrMatch = labelClean.match(/^(?:0x)?([0-9a-fA-F]+)$/);
  let addr: number | undefined;
  if (addrMatch && labelClean.length <= 16) {
    addr = parseInt(addrMatch[1], 16);
  }

  return {
    kind: 'label',
    name: labelClean,
    address: addr,
    raw: text,
  };
}
