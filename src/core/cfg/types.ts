import { Instruction } from '../parser/types.js';

export type EdgeType =
  | 'fallthrough'
  | 'jump_taken'
  | 'jump_not_taken'
  | 'unconditional'
  | 'indirect';

export interface BasicBlock {
  id: string; // Unique block ID, typically `block_${hexAddress}`
  functionId?: string;
  startAddress: number;
  endAddress: number;
  instructions: Instruction[];
  isEntry: boolean;
  isExit: boolean;
  isLoopHeader?: boolean;
  isDead?: boolean;
  loopIds?: string[];
}

export interface CFGEdge {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  type: EdgeType;
  conditionDescription?: string;
  fullCondition?: string;
  isBackEdge?: boolean;
}

export interface NaturalLoop {
  id: string;
  headerBlockId: string;
  latchBlockId: string;
  blockIds: string[];
}

export interface ControlFlowGraph {
  id: string;
  functionId?: string;
  entryBlockId: string;
  blocks: Record<string, BasicBlock>;
  edges: CFGEdge[];
  naturalLoops: NaturalLoop[];
}
