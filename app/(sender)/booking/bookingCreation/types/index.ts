import type { ReactNode } from 'react';

export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface StepCardProps {
  stepNum: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  summary?: string;
  onEdit?: () => void;
  children?: ReactNode;
}
