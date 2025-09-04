export interface Device {
  id: string;
  name?: string;
  // type: string;
  status: string;
  email_pic?: string;
  mac?: string;
  phone?: string;
  source_name?: string;
  cookies?: string;
  cookies_exp?: string;
  date_created?: string;
  date_updated?: string;
  idEmployee?: string;
}

export interface Health {
  id: number;
  deviceTimestamp: string;
  data_type: 'heart_rate' | 'blood_oxygen' | 'pressure';
  string_val: number;
  date_created: string;
  device_id: string;
  start_time_utc: string;
  end_time_utc: string;
}

export interface HealthSummary {
  heartRate: {
    max: number;
    min: number;
    average: number;
  };
  bloodOxygen: {
    max: number;
    min: number;
    average: number;
  };
}

export interface HealthData {
  id: string;
  device_id: string;
  heart_rate: number;
  blood_oxygen: number;
  temperature: number;
  timestamp: string;
}

export interface SleepData {
  deviceId: string;
  date: string;
  sleepTime: number;
  originalSleepTime: number;
  sleepQuality: number;
  heartRate: {
    min: number;
    max: number;
  };
  bloodOxygen: {
    min: number;
    max: number;
  };
  sleepLogs: {
    startTime: string;
    endTime: string;
    duration: number;
    quality: string;
  }[];
}

export interface SleepStats {
  totalSleepTime: number;
  averageQuality: number;
  sleepSessions: number;
}

export interface UserShift {
  id: string;
  status?: string;
  date_created?: string;
  date_updated?: string;
  device_id: string;
  schedule_type: 'fullday' | 'day' | 'night' | 'off';
  date: string;
  device_name?: string;
  device_mac?: string;
}

export interface ScheduleStats {
  fullday: number;
  day: number;
  night: number;
  off: number;
  total: number;
}

export interface ScheduleResponse {
  date: string;
  total: number;
  schedules: {
    fullday: UserShift[];
    day: UserShift[];
    night: UserShift[];
    off: UserShift[];
  };
  all: UserShift[];
}
