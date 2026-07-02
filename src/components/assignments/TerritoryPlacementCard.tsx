/**
 * Territory-placement card for the Assignments screen: shows the account's
 * current territory for the fiscal year, lets the user place / move it, and
 * retire it. Presentational — the place / retire handlers and the retire
 * eligibility flag come from the view-model.
 */
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type Territory,
  type TerritoryAccountAssignment,
} from '@/domain/types';
import { Badge, Button, Card, Select } from '@/components/shared';

interface TerritoryPlacementCardProps {
  placement: TerritoryAccountAssignment | undefined;
  territories: Territory[];
  terrCode: (id?: string) => string;
  fyId: string;
  canRetire: boolean;
  busy: boolean;
  onPlace: (territoryId: string) => void;
  onRetire: () => void;
}

export function TerritoryPlacementCard({
  placement,
  territories,
  terrCode,
  fyId,
  canRetire,
  busy,
  onPlace,
  onRetire,
}: TerritoryPlacementCardProps) {
  const meta = placement
    ? tonedMeta(ASSIGNMENT_STATUS_META, placement.assignmentStatus)
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Territory placement</p>
          <p className="mt-1 text-sm text-gray-900">
            {placement
              ? terrCode(placement.territoryId)
              : 'No territory placed for this fiscal year.'}
          </p>
        </div>
        {placement && meta && <Badge tone={meta.tone}>{meta.label}</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Select
            value=""
            disabled={!fyId}
            onChange={(e) => onPlace(e.target.value)}
          >
            <option value="">
              {placement ? 'Move to territory…' : 'Place in territory…'}
            </option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </div>
        {placement && canRetire && (
          <Button variant="ghost" size="sm" loading={busy} onClick={onRetire}>
            Retire
          </Button>
        )}
      </div>
    </Card>
  );
}
