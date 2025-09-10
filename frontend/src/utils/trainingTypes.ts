export const sessionTypeLabels = {
  presentation: 'Презентация',
  interview: 'Интервью',
  pitch: 'Питч',
  meeting: 'Встреча',
  training: 'Тренировка'
} as const;

export type TrainingType = keyof typeof sessionTypeLabels;

export function getTrainingTypeLabel(type: string | undefined | null): string {
  if (!type) return 'Презентация';
  return sessionTypeLabels[type as TrainingType] || 'Презентация';
}