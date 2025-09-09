// utility functions for formatting data display

/**
 * formats time in seconds to MM:SS format
 * @param timeInSeconds - time value in seconds
 * @returns formatted time string (e.g., "01:23")
 */
export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * formats duration between start and end times
 * @param start - start time in seconds
 * @param end - end time in seconds
 * @returns formatted duration string
 */
export const formatDuration = (start: number, end: number): string => {
  const duration = end - start;
  return formatTime(duration);
};

/**
 * formats confidence percentage from string
 * @param scoreString - score as string (e.g., "94.5%" or "0.945")
 * @returns formatted percentage (e.g., "94.5%")
 */
export const formatConfidence = (scoreString: string): string => {
  // if already has % sign, return as is
  if (scoreString.includes('%')) {
    return scoreString;
  }
  
  // if decimal format (0.0 to 1.0), convert to percentage
  const num = parseFloat(scoreString);
  if (num <= 1.0) {
    return `${(num * 100).toFixed(1)}%`;
  }
  
  // assume it's already a percentage value
  return `${num.toFixed(1)}%`;
};

/**
 * formats speaking rate
 * @param wordsPerMinute - speaking rate in words per minute
 * @returns formatted rate string
 */
export const formatSpeakingRate = (wordsPerMinute: number): string => {
  return `${Math.round(wordsPerMinute)} слов/мин`;
};

/**
 * capitalizes first letter of a string
 * @param str - input string
 * @returns capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};