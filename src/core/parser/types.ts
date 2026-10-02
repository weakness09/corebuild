export type InstructionCategory =
  | 'ARITH'
  | 'LOGIC'
  | 'MOVE'
  | 'STACK'
  | 'COMPARE'
  | 'COND_JUMP'
  | 'UNCOND_JUMP'
  | 'INDIRECT_JUMP'
  | 'CALL'
  | 'INDIRECT_CALL'
  | 'RET'
  | 'SYSCALL'
  | 'NOP'
  | 'OTHER';

export type RegisterSize = 8 | 16 | 32 | 64;

export type Operand =
  | {
      kind: 'reg';
      name: string;
      size: RegisterSize;
      family: string;
      raw?: string;
    }
  | {
      kind: 'imm';
      value: bigint;
      raw: string;
    }
  | {
      kind: 'mem';
      base?: string;
      index?: string;
      scale?: number;
      disp?: number;
      size?: number; // size in bytes (e.g. 1=byte, 2=word, 4=dword, 8=qword)
      ripRelative?: boolean;
      raw: string;
    }
  | {
      kind: 'label';
      name?: string;
      address?: number;
      raw: string;
    };

export interface Instruction {
  id: string;
  address: number;
  bytes?: string;
  prefix?: string;
  mnemonic: string;
  operands: Operand[];
  category: InstructionCategory;
  raw: string;
  comment?: string;
  isFoldableNoise?: boolean; // nop, endbr64, etc.
  isUnknown?: boolean;
  targetAddress?: number; // for jumps and calls if resolvable
}

export interface ParseWarning {
  line: number;
  raw: string;
  message: string;
}

export interface ParsedProgram {
  instructions: Instruction[];
  warnings: ParseWarning[];
  symbols: Record<number, string>; // address -> symbol name (e.g. 0x1139 -> "main")
  rawText: string;
}
