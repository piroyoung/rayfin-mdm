/** Approve / reject confirmation modal with an optional reviewer note. */
import { Button, Field, Modal, Textarea } from '@/components/shared';
import type { Decision } from '@/usecase/stewardship/use-stewardship';

interface ChangeRequestDecisionModalProps {
  decision: Decision | null;
  note: string;
  busy: boolean;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ChangeRequestDecisionModal({
  decision,
  note,
  busy,
  onNoteChange,
  onCancel,
  onConfirm,
}: ChangeRequestDecisionModalProps) {
  const isApprove = decision?.kind === 'approve';
  return (
    <Modal
      open={decision !== null}
      onClose={onCancel}
      title={isApprove ? 'Approve change request' : 'Reject change request'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'primary' : 'danger'}
            loading={busy}
            onClick={onConfirm}
          >
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-600">
        {isApprove
          ? 'Approving will apply this change and promote the record to its golden state.'
          : 'Rejecting will send the record back for revision.'}
      </p>
      <Field label="Review note" hint="Optional — recorded in the audit trail.">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add a note for the requester…"
        />
      </Field>
    </Modal>
  );
}
