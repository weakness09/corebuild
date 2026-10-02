import { RegisterSize } from './types.js';

export interface RegisterInfo {
  name: string;
  family: string;
  size: RegisterSize;
}

export const REGISTER_MAP: Record<string, RegisterInfo> = {
  // RAX
  rax: { name: 'rax', family: 'rax', size: 64 },
  eax: { name: 'eax', family: 'rax', size: 32 },
  ax: { name: 'ax', family: 'rax', size: 16 },
  al: { name: 'al', family: 'rax', size: 8 },
  ah: { name: 'ah', family: 'rax', size: 8 },

  // RBX
  rbx: { name: 'rbx', family: 'rbx', size: 64 },
  ebx: { name: 'ebx', family: 'rbx', size: 32 },
  bx: { name: 'bx', family: 'rbx', size: 16 },
  bl: { name: 'bl', family: 'rbx', size: 8 },
  bh: { name: 'bh', family: 'rbx', size: 8 },

  // RCX
  rcx: { name: 'rcx', family: 'rcx', size: 64 },
  ecx: { name: 'ecx', family: 'rcx', size: 32 },
  cx: { name: 'cx', family: 'rcx', size: 16 },
  cl: { name: 'cl', family: 'rcx', size: 8 },
  ch: { name: 'ch', family: 'rcx', size: 8 },

  // RDX
  rdx: { name: 'rdx', family: 'rdx', size: 64 },
  edx: { name: 'edx', family: 'rdx', size: 32 },
  dx: { name: 'dx', family: 'rdx', size: 16 },
  dl: { name: 'dl', family: 'rdx', size: 8 },
  dh: { name: 'dh', family: 'rdx', size: 8 },

  // RSI
  rsi: { name: 'rsi', family: 'rsi', size: 64 },
  esi: { name: 'esi', family: 'rsi', size: 32 },
  si: { name: 'si', family: 'rsi', size: 16 },
  sil: { name: 'sil', family: 'rsi', size: 8 },

  // RDI
  rdi: { name: 'rdi', family: 'rdi', size: 64 },
  edi: { name: 'edi', family: 'rdi', size: 32 },
  di: { name: 'di', family: 'rdi', size: 16 },
  dil: { name: 'dil', family: 'rdi', size: 8 },

  // RBP
  rbp: { name: 'rbp', family: 'rbp', size: 64 },
  ebp: { name: 'ebp', family: 'rbp', size: 32 },
  bp: { name: 'bp', family: 'rbp', size: 16 },
  bpl: { name: 'bpl', family: 'rbp', size: 8 },

  // RSP
  rsp: { name: 'rsp', family: 'rsp', size: 64 },
  esp: { name: 'esp', family: 'rsp', size: 32 },
  sp: { name: 'sp', family: 'rsp', size: 16 },
  spl: { name: 'spl', family: 'rsp', size: 8 },

  // R8
  r8: { name: 'r8', family: 'r8', size: 64 },
  r8d: { name: 'r8d', family: 'r8', size: 32 },
  r8w: { name: 'r8w', family: 'r8', size: 16 },
  r8b: { name: 'r8b', family: 'r8', size: 8 },

  // R9
  r9: { name: 'r9', family: 'r9', size: 64 },
  r9d: { name: 'r9d', family: 'r9', size: 32 },
  r9w: { name: 'r9w', family: 'r9', size: 16 },
  r9b: { name: 'r9b', family: 'r9', size: 8 },

  // R10
  r10: { name: 'r10', family: 'r10', size: 64 },
  r10d: { name: 'r10d', family: 'r10', size: 32 },
  r10w: { name: 'r10w', family: 'r10', size: 16 },
  r10b: { name: 'r10b', family: 'r10', size: 8 },

  // R11
  r11: { name: 'r11', family: 'r11', size: 64 },
  r11d: { name: 'r11d', family: 'r11', size: 32 },
  r11w: { name: 'r11w', family: 'r11', size: 16 },
  r11b: { name: 'r11b', family: 'r11', size: 8 },

  // R12
  r12: { name: 'r12', family: 'r12', size: 64 },
  r12d: { name: 'r12d', family: 'r12', size: 32 },
  r12w: { name: 'r12w', family: 'r12', size: 16 },
  r12b: { name: 'r12b', family: 'r12', size: 8 },

  // R13
  r13: { name: 'r13', family: 'r13', size: 64 },
  r13d: { name: 'r13d', family: 'r13', size: 32 },
  r13w: { name: 'r13w', family: 'r13', size: 16 },
  r13b: { name: 'r13b', family: 'r13', size: 8 },

  // R14
  r14: { name: 'r14', family: 'r14', size: 64 },
  r14d: { name: 'r14d', family: 'r14', size: 32 },
  r14w: { name: 'r14w', family: 'r14', size: 16 },
  r14b: { name: 'r14b', family: 'r14', size: 8 },

  // R15
  r15: { name: 'r15', family: 'r15', size: 64 },
  r15d: { name: 'r15d', family: 'r15', size: 32 },
  r15w: { name: 'r15w', family: 'r15', size: 16 },
  r15b: { name: 'r15b', family: 'r15', size: 8 },

  // RIP
  rip: { name: 'rip', family: 'rip', size: 64 },
  eip: { name: 'eip', family: 'rip', size: 32 },
  ip: { name: 'ip', family: 'rip', size: 16 },
};

// System V AMD64 ABI function argument register order
export const SYSTEM_V_ARG_FAMILIES = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'] as const;

export function getRegisterInfo(reg: string): RegisterInfo | undefined {
  const normalized = reg.toLowerCase().trim().replace(/^%/, '');
  return REGISTER_MAP[normalized];
}

export function isSameRegisterFamily(reg1: string, reg2: string): boolean {
  const r1 = getRegisterInfo(reg1);
  const r2 = getRegisterInfo(reg2);
  if (!r1 || !r2) return false;
  return r1.family === r2.family;
}
