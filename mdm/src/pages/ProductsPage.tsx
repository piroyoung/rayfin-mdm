/** Products: list, search, CRUD, lifecycle actions, and duplicate merge. */
import { useMemo, useState } from 'react';

import {
  createProduct,
  deleteProduct,
  listProducts,
  mergeProducts,
  setProductStatus,
  updateProduct,
  type ProductInput,
} from '@/services/products';
import { submitChangeRequest } from '@/services/stewardship';
import { findProductDuplicates } from '@/domain/duplicates';
import { scoreProduct } from '@/domain/quality';
import {
  optionsOf,
  RECORD_STATUS_META,
  tonedMeta,
  UOM_META,
  isActiveStatus,
  type Product,
  type RecordStatus,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { fmtMoney, fmtRelative } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  QualityBadge,
  Select,
  Spinner,
  Tooltip,
} from '@/components/ui';

const EMPTY: ProductInput = {
  sku: '',
  name: '',
  unitOfMeasure: 'each',
};

function snapshot(p: Product): ProductInput {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    brand: p.brand,
    gtin: p.gtin,
    unitOfMeasure: p.unitOfMeasure,
    listPrice: p.listPrice,
    currency: p.currency,
    sourceSystem: p.sourceSystem,
  };
}

function ProductForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: ProductInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: ProductInput) => void;
}) {
  const [form, setForm] = useState<ProductInput>(initial);
  const set = (patch: Partial<ProductInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const quality = scoreProduct(form);
  const valid = (form.sku ?? '').trim() !== '' && (form.name ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="SKU" required>
          <Input
            value={form.sku}
            onChange={(e) => set({ sku: e.target.value })}
            placeholder="SKU-9001"
            required
          />
        </Field>
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Surface Laptop 7"
            required
          />
        </Field>
        <Field label="Category">
          <Input
            value={form.category ?? ''}
            onChange={(e) => set({ category: e.target.value })}
          />
        </Field>
        <Field label="Brand">
          <Input
            value={form.brand ?? ''}
            onChange={(e) => set({ brand: e.target.value })}
          />
        </Field>
        <Field label="GTIN / barcode">
          <Input
            value={form.gtin ?? ''}
            onChange={(e) => set({ gtin: e.target.value })}
          />
        </Field>
        <Field label="Unit of measure" required>
          <Select
            value={form.unitOfMeasure}
            onChange={(e) =>
              set({
                unitOfMeasure: e.target.value as ProductInput['unitOfMeasure'],
              })
            }
          >
            {optionsOf(UOM_META).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="List price">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.listPrice ?? ''}
            onChange={(e) =>
              set({
                listPrice:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Currency" hint="ISO-3, e.g. USD, EUR, JPY">
          <Input
            value={form.currency ?? ''}
            maxLength={3}
            onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Source system">
          <Input
            value={form.sourceSystem ?? ''}
            onChange={(e) => set({ sourceSystem: e.target.value })}
            placeholder="SAP, Web…"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Description">
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-lg bg-gray-50 p-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Live quality score</span>
          <span className="text-gray-900">{quality.score}%</span>
        </div>
        <ProgressBar
          value={quality.score}
          tone={
            quality.score >= 80
              ? 'green'
              : quality.score >= 50
                ? 'amber'
                : 'red'
          }
        />
        {quality.missing.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Missing: {quality.missing.join(', ')}
          </p>
        )}
        {quality.invalid.length > 0 && (
          <p className="mt-1 text-xs text-red-600">
            Invalid: {quality.invalid.join(', ')}
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={saving}
          disabled={!valid}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listProducts);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const products = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.sku, p.name, p.brand, p.category, p.gtin]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [products, search, statusFilter]);

  const duplicates = useMemo(
    () => findProductDuplicates(products),
    [products]
  );

  async function handleSave(input: ProductInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, input);
        toast('Product updated.', 'success');
      } else {
        await createProduct(input);
        toast('Product created.', 'success');
      }
      setEditing(null);
      setCreating(false);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusyId(id);
    try {
      await fn();
      toast(ok, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  function submitForApproval(p: Product) {
    return runAction(
      p.id,
      () =>
        submitChangeRequest({
          domain: 'product',
          changeType: p.status === 'draft' ? 'create' : 'update',
          recordId: p.id,
          recordLabel: `${p.sku} — ${p.name}`,
          payload: snapshot(p),
        }),
      'Submitted for approval.'
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Product master records sharing the same stewardship and quality machinery."
        actions={
          <Tooltip label="新しい製品マスターレコードを作成します" side="bottom">
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              + New product
            </Button>
          </Tooltip>
        }
      />

      {duplicates.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowDuplicates((v) => !v)}
          >
            <span className="text-sm font-medium text-amber-800">
              ⚠ {duplicates.length} potential duplicate group
              {duplicates.length > 1 ? 's' : ''} detected
            </span>
            <span className="text-xs text-amber-700">
              {showDuplicates ? 'Hide' : 'Review & merge'}
            </span>
          </button>
          {showDuplicates && (
            <div className="mt-4 space-y-4">
              {duplicates.map((group) => (
                <DuplicateGroupCard
                  key={group.key}
                  records={group.records}
                  reasons={group.reasons}
                  busy={busyId === group.key}
                  onMerge={(winner, losers) =>
                    runAction(
                      group.key,
                      () => mergeProducts(winner, losers),
                      'Records merged.'
                    )
                  }
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Search SKU, name, brand, GTIN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RecordStatus | 'all')
            }
          >
            <option value="all">All statuses</option>
            {optionsOf(RECORD_STATUS_META).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading products…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load products" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              products.length === 0
                ? 'Create your first product master record.'
                : 'Try adjusting your search or filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.isGolden && (
                          <span title="Golden record" className="text-amber-500">
                            ★
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {p.sku}
                            {p.brand ? ` · ${p.brand}` : ''}
                            {p.category ? ` · ${p.category}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtMoney(p.listPrice, p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tonedMeta(RECORD_STATUS_META, p.status).tone}>
                        {tonedMeta(RECORD_STATUS_META, p.status).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <QualityBadge score={p.qualityScore} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(p.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.status !== 'merged' && (
                          <Tooltip label="この製品情報を編集します">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCreating(false);
                                setEditing(p);
                              }}
                            >
                              Edit
                            </Button>
                          </Tooltip>
                        )}
                        {(p.status === 'draft' || p.status === 'rejected') && (
                          <Tooltip label="この製品レコードを承認に提出します">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={busyId === p.id}
                              onClick={() => submitForApproval(p)}
                            >
                              Submit
                            </Button>
                          </Tooltip>
                        )}
                        {p.status === 'approved' && (
                          <Tooltip label="この製品レコードをアーカイブ（保管）します">
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busyId === p.id}
                              onClick={() =>
                                runAction(
                                  p.id,
                                  () => setProductStatus(p, 'archived'),
                                  'Product archived.'
                                )
                              }
                            >
                              Archive
                            </Button>
                          </Tooltip>
                        )}
                        {isActiveStatus(p.status) &&
                          p.status !== 'approved' &&
                          p.status !== 'pending_approval' && (
                            <Tooltip label="この製品レコードを完全に削除します（取り消せません）">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setToDelete(p)}
                              >
                                Delete
                              </Button>
                            </Tooltip>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.name}` : 'New product'}
        size="lg"
      >
        <ProductForm
          initial={editing ? snapshot(editing) : EMPTY}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={handleSave}
        />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete product"
        message={
          toDelete
            ? `Permanently delete ${toDelete.name} (${toDelete.sku})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={busyId === toDelete?.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const target = toDelete;
          setToDelete(null);
          void runAction(
            target.id,
            () => deleteProduct(target),
            'Product deleted.'
          );
        }}
      />
    </div>
  );
}

function DuplicateGroupCard({
  records,
  reasons,
  busy,
  onMerge,
}: {
  records: Product[];
  reasons: string[];
  busy: boolean;
  onMerge: (winner: Product, losers: Product[]) => void;
}) {
  const [winnerId, setWinnerId] = useState(
    () =>
      [...records].sort(
        (a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
      )[0].id
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="mb-2 text-xs text-amber-700">Match: {reasons.join(', ')}</p>
      <div className="space-y-1.5">
        {records.map((r) => (
          <label
            key={r.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-amber-50"
          >
            <input
              type="radio"
              name={`winner-${records[0].id}`}
              checked={winnerId === r.id}
              onChange={() => setWinnerId(r.id)}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
              {r.name} <span className="text-xs text-gray-500">({r.sku})</span>
            </span>
            <QualityBadge score={r.qualityScore} />
            <Badge tone={tonedMeta(RECORD_STATUS_META, r.status).tone}>
              {tonedMeta(RECORD_STATUS_META, r.status).label}
            </Badge>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <Tooltip
          label="選択したレコードを正として残し、残りを 1 件に統合（名寄せ）します"
          side="top"
        >
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            onClick={() => {
              const winner = records.find((r) => r.id === winnerId)!;
              onMerge(
                winner,
                records.filter((r) => r.id !== winnerId)
              );
            }}
          >
            Keep selected &amp; merge rest
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
