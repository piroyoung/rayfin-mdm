/** TerritoryAccountAssignment: direct edit of account → territory placements. */
import { useMemo, useState } from 'react';

import { listAccounts, accountName } from '@/services/accounts';
import { listTerritories } from '@/services/territories';
import { listFiscalYears } from '@/services/fiscalYears';
import {
  createTerritoryAssignment,
  deleteTerritoryAssignment,
  listTerritoryAssignments,
  setTerritoryAssignmentStatus,
  type TerritoryAssignmentInput,
} from '@/services/assignments';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCrudForm } from '@/hooks/useCrudForm';
import { useToast } from '@/hooks/useToast';
import { lookupFn } from '@/lib/listing';
import { workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type Account,
  type FiscalYear,
  type Territory,
  type TerritoryAccountAssignment,
} from '@/domain/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Tooltip,
} from '@/components/ui';
import { FormActions, ListCard, RowActions } from '@/components/listing';

interface PageData {
  rows: TerritoryAccountAssignment[];
  accounts: Account[];
  territories: Territory[];
  fiscalYears: FiscalYear[];
}

const loadData = async (): Promise<PageData> => {
  const [rows, accounts, territories, fiscalYears] = await Promise.all([
    listTerritoryAssignments(),
    listAccounts(),
    listTerritories(),
    listFiscalYears(),
  ]);
  return { rows, accounts, territories, fiscalYears };
};

const EMPTY: TerritoryAssignmentInput = {
  accountId: '',
  territoryId: '',
  fiscalYearId: '',
};

function snapshot(r: TerritoryAccountAssignment): TerritoryAssignmentInput {
  return {
    accountId: r.accountId,
    territoryId: r.territoryId,
    fiscalYearId: r.fiscalYearId,
    assignmentType: r.assignmentType,
  };
}

function CreateForm({
  initial = EMPTY,
  accounts,
  territories,
  fiscalYears,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: TerritoryAssignmentInput;
  accounts: Account[];
  territories: Territory[];
  fiscalYears: FiscalYear[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryAssignmentInput) => void;
}) {
  const [form, setForm] = useState<TerritoryAssignmentInput>(initial);
  const set = (patch: Partial<TerritoryAssignmentInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = form.accountId && form.territoryId && form.fiscalYearId;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Account" required>
            <Select
              value={form.accountId}
              onChange={(e) => set({ accountId: e.target.value })}
              required
            >
              <option value="">— select an account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountName(a)} ({a.accountNumber})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Territory" required>
          <Select
            value={form.territoryId}
            onChange={(e) => set({ territoryId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fiscal year" required>
          <Select
            value={form.fiscalYearId}
            onChange={(e) => set({ fiscalYearId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
                {fy.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assignment type" hint="Optional, e.g. primary, overlay">
          <Input
            value={form.assignmentType ?? ''}
            onChange={(e) =>
              set({ assignmentType: e.target.value || undefined })
            }
          />
        </Field>
      </div>

      <FormActions
        onCancel={onCancel}
        saving={saving}
        disabled={!valid}
        submitLabel="Create"
      />
    </form>
  );
}

export function TerritoryAccountAssignmentsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(loadData);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const territories = useMemo(() => data?.territories ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);

  const form = useCrudForm<
    TerritoryAccountAssignment,
    TerritoryAssignmentInput
  >();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TerritoryAccountAssignment | null>(
    null
  );

  const accName = useMemo(
    () => lookupFn(accounts, (a) => a.id, (a) => accountName(a)),
    [accounts]
  );
  const terrCode = useMemo(
    () =>
      lookupFn(
        territories,
        (t) => t.id,
        (t) => t.territoryCode,
        () => '—'
      ),
    [territories]
  );
  const fyCode = useMemo(
    () =>
      lookupFn(
        fiscalYears,
        (fy) => fy.id,
        (fy) => fy.code,
        () => '—'
      ),
    [fiscalYears]
  );

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
      ),
    [rows]
  );

  async function handleCreate(input: TerritoryAssignmentInput) {
    setSaving(true);
    try {
      await createTerritoryAssignment(input);
      toast('Placement created.', 'success');
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    fn: () => Promise<unknown>,
    ok: string
  ) {
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

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setBusyId(target.id);
    try {
      await deleteTerritoryAssignment(target);
      toast('Placement removed.', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="TerritoryAccountAssignment"
        subtitle="Which territory an account sits in for a fiscal year. One row per account / FY; history is preserved."
        actions={
          <Tooltip label="新しいテリトリ配置を作成します" side="bottom">
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New placement
            </Button>
          </Tooltip>
        }
      />

      <ListCard
        loading={loading}
        error={error}
        isEmpty={sorted.length === 0}
        loadingLabel="Loading placements…"
        errorTitle="Couldn't load placements"
        emptyTitle="No placements yet"
        emptyDescription="Place an account in a territory to get started."
      >
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Fiscal year</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row) => {
                  const meta = tonedMeta(
                    ASSIGNMENT_STATUS_META,
                    row.assignmentStatus
                  );
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {accName(row.accountId)}
                        {!row.currentFlag && (
                          <span className="ml-2 text-xs text-gray-400">
                            (history)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fyCode(row.fiscalYearId)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.assignmentType ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions>
                          {workflowActions(row.assignmentStatus).map((a) => (
                            <Button
                              key={a.to}
                              size="sm"
                              variant={a.variant}
                              loading={busyId === row.id}
                              onClick={() =>
                                runAction(
                                  row.id,
                                  () =>
                                    setTerritoryAssignmentStatus(row, a.to),
                                  `Placement → ${a.to}.`
                                )
                              }
                            >
                              {a.label}
                            </Button>
                          ))}
                          <Tooltip label="この行をコピーして新規作成します（年度を変えて再利用）">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => form.startDuplicate(snapshot(row))}
                            >
                              Copy
                            </Button>
                          </Tooltip>
                          <Tooltip label="この配置を削除します">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setToDelete(row)}
                            >
                              Delete
                            </Button>
                          </Tooltip>
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
        </table>
      </ListCard>

      <Modal
        open={form.open}
        onClose={form.close}
        title={
          form.mode === 'duplicate'
            ? 'Copy placement'
            : 'New territory placement'
        }
        size="lg"
      >
        <CreateForm
          initial={form.seed ?? EMPTY}
          accounts={accounts}
          territories={territories}
          fiscalYears={fiscalYears}
          saving={saving}
          onCancel={form.close}
          onSubmit={handleCreate}
        />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remove placement"
        message="This removes the territory placement row. SCD history rows are kept; prefer Retire to close a placement."
        confirmLabel="Delete"
        danger
        loading={busyId === toDelete?.id}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
