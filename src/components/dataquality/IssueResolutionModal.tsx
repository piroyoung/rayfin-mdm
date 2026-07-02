/** Resolve / dismiss confirmation modal with an optional steward comment. */
import { Button, Field, Modal, Textarea } from '@/components/shared';
import type { Resolving } from '@/usecase/dataquality/use-data-quality';

interface IssueResolutionModalProps {
  resolving: Resolving | null;
  comment: string;
  busy: boolean;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function IssueResolutionModal({
  resolving,
  comment,
  busy,
  onCommentChange,
  onCancel,
  onConfirm,
}: IssueResolutionModalProps) {
  const isDismiss = resolving?.mode === 'dismiss';
  return (
    <Modal
      open={resolving !== null}
      onClose={onCancel}
      title={isDismiss ? 'Dismiss issue' : 'Resolve issue'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={onConfirm}>
            {isDismiss ? 'Dismiss' : 'Resolve'}
          </Button>
        </>
      }
    >
      <Field label="Comment (optional)">
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="What was done, or why this is being dismissed…"
        />
      </Field>
    </Modal>
  );
}
