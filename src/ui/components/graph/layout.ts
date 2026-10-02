import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export function getLayoutedElements<T extends Record<string, any>>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node<T>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 90,
    ranksep: 120,
  });

  nodes.forEach(node => {
    const width = (node.data as any)?.width || 300;
    const height = (node.data as any)?.height || 180;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map(node => {
    const nodeWithPos = dagreGraph.node(node.id);
    const width = (node.data as any)?.width || 300;
    const height = (node.data as any)?.height || 180;

    return {
      ...node,
      width,
      height,
      position: {
        x: nodeWithPos ? nodeWithPos.x - width / 2 : 0,
        y: nodeWithPos ? nodeWithPos.y - height / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
