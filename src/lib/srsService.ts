import { SRSData } from '../types';

/**
 * SM-2 Algorithm implementation
 * @param quality: 0-5 (0: total blackout, 5: perfect response)
 * @param repetitions: number of previous successful repetitions
 * @param previousInterval: previous interval in days
 * @param previousEaseFactor: previous ease factor
 */
export function calculateSM2(
  quality: number,
  repetitions: number,
  previousInterval: number,
  previousEaseFactor: number
): { interval: number; repetitions: number; easeFactor: number } {
  let nextInterval: number;
  let nextRepetitions: number;
  let nextEaseFactor: number;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(previousInterval * previousEaseFactor);
    }
    nextRepetitions = repetitions + 1;
  } else {
    // Incorrect response
    nextInterval = 1;
    nextRepetitions = 0;
  }

  // Ease factor calculation
  nextEaseFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  return {
    interval: nextInterval,
    repetitions: nextRepetitions,
    easeFactor: nextEaseFactor,
  };
}

export const INITIAL_SRS_DATA = (problemId: string): SRSData => ({
  problemId,
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReviewDate: Date.now(),
  lastReviewDate: Date.now(),
});
