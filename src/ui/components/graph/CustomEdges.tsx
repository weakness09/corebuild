import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from '@xyflow/react';
import { EdgeType } from '../../../core/cfg/types.js';

interface CustomEdgeData {
  type: EdgeType | 'call' | 'tail_call';
  conditionDescription?: string;
  isBackEdge?: boolean;
  maxGraphX?: number;
  backEdgeIndex?: number;
}

export const CustomCFGEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const edgeData = data as unknown as CustomEdgeData | undefined;
  const edgeType = edgeData?.type || 'fallthrough';

  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (edgeData?.isBackEdge) {
    const r = 10;
    const finalTrackX = Math.max(
      (edgeData.maxGraphX ?? 0) + 40 + (edgeData.backEdgeIndex || 0) * 24,
      Math.max(sourceX, targetX) + 40
    );

    if (Math.abs(sourceY - targetY) < 10) {
      // Self loop
      const loopH = 30;
      edgePath = `M ${sourceX} ${sourceY} L ${finalTrackX - r} ${sourceY} Q ${finalTrackX} ${sourceY} ${finalTrackX} ${sourceY - r} L ${finalTrackX} ${targetY - loopH + r} Q ${finalTrackX} ${targetY - loopH} ${finalTrackX - r} ${targetY - loopH} L ${targetX + 20} ${targetY - loopH} Q ${targetX} ${targetY - loopH} ${targetX} ${targetY}`;
    } else if (sourceY >= targetY) {
      // Normal back edge: source is below target, travels upwards
      edgePath = `M ${sourceX} ${sourceY} L ${finalTrackX - r} ${sourceY} Q ${finalTrackX} ${sourceY} ${finalTrackX} ${sourceY - r} L ${finalTrackX} ${targetY + r} Q ${finalTrackX} ${targetY} ${finalTrackX - r} ${targetY} L ${targetX} ${targetY}`;
    } else {
      // Source is above target, travels downwards
      edgePath = `M ${sourceX} ${sourceY} L ${finalTrackX - r} ${sourceY} Q ${finalTrackX} ${sourceY} ${finalTrackX} ${sourceY + r} L ${finalTrackX} ${targetY - r} Q ${finalTrackX} ${targetY} ${finalTrackX - r} ${targetY} L ${targetX} ${targetY}`;
    }

    // Label positioned in the middle of the vertical return segment in the outer margin
    labelX = finalTrackX;
    labelY = (sourceY + targetY) / 2;
  } else {
    const [path, lx, ly] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;

    // Slight vertical anti-collision offset between taken and not-taken branches
    if (edgeType === 'jump_taken') {
      labelY -= 6;
    } else if (edgeType === 'jump_not_taken') {
      labelY += 6;
    }
  }

  // Color mapping matching reverse engineering tools (IDA/Ghidra)
  let strokeColor = '#71717a'; // zinc-500
  let strokeWidth = 1.5;
  let strokeDasharray: string | undefined;

  switch (edgeType) {
    case 'jump_taken':
      strokeColor = '#22c55e'; // green-500
      strokeWidth = 2.2;
      break;
    case 'jump_not_taken':
      strokeColor = '#ef4444'; // red-500
      strokeWidth = 2.2;
      break;
    case 'unconditional':
      strokeColor = '#38bdf8'; // sky-400
      strokeWidth = 2;
      break;
    case 'indirect':
      strokeColor = '#eab308'; // yellow-500
      strokeDasharray = '4 4';
      strokeWidth = 2;
      break;
    case 'call':
      strokeColor = '#a855f7'; // purple-500
      strokeDasharray = '5 5';
      strokeWidth = 2;
      break;
    case 'tail_call':
      strokeColor = '#ec4899'; // pink-500
      strokeDasharray = '4 4';
      strokeWidth = 2;
      break;
    case 'fallthrough':
    default:
      strokeColor = '#71717a';
      strokeWidth = 1.5;
      break;
  }

  if (edgeData?.isBackEdge) {
    strokeWidth = 2.5;
    strokeColor = '#f59e0b'; // amber back edge
  }

  const labelText = edgeData?.isBackEdge
    ? 'döngü geri kenarı'
    : edgeData?.conditionDescription;

  const badgeClass = edgeData?.isBackEdge
    ? 'bg-amber-950/90 text-amber-300 border-amber-800/80 font-bold'
    : edgeType === 'jump_taken'
    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80 font-medium'
    : edgeType === 'jump_not_taken'
    ? 'bg-rose-950/90 text-rose-300 border-rose-800/80 font-medium'
    : 'bg-zinc-900/90 text-zinc-300 border-zinc-700/80 font-medium';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
        }}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shadow-md max-w-[200px] truncate select-none ${badgeClass}`}
            title={labelText}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
