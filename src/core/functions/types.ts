import { Instruction } from '../parser/types.js';
import { ControlFlowGraph } from '../cfg/types.js';

export interface StackVariable {
  offset: number; // e.g. 0x14 (represents [rbp - 0x14])
  name: string; // "var_14" or user custom name
  size?: number; // 1, 2, 4, 8 bytes
  userLabel?: string;
}

export interface ArgumentCandidate {
  reg: string;
  family: string;
  argIndex: number; // 1 to 6
  suggestedName: string; // "arg1", "arg2"
}

export interface FunctionInfo {
  id: string;
  name: string;
  startAddress: number;
  endAddress: number;
  instructions: Instruction[];
  cfg: ControlFlowGraph;
  frameSize?: number;
  redZoneSize?: number;
  isLeaf?: boolean;
  stackVariables: StackVariable[];
  argumentCandidates: ArgumentCandidate[];
  callers: string[];
  callees: string[];
  isRecursive: boolean;
  hasTailCalls: boolean;
}

export interface CallGraphEdge {
  id: string;
  fromFunctionId: string;
  toFunctionId: string;
  callAddress: number;
  isTailCall?: boolean;
  isRecursive?: boolean;
}

export interface CallGraphNode {
  id: string;
  name: string;
  address: number;
  isRecursive: boolean;
  frameSize?: number;
  redZoneSize?: number;
  isLeaf?: boolean;
  instructionCount: number;
  blockCount: number;
}

export interface CallGraph {
  nodes: Record<string, CallGraphNode>;
  edges: CallGraphEdge[];
}
