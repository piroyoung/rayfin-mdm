import { qualityTone } from '@/domain/quality';

import { Badge } from './Badge';

export function QualityBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  return <Badge tone={qualityTone(score)}>{score}%</Badge>;
}
