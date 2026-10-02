import { Label, LabelTarget } from './types.js';

let labelCounter = 0;
export function nextLabelId(): string {
  labelCounter += 1;
  return `lbl_${labelCounter}`;
}

export function validateLabel(
  existingLabels: Label[],
  candidate: Omit<Label, 'id'>,
  currentLabelId?: string
): { isValid: boolean; error?: string; conflictingLabel?: Label } {
  const trimmedName = candidate.name.trim();
  if (!trimmedName) {
    return { isValid: false, error: 'Etiket adı boş olamaz.' };
  }

  // Conflict check: the same name cannot be assigned to two different keys in the same scope
  for (const l of existingLabels) {
    if (currentLabelId && l.id === currentLabelId) continue;

    if (
      l.name.toLowerCase() === trimmedName.toLowerCase() &&
      l.key !== candidate.key &&
      l.scope === candidate.scope
    ) {
      return {
        isValid: false,
        error: `"${trimmedName}" adı zaten "${l.key}" hedefinde kullanılıyor!`,
        conflictingLabel: l,
      };
    }
  }

  return { isValid: true };
}

export function filterLabels(
  labels: Label[],
  searchQuery: string,
  targetFilter?: LabelTarget
): Label[] {
  const q = searchQuery.toLowerCase().trim();

  return labels.filter(label => {
    if (targetFilter && label.target !== targetFilter) {
      return false;
    }
    if (!q) return true;

    return (
      label.name.toLowerCase().includes(q) ||
      label.key.toLowerCase().includes(q) ||
      (label.note && label.note.toLowerCase().includes(q))
    );
  });
}

/**
 * Returns a fast lookup dictionary: key -> replacement name
 */
export function buildLabelMap(
  labels: Label[],
  scope?: string
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const label of labels) {
    if (label.scope && scope && label.scope !== scope) {
      continue;
    }
    map[label.key] = label.name;
    // If key is a hex address without 0x, also map with 0x and vice-versa
    if (label.key.startsWith('0x')) {
      map[label.key.slice(2)] = label.name;
    } else if (/^[0-9a-fA-F]+$/.test(label.key)) {
      map[`0x${label.key}`] = label.name;
    }
  }

  return map;
}
