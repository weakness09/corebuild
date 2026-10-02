export type LabelTarget = 'function' | 'variable' | 'block' | 'address';

export interface Label {
  id: string;
  target: LabelTarget;
  key: string; // e.g. 'sub_401136' | 'rbp-0x14' | '0x401150' | 'var_4'
  scope?: string; // function address or function name for scoped variables
  name: string; // User-defined name, e.g. 'counter', 'decrypt_payload'
  note?: string; // Optional user notes
  color?: string; // Hex color tag
}

export interface LabelExportBundle {
  version: string;
  app: string;
  sha256: string;
  labels: Label[];
  createdAt: string;
}
