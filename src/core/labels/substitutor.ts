/**
 * Replaces addresses, function names, and variable offsets in assembly text and summaries.
 * e.g. "call 0x401136" -> "call parse_input"
 * e.g. "DWORD PTR [rbp-0x4]" -> "[counter]"
 */
export function substituteLabels(
  text: string,
  labelMap: Record<string, string>
): string {
  if (!text || Object.keys(labelMap).length === 0) return text;

  let result = text;

  // Sort keys by length descending so longer keys (e.g. 0x0000000000001040) are replaced before short ones
  const keys = Object.keys(labelMap).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const replacement = labelMap[key];
    if (!replacement) continue;

    // Escape regex special chars in key
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<=[\\s,\\[(<]|^)${escaped}(?=[\\s,\\])>]|$|@)`, 'g');
    result = result.replace(regex, replacement);
  }

  return result;
}
