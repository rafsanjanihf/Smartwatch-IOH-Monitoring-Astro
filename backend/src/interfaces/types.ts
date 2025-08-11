export interface Device {
  id: string;
  status: string;
  date_created?: Date;
  date_updated?: Date;
  name?: string;
  mac?: string;
  phone?: string;
  email_pic?: string;
  password_pic?: string;
  source_name?: string;
  cookies?: string;
  cookies_exp?: string;
  companyOwner?: string[];
}

export interface Health {
  id: number;
  status: string;
  date_created?: Date;
  data_type?: string;
  date_updated?: Date;
  string_val?: number;
  start_time_millis?: number;
  end_time_millis?: number;
  fp_val?: number;
  int_val?: number;
  device_id?: string;
  deviceTimestamp?: string;
  start_time_utc?: Date;
  end_time_utc?: Date;
}

export interface SleepMotion {
  value: number;
  endTime: number;
  startTime: number;
  start_time_utc?: Date;
  end_time_utc?: Date;
}

export interface BloodOxygenPeriod {
  value: number;
  time: number;
}

export interface HeartRatePeriod {
  value: number;
  time: number;
}

export interface SleepReport {
  id: string;
  status: string;
  type: number;
  date_created?: Date;
  date_updated?: Date;
  startReal?: string;
  endReal?: string;
  sleepQuality?: number;
  sleepTotalTime?: number;
  device_id?: string;
  startDateUtc?: Date;
  endDateUtc?: Date;
  recordDay?: number;
  recordMonth?: number;
  recordYear?: number;
  // tambahkan field lain sesuai kebutuhan
  dataSourceName?: string;
  clearTotalTime?: number;
  fastEyeTotalTime?: number;
  simpleSleepTotalTime?: number;
  deepSleepTotalTime?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  avgHeartRate?: number;
  maxBloodOxygen?: number;
  minBloodOxygen?: number;
  avgBloodOxygen?: number;
  sleepMotion?: SleepMotion[];
  bloodOxygenPeriod?: BloodOxygenPeriod[];
  heartRatePeriod?: HeartRatePeriod[];
}

export interface UserDevice {
  id: string;
  status: string;
  date_created?: Date;
  date_updated?: Date;
  email?: string;
  device_id?: string;
  // tambahkan field lain sesuai kebutuhan
}

export interface UserShift {
  id: string;
  status?: string;
  date_created?: Date;
  date_updated?: Date;
  device_id: string;
  schedule_type: 'fullday' | 'day' | 'night' | 'off';
  date: Date;
}
