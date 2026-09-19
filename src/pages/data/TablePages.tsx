import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, getBadgeStyleProps, type BadgeStyle,
  Alert, AlertTitle, AlertDescription,
} from '@/components/ui';
import { VectorTableViewer } from '@/components/data-table/VectorTableViewer';
import { Matrix2DViewer } from '@/components/data-table/Matrix2DViewer';
import { Cube3DViewer } from '@/components/data-table/Cube3DViewer';
import {
  allTables, mortalityImprovementVector, creditingRateVector, expenseVector,
  lapseTable2D, mortalityTable2D, indexCreditingTable2D, lapseTable3D, reserveFactors3D,
  type AnyTable,
} from '@/lib/table-data';
import { ChevronLeft, Layers, Table2, TrendingUp, Lock, Pencil, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Table Registry Page ───────────────────────────────────────────────────────
// Lists all available actuarial tables grouped by dimension

export function TableRegistryPage() {
  const vectors = allTables.filter(t => t.dimension === '1D');
  const matrices = allTables.filter(t => t.dimension === '2D');
  const cubes = allTables.filter(t => t.dimension === '3D');
  const dimBadgeStyle = (dim: '1D' | '2D' | '3D'): BadgeStyle => dim === '1D' ? 'info' : dim === '2D' ? 'purple' : 'warning';

  const DimBadge = ({ dim }: { dim: '1D' | '2D' | '3D' }) => (
    <Badge {...getBadgeStyleProps(dimBadgeStyle(dim))}>
      {dim === '1D' ? <TrendingUp className="h-3 w-3 mr-1" /> : dim === '2D' ? <Table2 className="h-3 w-3 mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
      {dim} {dim === '1D' ? 'Vector' : dim === '2D' ? 'Matrix' : 'Cube'}
    </Badge>
  );

  function TableCard({ table }: { table: AnyTable }) {
    return (
      <Link to={`/data/tables/${table.id}`}>
        <div className="rounded-lg border border-[--color-border] p-4 hover:border-[--color-primary] hover:shadow-sm transition-all group cursor-pointer bg-[--color-card]">
          <div className="flex items-start justify-between mb-2">
            <DimBadge dim={table.dimension} />
            <span className="text-xs text-[--color-muted-foreground] font-mono">{table.id}</span>
          </div>
          <h3 className="text-sm font-semibold mt-2 group-hover:text-[--color-primary] transition-colors line-clamp-2">{table.name}</h3>
          <p className="text-xs text-[--color-muted-foreground] mt-1 line-clamp-2">{table.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[--color-muted-foreground]">
            {table.dimension === '1D' && <span>{(table as import('@/lib/table-data').VectorTable).rows.length} rows</span>}
            {table.dimension === '2D' && <span>{(table as import('@/lib/table-data').Matrix2DTable).rows.length} × {(table as import('@/lib/table-data').Matrix2DTable).cols.length}</span>}
            {table.dimension === '3D' && (
              <span>{(table as import('@/lib/table-data').Cube3DTable).axes[0].length} × {(table as import('@/lib/table-data').Cube3DTable).axes[1].length} × {(table as import('@/lib/table-data').Cube3DTable).axes[2].length}</span>
            )}
            <span>·</span>
            <span>Unit: {table.unit}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actuarial Table Registry"
        description="Browse and edit all actuarial assumption tables — vectors, matrices, and 3D cubes"
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '1D Vectors', count: vectors.length, color: 'text-blue-600', icon: <TrendingUp className="h-5 w-5" /> },
          { label: '2D Matrices', count: matrices.length, color: 'text-purple-600', icon: <Table2 className="h-5 w-5" /> },
          { label: '3D Cubes', count: cubes.length, color: 'text-amber-600', icon: <Layers className="h-5 w-5" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('opacity-60', s.color)}>{s.icon}</div>
              <div>
                <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
                <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Badge {...getBadgeStyleProps('info')}><TrendingUp className="h-3 w-3 mr-1" />1D Vectors</Badge>
            <span className="text-[--color-muted-foreground] font-normal">Single-dimension lookup tables</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {vectors.map(t => <TableCard key={t.id} table={t} />)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Badge {...getBadgeStyleProps('purple')}><Table2 className="h-3 w-3 mr-1" />2D Matrices</Badge>
            <span className="text-[--color-muted-foreground] font-normal">Row × column tabular data</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {matrices.map(t => <TableCard key={t.id} table={t} />)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Badge {...getBadgeStyleProps('warning')}><Layers className="h-3 w-3 mr-1" />3D Cubes</Badge>
            <span className="text-[--color-muted-foreground] font-normal">Three-dimensional factor arrays</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {cubes.map(t => <TableCard key={t.id} table={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Individual Table Detail Page ──────────────────────────────────────────────

export function TableDetailPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [readOnly, setReadOnly] = useState(true);
  const [saved, setSaved] = useState(false);

  const table = allTables.find(t => t.id === tableId);

  if (!table) return (
    <div className="text-center py-20 text-[--color-muted-foreground]">
      <p className="text-lg font-medium">Table not found</p>
      <Link to="/data/tables" className="text-[--color-primary] text-sm mt-2 inline-block">← Back to Table Registry</Link>
    </div>
  );

  function handleUpdate() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const DimBadge = () => (
    <Badge {...getBadgeStyleProps(table.dimension === '1D' ? 'info' : table.dimension === '2D' ? 'purple' : 'warning')}>
      {table.dimension === '1D' ? <TrendingUp className="h-3 w-3 mr-1" /> : table.dimension === '2D' ? <Table2 className="h-3 w-3 mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
      {table.dimension === '1D' ? '1D Vector' : table.dimension === '2D' ? '2D Matrix' : '3D Cube'}
    </Badge>
  );

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-sm text-[--color-muted-foreground]">
        <Link to="/data/tables" className="flex items-center gap-1 hover:text-[--color-foreground] transition-colors">
          <ChevronLeft className="h-4 w-4" />Table Registry
        </Link>
        <span>/</span>
        <span className="text-[--color-foreground]">{table.name}</span>
      </div>

      <PageHeader
        title={table.name}
        description={table.description}
        actions={
          <div className="flex items-center gap-2">
            <DimBadge />
            <span className="text-xs font-mono text-[--color-muted-foreground] border border-[--color-border] px-2 py-0.5 rounded">{table.id}</span>
            <Button
              variant={readOnly ? 'outline' : 'default'}
              size="sm"
              onClick={() => setReadOnly(r => !r)}
            >
              {readOnly
                ? <><Pencil className="h-3.5 w-3.5" />Edit Table</>
                : <><Lock className="h-3.5 w-3.5" />Lock Table</>
              }
            </Button>
          </div>
        }
      />

      {saved && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Table updated successfully</AlertTitle>
          <AlertDescription>Changes saved to the in-memory store. In production, this would persist to the database.</AlertDescription>
        </Alert>
      )}

      {!readOnly && (
        <Alert variant="warning">
          <Pencil className="h-4 w-4" />
          <AlertTitle>Edit mode active</AlertTitle>
          <AlertDescription>
            {table.dimension === '1D' && 'Double-click any value cell or use the edit icon to modify rows.'}
            {table.dimension === '2D' && 'Double-click any cell in the matrix to edit its value inline.'}
            {table.dimension === '3D' && 'Select a slice axis and index, then double-click cells to edit. Navigate slices to edit the full cube.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-5">
          {table.dimension === '1D' && (
            <VectorTableViewer
              table={table as import('@/lib/table-data').VectorTable}
              readOnly={readOnly}
              onUpdate={handleUpdate}
            />
          )}
          {table.dimension === '2D' && (
            <Matrix2DViewer
              table={table as import('@/lib/table-data').Matrix2DTable}
              readOnly={readOnly}
              onUpdate={handleUpdate}
            />
          )}
          {table.dimension === '3D' && (
            <Cube3DViewer
              table={table as import('@/lib/table-data').Cube3DTable}
              readOnly={readOnly}
              onUpdate={handleUpdate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
