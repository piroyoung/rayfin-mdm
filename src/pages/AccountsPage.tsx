/** Accounts: list, search, CRUD, lifecycle actions, and duplicate merge. */
import { useMemo, useState } from 'react';

import {
  accountName,
  createAccount,
  deleteAccount,
  listAccounts,
  mergeAccounts,
  setAccountStatus,
  updateAccount,
  type AccountInput,
} from '@/services/accounts';
import { submitChangeRequest } from '@/services/stewardship';
import { findAccountDuplicates } from '@/domain/duplicates';
import { scoreAccount } from '@/domain/quality';
import {
  labelledMeta,
  optionsOf,
  RECORD_STATUS_META,
  SEGMENT_META,
  tonedMeta,
  isActiveStatus,
  type Account,
  type RecordStatus,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCrudForm } from '@/hooks/useCrudForm';
import { useToast } from '@/hooks/useToast';
import { fmtRelative } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  QualityBadge,
  Select,
  Tooltip,
} from '@/components/ui';
import {
  FormActions,
  ListCard,
  ListToolbar,
  RowActions,
} from '@/components/listing';

const EMPTY: AccountInput = {
  accountNumber: '',
  nameLegal: '',
};

function snapshot(a: Account): AccountInput {
  return {
    accountNumber: a.accountNumber,
    nameLegal: a.nameLegal,
    nameDisplay: a.nameDisplay,
    nameLocal: a.nameLocal,
    parentAccountId: a.parentAccountId,
    globalParentAccountId: a.globalParentAccountId,
    msSalesAccountId: a.msSalesAccountId,
    crmAccountId: a.crmAccountId,
    industryCode: a.industryCode,
    verticalCode: a.verticalCode,
    subVerticalCode: a.subVerticalCode,
    verticalCategoryCode: a.verticalCategoryCode,
    segmentCode: a.segmentCode,
    subSegmentCode: a.subSegmentCode,
    countryCode: a.countryCode,
    region: a.region,
    prefecture: a.prefecture,
    city: a.city,
    sourceSystem: a.sourceSystem,
  };
}

function AccountForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: AccountInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: AccountInput) => void;
}) {
  const [form, setForm] = useState<AccountInput>(initial);
  const set = (patch: Partial<AccountInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const quality = scoreAccount(form);
  const valid =
    (form.accountNumber ?? '').trim() !== '' &&
    (form.nameLegal ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account number" required>
          <Input
            value={form.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
            placeholder="ACC-1001"
            required
          />
        </Field>
        <Field label="Segment">
          <Select
            value={form.segmentCode ?? ''}
            onChange={(e) => set({ segmentCode: e.target.value || undefined })}
          >
            <option value="">— Unspecified —</option>
            {optionsOf(SEGMENT_META).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Legal name" required>
          <Input
            value={form.nameLegal}
            onChange={(e) => set({ nameLegal: e.target.value })}
            placeholder="Contoso Ltd"
            required
          />
        </Field>
        <Field label="Display name">
          <Input
            value={form.nameDisplay ?? ''}
            onChange={(e) => set({ nameDisplay: e.target.value })}
            placeholder="Contoso"
          />
        </Field>
        <Field label="Local name">
          <Input
            value={form.nameLocal ?? ''}
            onChange={(e) => set({ nameLocal: e.target.value })}
            placeholder="日本コントソ株式会社"
          />
        </Field>
        <Field label="Industry code">
          <Input
            value={form.industryCode ?? ''}
            onChange={(e) => set({ industryCode: e.target.value })}
          />
        </Field>
        <Field label="Source system">
          <Input
            value={form.sourceSystem ?? ''}
            onChange={(e) => set({ sourceSystem: e.target.value })}
            placeholder="MSX, Excel, HR…"
          />
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. US, GB, JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Region">
          <Input
            value={form.region ?? ''}
            onChange={(e) => set({ region: e.target.value })}
            placeholder="JP East, JP West…"
          />
        </Field>
        <Field label="Prefecture">
          <Input
            value={form.prefecture ?? ''}
            onChange={(e) => set({ prefecture: e.target.value })}
          />
        </Field>
        <Field label="City">
          <Input
            value={form.city ?? ''}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
      </div>

      <details className="mt-5 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          External IDs, hierarchy &amp; vertical coding
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="MSSales account ID">
            <Input
              value={form.msSalesAccountId ?? ''}
              onChange={(e) => set({ msSalesAccountId: e.target.value })}
            />
          </Field>
          <Field label="CRM account ID">
            <Input
              value={form.crmAccountId ?? ''}
              onChange={(e) => set({ crmAccountId: e.target.value })}
            />
          </Field>
          <Field label="Parent account ID">
            <Input
              value={form.parentAccountId ?? ''}
              onChange={(e) => set({ parentAccountId: e.target.value })}
            />
          </Field>
          <Field label="Global parent account ID">
            <Input
              value={form.globalParentAccountId ?? ''}
              onChange={(e) => set({ globalParentAccountId: e.target.value })}
            />
          </Field>
          <Field label="Vertical code">
            <Input
              value={form.verticalCode ?? ''}
              onChange={(e) => set({ verticalCode: e.target.value })}
            />
          </Field>
          <Field label="Sub-vertical code">
            <Input
              value={form.subVerticalCode ?? ''}
              onChange={(e) => set({ subVerticalCode: e.target.value })}
            />
          </Field>
          <Field label="Vertical category code">
            <Input
              value={form.verticalCategoryCode ?? ''}
              onChange={(e) => set({ verticalCategoryCode: e.target.value })}
            />
          </Field>
          <Field label="Sub-segment code">
            <Input
              value={form.subSegmentCode ?? ''}
              onChange={(e) => set({ subSegmentCode: e.target.value })}
            />
          </Field>
        </div>
      </details>

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

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}

export function AccountsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listAccounts);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all');
  const form = useCrudForm<Account, AccountInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const accounts = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return [
        a.accountNumber,
        a.nameLegal,
        a.nameDisplay,
        a.crmAccountId,
        a.msSalesAccountId,
        a.city,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [accounts, search, statusFilter]);

  const duplicates = useMemo(
    () => findAccountDuplicates(accounts),
    [accounts]
  );

  async function handleSave(input: AccountInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await updateAccount(form.editing.id, input);
        toast('Account updated.', 'success');
      } else {
        await createAccount(input);
        toast('Account created.', 'success');
      }
      form.close();
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

  function submitForApproval(a: Account) {
    return runAction(
      a.id,
      () =>
        submitChangeRequest({
          domain: 'account',
          changeType: a.status === 'draft' ? 'create' : 'update',
          recordId: a.id,
          recordLabel: `${a.accountNumber} — ${accountName(a)}`,
          payload: snapshot(a),
        }),
      'Submitted for approval.'
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        subtitle="Account master records, stewardship and golden-record management."
        actions={
          <Tooltip label="新しいアカウントマスターレコードを作成します" side="bottom">
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New account
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
                      () => mergeAccounts(winner, losers),
                      'Records merged.'
                    )
                  }
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <ListCard
        toolbar={
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search number, name, CRM/MSSales ID…"
          >
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
          </ListToolbar>
        }
        loading={loading}
        error={error}
        isEmpty={filtered.length === 0}
        loadingLabel="Loading accounts…"
        errorTitle="Couldn't load accounts"
        emptyTitle="No accounts found"
        emptyDescription={
          accounts.length === 0
            ? 'Create your first account master record.'
            : 'Try adjusting your search or filters.'
        }
      >
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.isGolden && (
                          <span title="Golden record" className="text-amber-500">
                            ★
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {accountName(a)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {a.accountNumber}
                            {a.city ? ` · ${a.city}` : ''}
                            {a.countryCode ? `, ${a.countryCode}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.segmentCode
                        ? labelledMeta(SEGMENT_META, a.segmentCode).label
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tonedMeta(RECORD_STATUS_META, a.status).tone}>
                        {tonedMeta(RECORD_STATUS_META, a.status).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <QualityBadge score={a.qualityScore} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(a.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        {a.status !== 'merged' && (
                          <Tooltip label="このアカウント情報を編集します">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => form.startEdit(a)}
                            >
                              Edit
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip label="この行をコピーして新しいアカウントを作成します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              form.startDuplicate({
                                ...snapshot(a),
                                accountNumber: '',
                              })
                            }
                          >
                            Copy
                          </Button>
                        </Tooltip>
                        {(a.status === 'draft' || a.status === 'rejected') && (
                          <Tooltip label="このアカウントレコードを承認に提出します">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={busyId === a.id}
                              onClick={() => submitForApproval(a)}
                            >
                              Submit
                            </Button>
                          </Tooltip>
                        )}
                        {a.status === 'approved' && (
                          <Tooltip label="このアカウントレコードをアーカイブ（保管）します">
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busyId === a.id}
                              onClick={() =>
                                runAction(
                                  a.id,
                                  () => setAccountStatus(a, 'archived'),
                                  'Account archived.'
                                )
                              }
                            >
                              Archive
                            </Button>
                          </Tooltip>
                        )}
                        {isActiveStatus(a.status) &&
                          a.status !== 'approved' &&
                          a.status !== 'pending_approval' && (
                            <Tooltip label="このアカウントレコードを完全に削除します（取り消せません）">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setToDelete(a)}
                              >
                                Delete
                              </Button>
                            </Tooltip>
                          )}
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
        </table>
      </ListCard>

      <Modal
        open={form.open}
        onClose={form.close}
        title={
          form.editing
            ? `Edit ${accountName(form.editing)}`
            : form.mode === 'duplicate'
              ? 'New account (copy)'
              : 'New account'
        }
        size="lg"
      >
        <AccountForm
          initial={form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY)}
          saving={saving}
          onCancel={form.close}
          onSubmit={handleSave}
        />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete account"
        message={
          toDelete
            ? `Permanently delete ${accountName(toDelete)} (${toDelete.accountNumber})? This cannot be undone.`
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
            () => deleteAccount(target),
            'Account deleted.'
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
  records: Account[];
  reasons: string[];
  busy: boolean;
  onMerge: (winner: Account, losers: Account[]) => void;
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
              {accountName(r)}{' '}
              <span className="text-xs text-gray-500">({r.accountNumber})</span>
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
