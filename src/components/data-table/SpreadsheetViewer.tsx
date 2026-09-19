import { useState, useRef, useCallback } from 'react';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { Button, Input, Badge, getBadgeStyleProps, type BadgeStyle } from '@/components/ui';
import {
  Search, Download, ChevronLeft, ChevronRight,
  Lock, Pencil, Check, X,
} from 'lucide-react';

export interface SpreadsheetColumn {
  key: string;
  label: string;
  width?: number;
  type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'badge';
  editable?: boolean;
  badgeMap?: Record<string, BadgeStyle>;
  align?: 'left' | 'right' | 'center';
  frozen?: boolean;
}

interface SpreadsheetViewerProps {
  columns: SpreadsheetColumn[];
  rows: Record<string, unknown>[];
  title?: string;
  pageSize?: number;
  onRowUpdate?: (rowIndex: number, key: string, value: string) => void;
  onRowDelete?: (rowIndex: number) => void;
  readOnly?: boolean;
  className?: string;
}

function formatCell(value: unknown, type: SpreadsheetColumn['type']): string {
  if (value === null || value === undefined) return '—';
  if (type === 'number') return typeof value === 'number' ? formatNumber(value, 2) : String(value);
  if (type === 'currency') return typeof value === 'number' ? formatCurrency(value) : String(value);
  if (type === 'percent') return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
  return String(value);
}

export function SpreadsheetViewer({
  columns, rows, title, pageSize = 20,
  onRowUpdate, onRowDelete, readOnly = false, className,
}: SpreadsheetViewerProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ row: number; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter
  const filtered = rows.filter(row =>
    Object.values(row).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  // Sort
  const sorted = sortCol ? [...filtered].sort((a, b) => {
    const av = a[sortCol]; const bv = b[sortCol];
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }) : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: string) {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
    setPage(0);
  }

  function startEdit(rowIdx: number, key: string, currentValue: unknown) {
    if (readOnly) return;
    const col = columns.find(c => c.key === key);
    if (!col?.editable) return;
    setEditingCell({ row: rowIdx, key });
    setEditValue(String(currentValue ?? ''));
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function commitEdit() {
    if (!editingCell) return;
    onRowUpdate?.(page * pageSize + editingCell.row, editingCell.key, editValue);
    setEditingCell(null);
  }

  function cancelEdit() { setEditingCell(null); }

  function toggleRowSelect(idx: number) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRows.size === pageRows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(pageRows.map((_, i) => i)));
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-[--color-border] bg-[--color-muted]/30 flex-shrink-0">
        {title && <span className="text-xs font-semibold text-[--color-muted-foreground] mr-2 hidden sm:inline">{title}</span>}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[--color-muted-foreground]" />
          <Input
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Filter rows…" className="pl-6 h-7 w-44 text-xs"
          />
        </div>
        <span className="text-xs text-[--color-muted-foreground] ml-1">
          {filtered.length.toLocaleString()} / {rows.length.toLocaleString()} rows
        </span>
        {selectedRows.size > 0 && !readOnly && (
          <Button variant="destructive" size="sm" className="h-7 text-xs ml-1"
            onClick={() => { selectedRows.forEach(i => onRowDelete?.(page * pageSize + i)); setSelectedRows(new Set()); }}>
            Delete {selectedRows.size} selected
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {readOnly && <Badge variant="secondary" className="text-xs gap-1"><Lock className="h-2.5 w-2.5" />Read-only</Badge>}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Download className="h-3 w-3" />Export
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: columns.reduce((a, c) => a + (c.width ?? 120), 40) }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[--color-muted]/60 backdrop-blur">
              {/* Row number / select */}
              <th className="w-10 min-w-[40px] border-b border-r border-[--color-border] px-2 py-1.5 text-center">
                <input type="checkbox" className="h-3 w-3 accent-[--color-primary]"
                  checked={selectedRows.size === pageRows.length && pageRows.length > 0}
                  onChange={toggleAll} />
              </th>
              <th className="w-10 min-w-[40px] border-b border-r border-[--color-border] px-2 py-1.5 text-center text-[--color-muted-foreground] font-medium">#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width ?? 120, minWidth: col.width ?? 80 }}
                  className={cn(
                    'border-b border-r border-[--color-border] px-2 py-1.5 font-semibold text-[--color-muted-foreground] cursor-pointer select-none whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    sortCol === col.key && 'bg-[--color-accent] text-[--color-foreground]',
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1 justify-between">
                    <span className="truncate">{col.label}</span>
                    {sortCol === col.key
                      ? <span className="shrink-0">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      : <span className="shrink-0 opacity-20">↕</span>}
                  </span>
                </th>
              ))}
              {!readOnly && <th className="w-16 border-b border-[--color-border] px-2 py-1.5 text-center text-[--color-muted-foreground]">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + 3} className="text-center py-12 text-[--color-muted-foreground]">No rows match your filter</td></tr>
            )}
            {pageRows.map((row, rowIdx) => {
              const isSelected = selectedRows.has(rowIdx);
              const globalIdx = page * pageSize + rowIdx;
              return (
                <tr
                  key={rowIdx}
                  className={cn(
                    'group border-b border-[--color-border] hover:bg-[--color-muted]/30 transition-colors',
                    isSelected && 'bg-blue-50/50 dark:bg-blue-950/20',
                  )}
                >
                  <td className="px-2 py-1 text-center border-r border-[--color-border]">
                    <input type="checkbox" className="h-3 w-3 accent-[--color-primary]"
                      checked={isSelected} onChange={() => toggleRowSelect(rowIdx)} />
                  </td>
                  <td className="px-2 py-1 text-center text-[--color-muted-foreground] border-r border-[--color-border] tabular-nums select-none">
                    {globalIdx + 1}
                  </td>
                  {columns.map(col => {
                    const val = row[col.key];
                    const isEditing = editingCell?.row === rowIdx && editingCell?.key === col.key;
                    return (
                      <td
                        key={col.key}
                        style={{ width: col.width ?? 120 }}
                        className={cn(
                          'px-2 py-1 border-r border-[--color-border] max-w-0',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.editable && !readOnly && 'cursor-pointer hover:bg-[--color-accent]/40',
                          col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'tabular-nums' : '',
                        )}
                        onDoubleClick={() => startEdit(rowIdx, col.key, val)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={inputRef}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                              className="w-full min-w-0 bg-white dark:bg-gray-800 border border-[--color-primary] rounded px-1 py-0 text-xs outline-none"
                            />
                            <button onClick={commitEdit} className="text-green-600 hover:text-green-700"><Check className="h-3 w-3" /></button>
                            <button onClick={cancelEdit} className="text-red-500 hover:text-red-600"><X className="h-3 w-3" /></button>
                          </div>
                        ) : col.type === 'badge' && col.badgeMap ? (
                          <Badge {...getBadgeStyleProps(col.badgeMap[String(val)] ?? 'secondary')}>{String(val)}</Badge>
                        ) : (
                          <span className={cn(
                            'block truncate',
                            col.editable && !readOnly && 'group-hover:underline group-hover:decoration-dotted',
                          )}>
                            {formatCell(val, col.type)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td className="px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          const editableCol = columns.find(c => c.editable);
                          if (editableCol) startEdit(rowIdx, editableCol.key, row[editableCol.key]);
                        }} className="p-1 rounded hover:bg-[--color-accent] text-[--color-muted-foreground]">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => onRowDelete?.(globalIdx)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[--color-border] bg-[--color-muted]/20 flex-shrink-0 text-xs text-[--color-muted-foreground]">
        <span>
          Showing {Math.min(page * pageSize + 1, sorted.length)}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length.toLocaleString()} rows
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={page === 0} onClick={() => setPage(0)}>«</Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="px-2">Page {page + 1} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</Button>
        </div>
      </div>
    </div>
  );
}
