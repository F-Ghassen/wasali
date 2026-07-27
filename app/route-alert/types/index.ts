import type { CityRow } from '@/hooks/useCities';

export interface RouteAlertModalProps {
  visible: boolean;
  initialFrom?: string;
  initialTo?: string;
  profile: { id: string } | null;
  onClose: () => void;
}

export type CitySection = { country: string; flag: string; data: CityRow[] };
