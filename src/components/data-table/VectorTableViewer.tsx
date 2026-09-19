import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, Badge, getBadgeStyleProps } from '@/components/ui';
import { Pencil, Check, X, Download, Plus, Trash2, TrendingUp } from 'lucide-react';
import type { VectorTable } from '@/lib/table-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface VectorTableViewerProps {
  table: VectorTable;
  readOnly?: boolean;
  onUpdate?: (updated: VectorTable) => void;
}

export function VectorTableViewer({ table: initialTable, readOnly = false, onUpdate }: VectorTableViewerProps) {
  const [table, setTable] = useState(initialTable);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editVal, setEditVal] = useState('');
  const [showChart, setShowChart] = useState(true);

  function startEdit(idx: number) {
    if (readOnly) return;
    setEditingIdx(idx);
    setEditKey(table.rows[idx].key);
    setEditVal(String(table.rows[idx].value));
  }

  function commitEdit() {
    if (editingIdx === null) return;
    const updated = { ...table, rows: table.rows.map((r, i) => i === editingIdx ? { key: editKey, value: parseFloat(editVal) || r.value } : r) };
    setTable(updated);
    onUpdate?.(updated);
    setEditingIdx(null);
  }

  function deleteRow(idx: number) {
    const updated = { ...table, rows: table.rows.filter((_, i) => i !== idx) };
    setTable(updated);
    onUpdate?.(updated);
  }

  function addRow() {
    const updated = { ...table, rows: [...table.rows, { key: `New Row ${table.rows.length + 1}`, value: 0 }] };
    setTable(updated);
    onUpdate?.(updated);
    setTimeout(() => startEdit(updated.rows.length - 1), 50);
  }

  const avg = table.rows.reduce((a, r) => a + r.value, 0) / table.rows.length;
  const max = Math.max(...table.rows.map(r => r.value));
  const min = Math.min(...table.rows.map(r => r.value));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge {...getBadgeStyleProps('info')}>1D Vector</Badge>
          <span className="text-xs text-[--color-muted-foreground]">{table.rows.length} rows · Unit: {table.unit}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowChart(s => !s)}>
            <TrendingUp className="h-3.5 w-3.5" />{showChart ? 'Hide' : 'Show'} Chart
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
          {!readOnly && <Button size="sm" className="h-7 text-xs gap-1" onClick={addRow}><Plus className="h-3.5 w-3.5" />Add Row</Button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Min', value: `${min.toFixed(3)} ${table.unit}` },
          { label: 'Avg', value: `${avg.toFixed(3)} ${table.unit}` },
          { label: 'Max', value: `${max.toFixed(3)} ${table.unit}` },
        ].map(s => (
          <div key={s.label} className="rounded-md bg-[--color-muted]/40 px-3 py-2">
            <p className="text-[10px] text-[--color-muted-foreground] uppercase tracking-wide">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {showChart && (
        <div className="rounded-md border border-[--color-border] p-3 bg-[--color-card]">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={table.rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit={table.unit.length <= 2 ? table.unit : ''} />
              <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(3)} ${table.unit}`, table.valueLabel]} />
              <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'avg', fontSize: 9, fill: '#f59e0b' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-[--color-border] overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[--color-muted]/50 border-b border-[--color-border]">
              <th className="px-3 py-2 text-left font-semibold text-[--color-muted-foreground] w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold text-[--color-muted-foreground]">{table.rowLabel}</th>
              <th className="px-3 py-2 text-right font-semibold text-[--color-muted-foreground]">{table.valueLabel} ({table.unit})</th>
              {!readOnly && <th className="w-16 px-2 py-2 text-center font-semibold text-[--color-muted-foreground]">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b border-[--color-border] hover:bg-[--color-muted]/20 group">
                <td className="px-3 py-1.5 text-[--color-muted-foreground] tabular-nums">{i + 1}</td>
                <td className="px-3 py-1.5">
                  {editingIdx === i ? (
                    <Input value={editKey} onChange={e => setEditKey(e.target.value)} className="h-6 text-xs py-0" />
                  ) : (
                    <span className="font-medium">{row.key}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {editingIdx === i ? (
                    <Input value={editVal} onChange={e => setEditVal(e.target.value)} className="h-6 text-xs py-0 text-right w-28 ml-auto"
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingIdx(null); }} />
                  ) : (
                    <span className={cn('tabular-nums', row.value > avg ? 'text-blue-600 dark:text-blue-400' : 'text-[--color-foreground]')}>
                      {row.value.toFixed(3)}
                    </span>
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1.5 text-center">
                    {editingIdx === i ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={commitEdit} className="text-green-600"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingIdx(null)} className="text-red-500"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => startEdit(i)} className="p-0.5 hover:text-[--color-primary]"><Pencil className="h-3 w-3" /></button>
                        <button onClick={() => deleteRow(i)} className="p-0.5 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
