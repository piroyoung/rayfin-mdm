import { useState } from 'react';

/** Which create / edit / duplicate state a CRUD modal is in. */
export type CrudMode = 'closed' | 'create' | 'edit' | 'duplicate';

export interface CrudForm<TRecord, TInput> {
  /** Current modal mode. */
  mode: CrudMode;
  /** True while the modal should be open (any non-closed mode). */
  open: boolean;
  /** The record being edited (set only in `edit` mode). */
  editing: TRecord | null;
  /** Pre-filled input for a cloned row (set only in `duplicate` mode). */
  seed: TInput | null;
  /** Open a blank create form. */
  startCreate: () => void;
  /** Open the form bound to an existing record for editing. */
  startEdit: (record: TRecord) => void;
  /** Open a create form pre-filled from a cloned row. */
  startDuplicate: (seed: TInput) => void;
  /** Close the modal and clear all transient state. */
  close: () => void;
}

/**
 * Centralises the create / edit / duplicate (copy-row) modal state that every
 * master-table page otherwise tracks with three separate booleans plus the
 * easy-to-forget reset calls. Generic over the record type and the
 * form-input type.
 */
export function useCrudForm<TRecord, TInput>(): CrudForm<TRecord, TInput> {
  const [mode, setMode] = useState<CrudMode>('closed');
  const [editing, setEditing] = useState<TRecord | null>(null);
  const [seed, setSeed] = useState<TInput | null>(null);

  return {
    mode,
    open: mode !== 'closed',
    editing,
    seed,
    startCreate: () => {
      setEditing(null);
      setSeed(null);
      setMode('create');
    },
    startEdit: (record) => {
      setSeed(null);
      setEditing(record);
      setMode('edit');
    },
    startDuplicate: (next) => {
      setEditing(null);
      setSeed(next);
      setMode('duplicate');
    },
    close: () => {
      setEditing(null);
      setSeed(null);
      setMode('closed');
    },
  };
}
