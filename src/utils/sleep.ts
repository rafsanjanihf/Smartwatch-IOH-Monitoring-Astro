import moment from 'moment';
import type { SleepData } from '../types';
import { api } from './api';

export interface SleepTimes {
  awakeTime: number;
  eyeMovementTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  totalTime: number;
}

export const SLEEP_STAGES = {
  AWAKE: { value: 1, name: 'Awake', color: '#FF9F43' },
  EYE_MOVEMENT: { value: 2, name: 'Eye Movement', color: '#28C76F' },
  LIGHT_SLEEP: { value: 3, name: 'Light Sleep', color: '#00CFE8' },
  DEEP_SLEEP: { value: 4, name: 'Deep Sleep', color: '#7367F0' },
} as const;

export async function fetchSleepData(deviceId: string, startDate?: string, endDate?: string) {
  try {
    return await api.getDeviceSleepData(
      deviceId,
      startDate ? moment(startDate).toISOString() : undefined,
      endDate ? moment(endDate).toISOString() : undefined,
    );
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    return null;
  }
}

export function calculateSleepTimes(sleepData: SleepData[] | null): SleepTimes {
  const times = {
    awakeTime: 0,
    eyeMovementTime: 0,
    lightSleepTime: 0,
    deepSleepTime: 0,
    totalTime: 0,
  };

  if (!sleepData) return times;

  sleepData.forEach((sleep) => {
    sleep.sleepMotion.forEach((motion) => {
      const duration = (motion.endTime - motion.startTime) / (60 * 1000);
      switch (motion.value) {
        case 1:
          times.awakeTime += duration;
          break;
        case 2:
          times.eyeMovementTime += duration;
          break;
        case 3:
          times.lightSleepTime += duration;
          break;
        case 4:
          times.deepSleepTime += duration;
          break;
      }
      times.totalTime += duration;
    });
  });

  return times;
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}
