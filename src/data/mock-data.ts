import type { Device, Health, HealthSummary } from '../types';

export const devices: Device[] = [
  {
    id: '1',
    name: 'Samantha William',
    status: 'active',
    email_pic: 'samantha@example.com',
    source_name: 'Head of Engineering'
  },
  {
    id: '2',
    name: 'Tony Soap',
    status: 'active',
    email_pic: 'tony@example.com',
    source_name: 'Civil Engineering'
  },
  {
    id: '3',
    name: 'Johnny Ahmad',
    status: 'active',
    email_pic: 'johnny@example.com',
    source_name: 'Staff'
  }
];

export const healthData: Health[] = [
  {
    id: 1,
    deviceTimestamp: '2024-02-14T00:00:00Z',
    data_type: 'heart_rate',
    string_val: 83,
    date_created: '2024-02-14T00:00:00Z',
    device_id: '1',
    start_time_utc: '2024-02-14T00:00:00Z',
    end_time_utc: '2024-02-14T23:59:59Z'
  },
  {
    id: 2,
    deviceTimestamp: '2024-02-14T00:00:00Z',
    data_type: 'blood_oxygen',
    string_val: 98,
    date_created: '2024-02-14T00:00:00Z',
    device_id: '1',
    start_time_utc: '2024-02-14T00:00:00Z',
    end_time_utc: '2024-02-14T23:59:59Z'
  }
];

export const healthSummary: HealthSummary = {
  heartRate: {
    max: 112,
    min: 83,
    average: 97
  },
  bloodOxygen: {
    max: 98,
    min: 93,
    average: 95
  }
};