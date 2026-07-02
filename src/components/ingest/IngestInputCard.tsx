/**
 * Ingest input Card: the CSV/TSV textarea plus the Preview and Commit buttons.
 * The commit button appears only once a preview exists. Purely presentational.
 */
import { Button, Card, Field, Textarea } from '@/components/shared';
import type { IngestBusy } from '@/usecase/ingest/use-ingest';

interface IngestInputCardProps {
  text: string;
  onTextChange: (next: string) => void;
  onPreview: () => void;
  onCommit: () => void;
  busy: IngestBusy;
  canCommit: boolean;
}

export function IngestInputCard({
  text,
  onTextChange,
  onPreview,
  onCommit,
  busy,
  canCommit,
}: IngestInputCardProps) {
  return (
    <Card className="space-y-3 p-4">
      <Field label="Sheet data (CSV or TSV)" htmlFor="ingest-text">
        <Textarea
          id="ingest-text"
          rows={8}
          spellCheck={false}
          placeholder="Account,MSSalesAccountID,Territory,AE,CSAM,Copilot SE,CE…"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          onClick={onPreview}
          loading={busy === 'preview'}
          disabled={busy !== null}
        >
          Preview
        </Button>
        {canCommit && (
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
  );
}
