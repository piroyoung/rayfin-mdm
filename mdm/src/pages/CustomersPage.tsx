/** Customers: list, search, CRUD, lifecycle actions, and duplicate merge. */
import { useMemo, useState } from 'react';

import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  mergeCustomers,
  setCustomerStatus,
  updateCustomer,
  type CustomerInput,
} from '@/services/customers';
import { submitChangeRequest } from '@/services/stewardship';
import { findCustomerDuplicates } from '@/domain/duplicates';
import { scoreCustomer } from '@/domain/quality';
import {
  labelledMeta,
  optionsOf,
  RECORD_STATUS_META,
  SEGMENT_META,
  tonedMeta,
  isActiveStatus,
  type Customer,
  type RecordStatus,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { fmtRelative } from '@/lib/format';
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

const EMPTY: CustomerInput = {
  customerCode: '',
  name: '',
  segment: 'corporate',
};

function snapshot(c: Customer): CustomerInput {
  return {
    customerCode: c.customerCode,
    name: c.name,
    legalName: c.legalName,
    email: c.email,
    phone: c.phone,
    taxId: c.taxId,
    website: c.website,
    segment: c.segment,
    industry: c.industry,
    addressLine1: c.addressLine1,
    city: c.city,
    stateProvince: c.stateProvince,
    postalCode: c.postalCode,
    countryCode: c.countryCode,
    sourceSystem: c.sourceSystem,
  };
}

function CustomerForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: CustomerInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: CustomerInput) => void;
}) {
  const [form, setForm] = useState<CustomerInput>(initial);
  const set = (patch: Partial<CustomerInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const quality = scoreCustomer(form);
  const valid =
    (form.customerCode ?? '').trim() !== '' && (form.name ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer code" required>
          <Input
            value={form.customerCode}
            onChange={(e) => set({ customerCode: e.target.value })}
            placeholder="CUST-1001"
            required
          />
        </Field>
        <Field label="Segment" required>
          <Select
            value={form.segment}
            onChange={(e) =>
              set({ segment: e.target.value as CustomerInput['segment'] })
            }
          >
            {optionsOf(SEGMENT_META).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Contoso Ltd"
            required
          />
        </Field>
        <Field label="Legal name">
          <Input
            value={form.legalName ?? ''}
            onChange={(e) => set({ legalName: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone ?? ''}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Tax ID">
          <Input
            value={form.taxId ?? ''}
            onChange={(e) => set({ taxId: e.target.value })}
          />
        </Field>
        <Field label="Website">
          <Input
            value={form.website ?? ''}
            onChange={(e) => set({ website: e.target.value })}
          />
        </Field>
        <Field label="Industry">
          <Input
            value={form.industry ?? ''}
            onChange={(e) => set({ industry: e.target.value })}
          />
        </Field>
        <Field label="Source system">
          <Input
            value={form.sourceSystem ?? ''}
            onChange={(e) => set({ sourceSystem: e.target.value })}
            placeholder="SAP, Salesforce…"
          />
        </Field>
        <Field label="Address line 1">
          <Input
            value={form.addressLine1 ?? ''}
            onChange={(e) => set({ addressLine1: e.target.value })}
          />
        </Field>
        <Field label="City">
          <Input
            value={form.city ?? ''}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
        <Field label="State / province">
          <Input
            value={form.stateProvince ?? ''}
            onChange={(e) => set({ stateProvince: e.target.value })}
          />
        </Field>
        <Field label="Postal code">
          <Input
            value={form.postalCode ?? ''}
            onChange={(e) => set({ postalCode: e.target.value })}
          />
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. US, GB, JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) =>
              set({ countryCode: e.target.value.toUpperCase() })
            }
          />
        </Field>
      </div>

      <div className="mt-5 rounded-lg bg-gray-50 p-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Live quality score
          </span>
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
        <Button variant="primary" type="submit" loading={saving} disabled={!valid}>
          Save
        </Button>
      </div>
    </form>
  );
}

export function CustomersPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listCustomers);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const customers = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.customerCode, c.name, c.legalName, c.email, c.taxId, c.city]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [customers, search, statusFilter]);

  const duplicates = useMemo(
    () => findCustomerDuplicates(customers),
    [customers]
  );

  async function handleSave(input: CustomerInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateCustomer(editing.id, input);
        toast('Customer updated.', 'success');
      } else {
        await createCustomer(input);
        toast('Customer created.', 'success');
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

  function submitForApproval(c: Customer) {
    return runAction(
      c.id,
      () =>
        submitChangeRequest({
          domain: 'customer',
          changeType: c.status === 'draft' ? 'create' : 'update',
          recordId: c.id,
          recordLabel: `${c.customerCode} — ${c.name}`,
          payload: snapshot(c),
        }),
      'Submitted for approval.'
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Customer master records, stewardship and golden-record management."
        actions={
          <Tooltip label="新しい顧客マスターレコードを作成します" side="bottom">
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              + New customer
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
                      () => mergeCustomers(winner, losers),
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
          <div className="relative min-w-0 flex-1">
            <Input
              placeholder="Search code, name, email, tax ID…"
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
            <Spinner size="lg" label="Loading customers…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load customers" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No customers found"
            description={
              customers.length === 0
                ? 'Create your first customer master record.'
                : 'Try adjusting your search or filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.isGolden && (
                          <span title="Golden record" className="text-amber-500">
                            ★
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {c.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {c.customerCode}
                            {c.city ? ` · ${c.city}` : ''}
                            {c.countryCode ? `, ${c.countryCode}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {labelledMeta(SEGMENT_META, c.segment).label}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tonedMeta(RECORD_STATUS_META, c.status).tone}>
                        {tonedMeta(RECORD_STATUS_META, c.status).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <QualityBadge score={c.qualityScore} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(c.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.status !== 'merged' && (
                          <Tooltip label="この顧客情報を編集します">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCreating(false);
                                setEditing(c);
                              }}
                            >
                              Edit
                            </Button>
                          </Tooltip>
                        )}
                        {(c.status === 'draft' || c.status === 'rejected') && (
                          <Tooltip label="この顧客レコードを承認に提出します">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={busyId === c.id}
                              onClick={() => submitForApproval(c)}
                            >
                              Submit
                            </Button>
                          </Tooltip>
                        )}
                        {c.status === 'approved' && (
                          <Tooltip label="この顧客レコードをアーカイブ（保管）します">
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busyId === c.id}
                              onClick={() =>
                                runAction(
                                  c.id,
                                  () => setCustomerStatus(c, 'archived'),
                                  'Customer archived.'
                                )
                              }
                            >
                              Archive
                            </Button>
                          </Tooltip>
                        )}
                        {isActiveStatus(c.status) &&
                          c.status !== 'approved' &&
                          c.status !== 'pending_approval' && (
                            <Tooltip label="この顧客レコードを完全に削除します（取り消せません）">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setToDelete(c)}
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
        title={editing ? `Edit ${editing.name}` : 'New customer'}
        size="lg"
      >
        <CustomerForm
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
        title="Delete customer"
        message={
          toDelete
            ? `Permanently delete ${toDelete.name} (${toDelete.customerCode})? This cannot be undone.`
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
            () => deleteCustomer(target),
            'Customer deleted.'
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
  records: Customer[];
  reasons: string[];
  busy: boolean;
  onMerge: (winner: Customer, losers: Customer[]) => void;
}) {
  const [winnerId, setWinnerId] = useState(
    () =>
      [...records].sort(
        (a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
      )[0].id
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="mb-2 text-xs text-amber-700">
        Match: {reasons.join(', ')}
      </p>
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
              {r.name}{' '}
              <span className="text-xs text-gray-500">({r.customerCode})</span>
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
