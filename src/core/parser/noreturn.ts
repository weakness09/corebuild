export const NORETURN_FUNCTIONS = new Set<string>([
  'exit',
  '_exit',
  '_Exit',
  'quick_exit',
  'abort',
  '__assert_fail',
  '__assert',
  '__stack_chk_fail',
  '__cxa_throw',
  '__builtin_trap',
  '__builtin_unreachable',
  'panic',
  'exit@plt',
  '_exit@plt',
  'abort@plt',
  '__stack_chk_fail@plt',
  '__assert_fail@plt',
]);

export function isNoReturnFunction(funcName?: string): boolean {
  if (!funcName) return false;
  const cleanName = funcName.replace(/^<|>$/g, '').trim();
  if (NORETURN_FUNCTIONS.has(cleanName)) return true;
  // Check without @plt suffix
  const baseName = cleanName.replace(/@plt.*/, '');
  return NORETURN_FUNCTIONS.has(baseName);
}

export function isTerminatingMnemonic(mnemonic: string): boolean {
  const m = mnemonic.toLowerCase();
  return m === 'ret' || m === 'retq' || m === 'hlt' || m === 'ud2';
}
