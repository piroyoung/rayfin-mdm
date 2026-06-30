/**
 * Ingest: paste or upload a wide FY territory-assignment sheet, preview the
 * staging → canonical plan (alias matching, territory validation, placeholder
 * handling), then commit it to accounts + draft assignments + data-quality
 * issues. The parse/normalize logic is pure (`@/domain/ingest*`); this page is
 * the steward-facing wrapper around `@/services/ingest`.
 */
import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  StatCard,
  Textarea,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { SAMPLE_INGEST_SHEET } from '@/domain/ingest';
import {
  commitIngest,
  previewIngest,
  type IngestPreview,
  type IngestSummary,
} from '@/services/ingest';
import { SEVERITY_META, tonedMeta, ISSUE_TYPE_META, labelledMeta } from '@/domain/types';

type Busy = 'preview' | 'commit' | null;

export function IngestPage() {
  const toast = useToast();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<IngestPreview | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  function reset(next: string) {
    setText(next);
    setPreview(null);
    setSummary(null);
  }

  async function handleFile(file: File) {
    reset(await file.text());
  }

  async function onPreview() {
    if (!text.trim()) {
      toast('Paste or upload a sheet first.', 'info');
      return;
    }
    setBusy('preview');
    setSummary(null);
    try {
      setPreview(await previewIngest(text));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Preview failed.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function onCommit() {
    setBusy('commit');
    try {
      const result = await commitIngest(text);
      setSummary(result);
      setPreview(null);
      toast(
        `Ingested ${result.assignmentsCreated} role seat(s), ${result.placementsCreated} territory placement(s), ${result.accountsCreated} new account(s).`,
        'success'
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Commit failed.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const stats = preview?.plan.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingest"
        subtitle="Load a wide FY assignment sheet → staging → canonical, with alias name-matching and data-quality checks."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reset(SAMPLE_INGEST_SHEET)}
            >
              Load sample
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              <span className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                Upload CSV/TSV
              </span>
            </label>
          </>
        }
      />

      <Card className="space-y-3 p-4">
        <Field label="Sheet data (CSV or TSV)" htmlFor="ingest-text">
          <Textarea
            id="ingest-text"
            rows={8}
            spellCheck={false}
            placeholder="Account,MSSalesAccountID,Territory,AE,CSAM,Copilot SE,CE…"
            value={text}
            onChange={(e) => reset(e.target.value)}
            className="font-mono text-xs"
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button onClick={onPreview} loading={busy === 'preview'} disabled={busy !== null}>
            Preview
          </Button>
          {preview && (
            <Button
              variant="primary"
              onClick={onCommit}
              loading={busy === 'commit'}
              disabled={busy !== null}
            >
              Commit ingest
            </Button>
          )}
        </div>
      </Card>

      {summary && (
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-700">Ingest complete</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Accounts created" value={summary.accountsCreated} tone="blue" />
            <StatCard label="Placements created" value={summary.placementsCreated} tone="purple" />
            <StatCard label="Role seats created" value={summary.assignmentsCreated} tone="green" />
            <StatCard label="Role seats skipped" value={summary.assignmentsSkipped} tone="slate" />
            <StatCard label="Issues raised" value={summary.issuesRaised} tone="amber" />
            <StatCard
              label="Fiscal year"
              value={summary.fiscalYearCode ?? '—'}
              tone="indigo"
            />
          </div>
          {summary.assignmentsCreated === 0 &&
            summary.placementsCreated === 0 &&
            summary.accountsCreated === 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Nothing new was written — this sheet was already ingested (the
              importer is idempotent).
            </p>
          )}
        </Card>
      )}

      {stats && preview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Accounts" value={stats.accounts} hint={`${stats.newAccounts} new`} tone="blue" />
            <StatCard label="Assignees" value={stats.assignees} tone="indigo" />
            <StatCard label="Matched" value={stats.matched} tone="green" />
            <StatCard label="Unknown" value={stats.unknown} tone={stats.unknown ? 'red' : 'gray'} />
            <StatCard label="Ambiguous" value={stats.ambiguous} tone={stats.ambiguous ? 'amber' : 'gray'} />
            <StatCard
              label="Placeholders"
              value={stats.placeholders}
              hint={`${stats.invalidTerritories} bad territory`}
              tone={stats.placeholders ? 'amber' : 'gray'}
            />
          </div>

          <Card className="p-4">
            <p className="text-sm font-medium text-gray-700">
              Resolved assignments
              <span className="ml-2 text-xs font-normal text-gray-500">
                will be written to FY {preview.fiscalYear?.code ?? '—'} as drafts
              </span>
            </p>
            {preview.plan.intents.length === 0 ? (
              <EmptyState
                title="No matched assignments"
                description="No alias in this sheet resolved to a known employee."
              />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3 font-medium">Account</th>
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 font-medium">Alias</th>
                      <th className="py-2 pr-3 font-medium">Primary</th>
                      <th className="py-2 pr-3 font-medium">Row</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.plan.intents.map((i) => (
                      <tr key={`${i.sourceRecordId}-${i.roleTypeCode}-${i.employeeId}`} className="border-b border-gray-50">
                        <td className="py-2 pr-3 text-gray-900">{i.accountName}</td>
                        <td className="py-2 pr-3">
                          <Badge tone="blue">{i.roleTypeCode}</Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-600">{i.alias}</td>
                        <td className="py-2 pr-3">
                          {i.isPrimary ? <span className="text-amber-500">★</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-400">{i.sourceRow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-gray-700">
              Data-quality issues
              <span className="ml-2 text-xs font-normal text-gray-500">
                raised on commit
              </span>
            </p>
            {preview.plan.issues.length === 0 ? (
              <EmptyState title="No issues found" description="Every row resolved cleanly." />
            ) : (
              <ul className="mt-3 space-y-1.5">
                {preview.plan.issues.map((issue, idx) => {
                  const sev = tonedMeta(SEVERITY_META, issue.severity);
                  return (
                    <li
                      key={`${issue.sourceRecordId}-${issue.issueType}-${idx}`}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                    >
                      <Badge tone={sev.tone}>{sev.label}</Badge>
                      <span className="font-medium text-gray-800">
                        {labelledMeta(ISSUE_TYPE_META, issue.issueType).label}
                      </span>
                      <span className="text-gray-600">{issue.description}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
