/**
 * PageHeader actions for the Ingest screen: load the demo sample or upload a
 * CSV/TSV file. Purely presentational — the file read and state reset live in
 * the ingest view-model.
 */
import { Button } from '@/components/shared';

interface IngestHeaderActionsProps {
  onLoadSample: () => void;
  onFile: (file: File) => void;
}

export function IngestHeaderActions({
  onLoadSample,
  onFile,
}: IngestHeaderActionsProps) {
  return (
    <>
      <Button variant="secondary" size="sm" onClick={onLoadSample}>
        Load sample
      </Button>
      <label className="inline-flex">
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
        <span className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          Upload CSV/TSV
        </span>
      </label>
    </>
  );
}
