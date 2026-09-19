import { useState, useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Input, SortButton, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  searchColumn?: string;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data, columns, searchPlaceholder = 'Search…',
  searchColumn, pageSize = 10, className, emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[--color-muted-foreground]" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="ml-auto text-xs text-[--color-muted-foreground]">
          {table.getFilteredRowModel().rows.length} row{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[--color-border] overflow-hidden">
        <Table>
          <TableHeader className="bg-[--color-muted]/40">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="hover:bg-transparent border-b-[--color-border]">
                {hg.headers.map(header => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <SortButton
                        onClick={() => header.column.toggleSorting()}
                        direction={header.column.getIsSorted()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </SortButton>
                    ) : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[--color-muted-foreground]">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[--color-muted-foreground]">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={v => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(s => (
                <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
