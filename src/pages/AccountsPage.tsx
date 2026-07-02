/** Accounts: thin route container for the account master + stewardship. */
import { accountName } from '@/domain/models/account';
import { optionsOf, RECORD_STATUS_META } from '@/domain/types';
import {
  Button,
  ConfirmDialog,
  ListCard,
  ListToolbar,
  Modal,
  PageHeader,
  Select,
  Tooltip,
} from '@/components/shared';
import { AccountForm } from '@/components/accounts/AccountForm';
import { AccountsTable } from '@/components/accounts/AccountsTable';
import { DuplicatesPanel } from '@/components/accounts/DuplicatesPanel';
import { EMPTY_ACCOUNT } from '@/usecase/accounts/use-account-form';
import { useAccounts } from '@/usecase/accounts/use-accounts';

export function AccountsPage() {
  const {
    accounts,
    filtered,
    duplicates,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    showDuplicates,
    setShowDuplicates,
    save,
    submitForApproval,
    archive,
    merge,
    confirmDelete,
    snapshot,
  } = useAccounts();

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

      <DuplicatesPanel
        duplicates={duplicates}
        open={showDuplicates}
        onToggle={() => setShowDuplicates((v) => !v)}
        busyId={busyId}
        onMerge={merge}
      />

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
                setStatusFilter(
                  e.target.value as typeof statusFilter
                )
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
        <AccountsTable
          accounts={filtered}
          busyId={busyId}
          onEdit={form.startEdit}
          onDuplicate={(a) =>
            form.startDuplicate({ ...snapshot(a), accountNumber: '' })
          }
          onSubmit={submitForApproval}
          onArchive={archive}
          onDelete={setToDelete}
        />
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
          initial={
            form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY_ACCOUNT)
          }
          saving={saving}
          onCancel={form.close}
          onSubmit={save}
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
        onConfirm={confirmDelete}
      />
    </div>
  );
}
