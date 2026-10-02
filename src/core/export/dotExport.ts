import { ControlFlowGraph } from '../cfg/types.js';
import { CallGraph } from '../functions/types.js';

export function exportCFGToDot(cfg: ControlFlowGraph, functionName?: string): string {
  const lines: string[] = [];
  lines.push(`digraph "${functionName || cfg.id}" {`);
  lines.push('  graph [rankdir=TB, bgcolor="#09090b", pad="0.5", nodesep="0.5", ranksep="0.7"];');
  lines.push('  node [shape=box, style="filled,rounded", fontname="monospace", fontsize=10, fillcolor="#18181b", fontcolor="#f4f4f5", color="#3f3f46"];');
  lines.push('  edge [fontname="monospace", fontsize=9];');

  // Nodes
  for (const block of Object.values(cfg.blocks)) {
    const instLines = block.instructions.map(i => `${i.mnemonic} ${i.operands.map(o => o.raw).join(', ')}`.trim());
    const labelText = `0x${block.startAddress.toString(16)} - 0x${block.endAddress.toString(16)}\\l` +
      (instLines.length > 0 ? instLines.join('\\l') + '\\l' : 'unresolved\\l');

    let nodeColor = '#3f3f46';
    let fill = '#18181b';
    if (block.isEntry) {
      nodeColor = '#3b82f6';
      fill = '#172554';
    } else if (block.isExit) {
      nodeColor = '#10b981';
      fill = '#064e3b';
    } else if (block.isLoopHeader) {
      nodeColor = '#f59e0b';
      fill = '#451a03';
    }

    lines.push(`  "${block.id}" [label="${labelText}", color="${nodeColor}", fillcolor="${fill}"];`);
  }

  // Edges
  for (const edge of cfg.edges) {
    let color = '#71717a';
    if (edge.type === 'jump_taken') color = '#22c55e';
    else if (edge.type === 'jump_not_taken') color = '#ef4444';
    else if (edge.type === 'unconditional') color = '#38bdf8';
    else if (edge.type === 'indirect') color = '#eab308';
    else if (edge.isBackEdge) color = '#f59e0b';

    const labelAttr = edge.conditionDescription ? ` [label="${edge.conditionDescription}", color="${color}", fontcolor="${color}"]` : ` [color="${color}"]`;
    lines.push(`  "${edge.fromBlockId}" -> "${edge.toBlockId}"${labelAttr};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function exportCallGraphToDot(callGraph: CallGraph): string {
  const lines: string[] = [];
  lines.push('digraph "CallGraph" {');
  lines.push('  graph [rankdir=LR, bgcolor="#09090b", pad="0.5", nodesep="0.6", ranksep="0.8"];');
  lines.push('  node [shape=ellipse, style="filled", fontname="monospace", fontsize=11, fillcolor="#18181b", fontcolor="#f4f4f5", color="#6366f1"];');
  lines.push('  edge [fontname="monospace", fontsize=9];');

  for (const node of Object.values(callGraph.nodes)) {
    lines.push(`  "${node.id}" [label="${node.name}\\n(0x${node.address.toString(16)})"];`);
  }

  for (const edge of callGraph.edges) {
    const color = edge.isTailCall ? '#ec4899' : (edge.isRecursive ? '#a855f7' : '#818cf8');
    const label = edge.isTailCall ? 'tail_call' : (edge.isRecursive ? 'recursive' : 'call');
    lines.push(`  "${edge.fromFunctionId}" -> "${edge.toFunctionId}" [label="${label}", color="${color}", fontcolor="${color}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}
