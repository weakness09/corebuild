/**
 * Custom JSON serialization and deserialization supporting 64-bit BigInt values.
 */

export function serializeJsonWithBigInt(value: unknown, space: number = 2): string {
  return JSON.stringify(
    value,
    (_, val) => {
      if (typeof val === 'bigint') {
        return { __bigint: val.toString() };
      }
      return val;
    },
    space
  );
}

export function deserializeJsonWithBigInt<T = unknown>(jsonText: string): T {
  return JSON.parse(jsonText, (_, val) => {
    if (val && typeof val === 'object' && '__bigint' in val && typeof val.__bigint === 'string') {
      return BigInt(val.__bigint);
    }
    return val;
  }) as T;
}

export function toHexAddress(address: bigint | number): string {
  return `0x${address.toString(16)}`;
}

export function parseHexAddress(raw: string): bigint {
  const clean = raw.trim().replace(/^<|>$/g, '');
  if (clean.startsWith('0x') || clean.startsWith('0X')) {
    return BigInt(clean);
  }
  return BigInt(`0x${clean}`);
}
