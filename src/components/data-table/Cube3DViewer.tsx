import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, getBadgeStyleProps } from '@/components/ui';
import { Check, X, Download, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { Cube3DTable } from '@/lib/table-data';

interface Cube3DViewerProps {
  table: Cube3DTable;
  readOnly?: boolean;
  onUpdate?: (updated: Cube3DTable) => void;
}

function heatColor(value: number, min: number, max: number): string {
  if (max === min) return 'transparent';
  const t = (value - min) / (max - min);
  if (t < 0.5) {
    const s = t * 2;
    return `rgba(${Math.round(220 * s + 59 * (1 - s))},${Math.round(220 * s + 130 * (1 - s))},${Math.round(220 * s + 246 * (1 - s))},0.45)`;
  } else {
    const s = (t - 0.5) * 2;
    return `rgba(${Math.round(239 * s + 220 * (1 - s))},${Math.round(100 * s + 220 * (1 - s))},${Math.round(100 * s + 220 * (1 - s))},0.45)`;
  }
}

type SliceAxis = 0 | 1 | 2;

export function Cube3DViewer({ table: initialTable, readOnly = false, onUpdate }: Cube3DViewerProps) {
  const [table, setTable] = useState(initialTable);
  // Which axis to slice on, and which index along that axis
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>(0);
  const [sliceIdx, setSliceIdx] = useState(0);
  const [editCell, setEditCell] = useState<{ r: number; c: number } | null>(null);
  const [editVal, setEditVal] = useState('');

  const [ax0, ax1, ax2] = table.axes;

  // Get 2D slice based on sliceAxis
  function getSlice(): { rows: string[]; cols: string[]; data: number[][] } {
    if (sliceAxis === 0) {
      // Fix axis 0 (dim0 = sliceIdx), rows = ax1, cols = ax2
      return { rows: ax1, cols: ax2, data: table.data[sliceIdx] };
    } else if (sliceAxis === 1) {
      // Fix axis 1 (dim1 = sliceIdx), rows = ax0, cols = ax2
      return {
        rows: ax0, cols: ax2,
        data: table.data.map(d0 => d0[sliceIdx]),
      };
    } else {
      // Fix axis 2 (dim2 = sliceIdx), rows = ax0, cols = ax1
      return {
        rows: ax0, cols: ax1,
        data: table.data.map(d0 => d0.map(d1 => d1[sliceIdx])),
      };
    }
  }

  const slice = getSlice();
  const allValues = table.data.flat(2);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const sliceValues = slice.data.flat();
  const sliceMin = Math.min(...sliceValues);
  const sliceMax = Math.max(...sliceValues);
  const sliceAvg = sliceValues.reduce((a, b) => a + b, 0) / sliceValues.length;

  const axisLabels: [string, string, string] = table.axisLabels;
  const sliceAxisLabels = table.axes[sliceAxis];
  const rowAxisLabel = sliceAxis === 0 ? axisLabels[1] : axisLabels[0];
  const colAxisLabel = sliceAxis === 2 ? axisLabels[1] : axisLabels[2];

  function startEdit(r: number, c: number) {
    if (readOnly) return;
    setEditCell({ r, c });
    setEditVal(String(slice.data[r][c]));
  }

  function commitEdit() {
    if (!editCell) return;
    const { r, c } = editCell;
    const newVal = parseFloat(editVal);
    if (isNaN(newVal)) { setEditCell(null); return; }
    const newData = table.data.map((d0, i0) =>
      d0.map((d1, i1) =>
        d1.map((v, i2) => {
          if (sliceAxis === 0 && i0 === sliceIdx && i1 === r && i2 === c) return newVal;
          if (sliceAxis === 1 && i0 === r && i1 === sliceIdx && i2 === c) return newVal;
          if (sliceAxis === 2 && i0 === r && i1 === c && i2 === sliceIdx) return newVal;
          return v;
        })
      )
    );
    const updated = { ...table, data: newData };
    setTable(updated);
    onUpdate?.(updated);
    setEditCell(null);
  }

  const sliceCount = sliceAxisLabels.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge {...getBadgeStyleProps('warning')}><Layers className="h-3 w-3 mr-1" />3D Cube</Badge>
          <span className="text-xs text-[--color-muted-foreground]">
            {ax0.length} × {ax1.length} × {ax2.length} · {allValues.length.toLocaleString()} values · Unit: {table.unit}
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
      </div>

      {/* Axes summary */}
      <div className="grid grid-cols-3 gap-2">
        {([0, 1, 2] as const).map(ax => (
          <div key={ax} className={cn(
            'rounded-md border px-3 py-2 cursor-pointer transition-all',
            sliceAxis === ax ? 'border-[--color-primary] bg-blue-50 dark:bg-blue-950/20' : 'border-[--color-border] hover:border-[--color-primary]/50',
          )} onClick={() => { setSliceAxis(ax); setSliceIdx(0); }}>
            <p className="text-[10px] text-[--color-muted-foreground] uppercase tracking-wide mb-0.5">Axis {ax + 1} {sliceAxis === ax ? '(sliced)' : ''}</p>
            <p className="text-xs font-semibold">{axisLabels[ax]}</p>
            <p className="text-[10px] text-[--color-muted-foreground] mt-0.5">{table.axes[ax].length} levels</p>
          </div>
        ))}
      </div>

      {/* Slice selector */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-[--color-muted]/30 border border-[--color-border]">
        <span className="text-xs font-medium text-[--color-muted-foreground] whitespace-nowrap">
          Slice {axisLabels[sliceAxis]}:
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={sliceIdx === 0} onClick={() => setSliceIdx(i => i - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Select value={String(sliceIdx)} onValueChange={v => setSliceIdx(Number(v))}>
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sliceAxisLabels.map((label, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={sliceIdx >= sliceCount - 1} onClick={() => setSliceIdx(i => i + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-xs text-[--color-muted-foreground]">
          Showing slice {sliceIdx + 1} / {sliceCount}
        </span>
        <div className="ml-auto grid grid-cols-3 gap-3 text-xs">
          <span className="text-[--color-muted-foreground]">Slice avg: <strong className="text-[--color-foreground]">{sliceAvg.toFixed(2)}</strong></span>
          <span className="text-blue-600">Min: <strong>{sliceMin.toFixed(2)}</strong></span>
          <span className="text-red-600">Max: <strong>{sliceMax.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* 2D slice matrix */}
      <div className="rounded-md border border-[--color-border] overflow-auto max-h-[420px]">
        <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-[--color-muted]/80 border-b border-r border-[--color-border] px-3 py-2 text-left min-w-[110px]">
                <span className="text-[10px] text-[--color-muted-foreground] font-normal">{rowAxisLabel}</span>
                <span className="mx-1 text-[--color-muted-foreground]/40">/</span>
                <span className="text-[10px] text-[--color-muted-foreground] font-normal">{colAxisLabel}</span>
              </th>
              {slice.cols.map((col, ci) => (
                <th key={ci} className="border-b border-r border-[--color-border] bg-[--color-muted]/60 px-3 py-2 font-semibold whitespace-nowrap text-center" style={{ minWidth: 80 }}>
                  {col}
                </th>
              ))}
              <th className="border-b border-[--color-border] bg-[--color-muted]/60 px-3 py-2 text-center text-[--color-muted-foreground] font-medium">Avg</th>
            </tr>
          </thead>
          <tbody>
            {slice.rows.map((rowLabel, ri) => {
              const rowAvg = slice.data[ri].reduce((a, b) => a + b, 0) / slice.data[ri].length;
              return (
                <tr key={ri} className="border-b border-[--color-border] hover:bg-[--color-muted]/10">
                  <td className="sticky left-0 z-10 bg-[--color-muted]/40 border-r border-[--color-border] px-3 py-1.5 font-semibold whitespace-nowrap">{rowLabel}</td>
                  {slice.data[ri].map((val, ci) => {
                    const isEditing = editCell?.r === ri && editCell?.c === ci;
                    return (
                      <td key={ci}
                        className={cn(
                          'border-r border-[--color-border] px-3 py-1.5 text-right tabular-nums transition-all',
                          !readOnly && 'cursor-pointer hover:ring-1 hover:ring-inset hover:ring-[--color-primary]',
                        )}
                        style={{ backgroundColor: heatColor(val, minVal, maxVal) }}
                        onDoubleClick={() => startEdit(ri, ci)}
                      >
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input value={editVal} onChange={e => setEditVal(e.target.value)}
                              className="h-5 w-20 text-xs py-0 text-right"
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                              autoFocus />
                            <button onClick={commitEdit} className="text-green-600"><Check className="h-3 w-3" /></button>
                            <button onClick={() => setEditCell(null)} className="text-red-500"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className={cn(
                            val > sliceAvg * 1.3 ? 'text-red-600 dark:text-red-400 font-semibold' :
                            val < sliceAvg * 0.7 ? 'text-blue-600 dark:text-blue-400' : '',
                          )}>{val.toFixed(2)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right tabular-nums bg-[--color-muted]/20 font-medium text-[--color-muted-foreground]">
                    {rowAvg.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {/* Col avg footer */}
            <tr className="border-t-2 border-[--color-border] bg-[--color-muted]/30">
              <td className="sticky left-0 z-10 bg-[--color-muted]/50 border-r border-[--color-border] px-3 py-1.5 font-semibold text-[--color-muted-foreground]">Avg</td>
              {slice.cols.map((_, ci) => {
                const avg = slice.data.reduce((a, row) => a + row[ci], 0) / slice.data.length;
                return (
                  <td key={ci} className="px-3 py-1.5 text-right tabular-nums font-medium text-[--color-muted-foreground] border-r border-[--color-border]">
                    {avg.toFixed(2)}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right tabular-nums font-bold">
                {sliceAvg.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-[--color-muted-foreground]">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-8 rounded" style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.45), rgba(220,220,220,0.4), rgba(239,100,100,0.45))' }} />
          <span>Low → High (heatmap across entire cube)</span>
        </div>
        {!readOnly && <span className="ml-auto"><strong>Tip:</strong> Double-click any cell to edit. Use axis buttons to slice through the third dimension.</span>}
      </div>
    </div>
  );
}
