/**
 * Rating domain types
 * Shared interfaces for driver and sender ratings
 */

export interface RatingPayload {
  bookingId: string;
  score: number;
  comment?: string;
}

export interface RatingResult {
  success: boolean;
  message: string;
  isUpdate: boolean;
}

export interface RatingFormState {
  score: number;
  comment: string;
  isLoading: boolean;
  error: string | null;
  isExistingRating: boolean;
}

export interface RatingFormActions {
  setScore: (score: number) => void;
  setComment: (comment: string) => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
}

export interface StarRatingProps {
  score: number;
  onScoreChange: (score: number) => void;
  maxStars?: number;
}

export interface RatingFormProps {
  score: number;
  onScoreChange: (score: number) => void;
  comment: string;
  onCommentChange: (text: string) => void;
  isLoading: boolean;
  error?: string | null;
  onSubmit: () => void;
  title: string;
  subtitle: string;
  submitLabel?: string;
  isExistingRating?: boolean;
  // Note: user role is derived from authStore profile, not passed as prop
}
