/** A single change-request card with reviewer actions and decision metadata. */
import {
  CHANGE_STATUS_META,
  CHANGE_TYPE_META,
  labelledMeta,
  MASTER_DOMAIN_META,
  tonedMeta,
  type ChangeRequest,
} from '@/domain/types';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { Badge, Button, Card, Tooltip } from '@/components/shared';

function prettyPayload(payload?: string): string | null {
  if (!payload) return null;
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

interface ChangeRequestCardProps {
  request: ChangeRequest;
  busy: boolean;
  onApprove: (request: ChangeRequest) => void;
  onReject: (request: ChangeRequest) => void;
}

export function ChangeRequestCard({
  request,
  busy,
  onApprove,
  onReject,
}: ChangeRequestCardProps) {
  const payload = prettyPayload(request.payload);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="indigo">
              {labelledMeta(MASTER_DOMAIN_META, request.domain).label}
            </Badge>
            <Badge tone="slate">
              {labelledMeta(CHANGE_TYPE_META, request.changeType).label}
            </Badge>
            <Badge tone={tonedMeta(CHANGE_STATUS_META, request.status).tone}>
              {tonedMeta(CHANGE_STATUS_META, request.status).label}
            </Badge>
          </div>
          <p className="mt-2 font-medium text-gray-900">
            {request.recordLabel ?? 'New record'}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Requested by {request.requestedBy ?? 'unknown'} ·{' '}
            {fmtRelative(request.createdAt)}
          </p>
          {request.reason && (
            <p className="mt-2 text-sm text-gray-600">“{request.reason}”</p>
          )}
        </div>

        {request.status === 'open' && (
          <div className="flex shrink-0 gap-2">
            <Tooltip
              label="この変更を承認し、ゴールデンレコードに反映します"
              side="top"
            >
              <Button
                size="sm"
                variant="primary"
                loading={busy}
                onClick={() => onApprove(request)}
              >
                Approve
              </Button>
            </Tooltip>
            <Tooltip label="この変更を却下し、修正のため差し戻します" side="top">
              <Button
                size="sm"
                variant="secondary"
                loading={busy}
                onClick={() => onReject(request)}
              >
                Reject
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {payload && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-500">
            View proposed values
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            {payload}
          </pre>
        </details>
      )}

      {request.status !== 'open' && (
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
          {request.status === 'applied' ? 'Approved' : 'Rejected'} by{' '}
          {request.reviewedBy ?? 'unknown'} · {fmtDateTime(request.decidedAt)}
          {request.reviewNote ? ` — ${request.reviewNote}` : ''}
        </p>
      )}
    </Card>
  );
}
