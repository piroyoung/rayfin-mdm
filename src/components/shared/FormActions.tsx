import { Button } from './Button';

/** Cancel + submit footer shared by every entity form. */
export function FormActions({
  onCancel,
  saving,
  disabled,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: {
  onCancel: () => void;
  saving?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" type="button" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant="primary" type="submit" loading={saving} disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}
