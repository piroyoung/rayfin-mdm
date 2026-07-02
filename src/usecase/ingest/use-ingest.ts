/**
 * Ingest screen view-model. Owns the paste/upload text, the read-only preview,
 * the commit summary, and the busy flag, and drives the injected ingest pipeline
 * (`previewIngest` / `commitIngest`) with toasts. The page and its components
 * stay presentational.
 */
import { useState } from 'react';

import { SAMPLE_INGEST_SHEET } from '@/domain/ingest';
import { useDependencies } from '@/di/dependencies-context';
import { useToast } from '@/usecase/shared/toast-context';

import {
  commitIngest,
  previewIngest,
  type IngestPreview,
  type IngestSummary,
} from './ingest-pipeline';

export type IngestBusy = 'preview' | 'commit' | null;

export function useIngest() {
  const deps = useDependencies();
  const toast = useToast();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<IngestPreview | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [busy, setBusy] = useState<IngestBusy>(null);

  function reset(next: string) {
    setText(next);
    setPreview(null);
    setSummary(null);
  }

  function loadSample() {
    reset(SAMPLE_INGEST_SHEET);
  }

  function handleFile(file: File) {
    void file.text().then((next) => reset(next));
  }

  async function onPreview() {
    if (!text.trim()) {
      toast('Paste or upload a sheet first.', 'info');
      return;
    }
    setBusy('preview');
    setSummary(null);
    try {
      setPreview(await previewIngest(deps, text));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Preview failed.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function onCommit() {
    setBusy('commit');
    try {
      const result = await commitIngest(deps, text);
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

  return {
    text,
    reset,
    loadSample,
    handleFile,
    preview,
    summary,
    busy,
    onPreview,
    onCommit,
  };
}
