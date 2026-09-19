import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, Badge, getBadgeStyleProps } from '@/components/ui';
import { Pencil, Check, X, Download, TrendingUp } from 'lucide-react';
import type { Matrix2DTable } from '@/lib/table-data';

interface Matrix2DViewerProps {
  table: Matrix2DTable;
  readOnly?: boolean;
  onUpdate?: (updated: Matrix2DTable) => void;
}

function heatColor(value: number, min: number, max: number, opacity = 0.6): string {
  if (max === min) return 'transparent';
  const t = (value - min) / (max - min); // 0 = cold, 1 = hot
  // Blue (low) → white (mid) → red (high)
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(220 * s + 59 * (1 - s));
    const g = Math.round(220 * s + 130 * (1 - s));
    const b = Math.round(220 * s + 246 * (1 - s));
    return `rgba(${r},${g},${b},${opacity})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(239 * s + 220 * (1 - s));
    const g = Math.round(100 * s + 220 * (1 - s));
    const b = Math.round(100 * s + 220 * (1 - s));
    return `rgba(${r},${g},${b},${opacity})`;
  }
}

export function Matrix2DViewer({ table: initialTable, readOnly = false, onUpdate }: Matrix2DViewerProps) {
  const [table, setTable] = useState(initialTable);
  const [editCell, setEditCell] = useState<{ r: number; c: number } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [heatmap, setHeatmap] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const allValues = table.data.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const avgVal = allValues.reduce((a, b) => a + b, 0) / allValues.length;

  function startEdit(r: number, c: number) {
    if (readOnly) return;
    setEditCell({ r, c });
    setEditVal(String(table.data[r][c]));
  }

  function commitEdit() {
    if (!editCell) return;
    const { r, c } = editCell;
    const newData = table.data.map((row, ri) =>
      ri === r ? row.map((v, ci) => ci === c ? parseFloat(editVal) || v : v) : row
    );
    const updated = { ...table, data: newData };
    setTable(updated);
    onUpdate?.(updated);
    setEditCell(null);
  }

  // Row / column summary stats
  const rowAvgs = table.data.map(row => row.reduce((a, b) => a + b, 0) / row.length);
  const colAvgs = table.cols.map((_, ci) => table.data.reduce((a, row) => a + row[ci], 0) / table.data.length);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge {...getBadgeStyleProps('purple')}>2D Matrix</Badge>
          <span className="text-xs text-[--color-muted-foreground]">
            {table.rows.length} rows × {table.cols.length} cols · Unit: {table.unit}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={heatmap ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1"
            onClick={() => setHeatmap(h => !h)}>
            <TrendingUp className="h-3.5 w-3.5" />Heatmap
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Min', value: minVal.toFixed(3), color: 'text-blue-600' },
          { label: 'Average', value: avgVal.toFixed(3), color: 'text-[--color-foreground]' },
          { label: 'Max', value: maxVal.toFixed(3), color: 'text-red-600' },
          { label: 'Cells', value: (table.rows.length * table.cols.length).toLocaleString(), color: 'text-[--color-foreground]' },
        ].map(s => (
          <div key={s.label} className="rounded-md bg-[--color-muted]/40 px-3 py-2">
            <p className="text-[10px] text-[--color-muted-foreground] uppercase tracking-wide">{s.label}</p>
            <p className={cn('text-sm font-semibold tabular-nums', s.color)}>{s.value} {s.label !== 'Cells' ? table.unit : ''}</p>
          </div>
        ))}
      </div>

      {/* Matrix grid */}
      <div className="rounded-md border border-[--color-border] overflow-auto max-h-[500px]">
        <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Corner */}
              <th className="sticky left-0 z-20 bg-[--color-muted]/80 border-b border-r border-[--color-border] px-3 py-2 text-left min-w-[120px]">
                <span className="text-[10px] text-[--color-muted-foreground] font-normal">{table.rowLabel}</span>
                <span className="mx-1 text-[--color-muted-foreground]/40">/</span>
                <span className="text-[10px] text-[--color-muted-foreground] font-normal">{table.colLabel}</span>
              </th>
              {table.cols.map((col, ci) => (
                <th key={ci}
                  className={cn(
                    'border-b border-r border-[--color-border] px-3 py-2 font-semibold whitespace-nowrap text-center transition-colors',
                    hoveredCol === ci ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-[--color-muted]/60',
                  )}
                  style={{ minWidth: 90 }}
                >
                  {col}
                </th>
              ))}
              <th className="border-b border-[--color-border] px-3 py-2 bg-[--color-muted]/60 text-center text-[--color-muted-foreground] font-medium whitespace-nowrap">
                Row Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((rowLabel, ri) => (
              <tr key={ri}
                className={cn('border-b border-[--color-border]', hoveredRow === ri && 'bg-[--color-muted]/10')}
                onMouseEnter={() => setHoveredRow(ri)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Row header */}
                <td className={cn(
                  'sticky left-0 z-10 border-r border-[--color-border] px-3 py-1.5 font-semibold whitespace-nowrap transition-colors',
                  hoveredRow === ri ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-[--color-muted]/40',
                )}>
                  {rowLabel}
                </td>
                {table.data[ri].map((val, ci) => {
                  const isEditing = editCell?.r === ri && editCell?.c === ci;
                  const bgColor = heatmap ? heatColor(val, minVal, maxVal, 0.5) : undefined;
                  return (
                    <td key={ci}
                      className={cn(
                        'border-r border-[--color-border] px-3 py-1.5 text-right tabular-nums transition-all',
                        !readOnly && 'cursor-pointer hover:ring-1 hover:ring-[--color-primary] hover:ring-inset',
                        hoveredCol === ci && !heatmap && 'bg-[--color-muted]/10',
                      )}
                      style={{ backgroundColor: bgColor }}
                      onMouseEnter={() => setHoveredCol(ci)}
                      onMouseLeave={() => setHoveredCol(null)}
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
                          val > avgVal * 1.5 ? 'text-red-600 dark:text-red-400 font-semibold' :
                          val < avgVal * 0.5 ? 'text-blue-600 dark:text-blue-400' : ''
                        )}>
                          {val.toFixed(2)}
                        </span>
                      )}
                    </td>
                  );
                })}
                {/* Row avg */}
                <td className="px-3 py-1.5 text-right tabular-nums bg-[--color-muted]/20 text-[--color-muted-foreground] font-medium border-[--color-border]">
                  {rowAvgs[ri].toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Column averages footer */}
            <tr className="border-t-2 border-[--color-border] bg-[--color-muted]/30">
              <td className="sticky left-0 z-10 bg-[--color-muted]/50 px-3 py-1.5 font-semibold text-[--color-muted-foreground] border-r border-[--color-border]">
                Col Avg
              </td>
              {colAvgs.map((avg, ci) => (
                <td key={ci} className="px-3 py-1.5 text-right tabular-nums font-medium text-[--color-muted-foreground] border-r border-[--color-border]">
                  {avg.toFixed(2)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right tabular-nums font-bold bg-[--color-muted]/30">
                {avgVal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <p className="text-xs text-[--color-muted-foreground]">
          <Pencil className="h-3 w-3 inline mr-1" />Double-click any cell to edit its value inline.
        </p>
      )}
    </div>
  );
}
