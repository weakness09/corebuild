import { Label, LabelExportBundle } from './types.js';

export async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple checksum if Web Crypto is unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function saveLabelsToStorage(sha256: string, labels: Label[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`coderebuild_labels_${sha256}`, JSON.stringify(labels));
    }
  } catch {
    // Ignore storage quota or disabled localStorage errors
  }
}

export function loadLabelsFromStorage(sha256: string): Label[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(`coderebuild_labels_${sha256}`);
      if (data) {
        return JSON.parse(data) as Label[];
      }
    }
  } catch {
    // Fall through
  }
  return [];
}

export function exportLabelsToJson(sha256: string, labels: Label[]): string {
  const bundle: LabelExportBundle = {
    version: '1.0',
    app: 'CodeRebuild',
    sha256,
    labels,
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(bundle, null, 2);
}

export function importLabelsFromJson(
  jsonText: string,
  currentSha256?: string
): { labels: Label[]; warning?: string } {
  const bundle = JSON.parse(jsonText) as LabelExportBundle;
  let warning: string | undefined;

  if (currentSha256 && bundle.sha256 && bundle.sha256 !== currentSha256) {
    warning = 'Dikkat: Yüklenen etiketler farklı bir assembly dosyasından alınmış (SHA-256 uyuşmuyor). Bazı adresler ve hedefler eşleşmeyebilir.';
  }

  return {
    labels: bundle.labels || [],
    warning,
  };
}
