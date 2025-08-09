/**
 * Calculate sleep quality based on different sleep phases
 *
 * @param clearTotalTime - Total time in clear/awake state (seconds)
 * @param fastEyeTotalTime - Total time in REM/fast eye movement (seconds)
 * @param simpleSleepTotalTime - Total time in light sleep (seconds)
 * @param deepSleepTotalTime - Total time in deep sleep (seconds)
 * @returns Sleep quality score (0-100)
 */
export function calculateSleepQuality(
  clearTotalTime: number,
  fastEyeTotalTime: number,
  simpleSleepTotalTime: number,
  deepSleepTotalTime: number,
): number {
  // Convert seconds to minutes for easier understanding
  const totalSleepTime = simpleSleepTotalTime + deepSleepTotalTime + fastEyeTotalTime;

  if (totalSleepTime === 0) {
    return 0; // Avoid division by zero
  }

  // Calculate sleep quality based on ideal sleep phase proportions:
  // - Deep sleep: 25% of total sleep time
  // - REM sleep: 25% of total sleep time
  // - Light sleep: 50% of total sleep time
  const sleepQuality =
    (deepSleepTotalTime / totalSleepTime) * 0.25 +
    (fastEyeTotalTime / totalSleepTime) * 0.25 +
    (simpleSleepTotalTime / totalSleepTime) * 0.5;

  // Convert to percentage (0-100) and round to 2 decimal places
  return Math.round(sleepQuality * 100 * 100) / 100;
}

/**
 * Calculate sleep efficiency
 * Sleep efficiency = (Total sleep time / Time in bed) × 100
 *
 * @param totalSleepTime - Total time sleeping (seconds)
 * @param timeInBed - Total time in bed (seconds)
 * @returns Sleep efficiency percentage (0-100)
 */
export function calculateSleepEfficiency(totalSleepTime: number, timeInBed: number): number {
  if (timeInBed === 0) return 0;
  return Math.round((totalSleepTime / timeInBed) * 100 * 100) / 100;
}
