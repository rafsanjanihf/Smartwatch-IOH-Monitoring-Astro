import type { Device, Health, HealthData, SleepData, SleepStats, UserShift, ScheduleStats, ScheduleResponse } from '../types';

const BASE_URL =
  import.meta.env.MODE == 'development' ? 'http://localhost:3031/api' : 'https://smartwatch-backend.terretech.id/api'; // Sesuaikan dengan port yang benar
const companyOwner = import.meta.env.COMPANY_OWNER;
const devicesIds = '';
// Fungsi helper untuk fetch dengan error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log('Fetching:', url); // Untuk debugging

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error; // Re-throw untuk handling di component
  }
}

// Fungsi-fungsi untuk mengambil data
export const api = {
  // Devices
  getAllDevices: () => fetchApi<Device[]>(`/devices?companyOwner=${companyOwner}`),
  getDevice: (id: string) => fetchApi<Device>(`/devices/${id}`),

  // Health Data
  getAllHealthData: () => fetchApi<Health[]>('/health'),
  getDeviceHealthData: (deviceId: string) => fetchApi<Health[]>(`/health/device/${deviceId}`),

  // Sleep Data
  getAllSleepData: (deviceIds: string, date?: string) => {
    const query = new URLSearchParams();
    if (deviceIds) {
      query.append('deviceIds', deviceIds);
    }
    if (date) {
      query.append('date', date);
    }
    console.log('getAllSleepData', deviceIds, date);
    return fetchApi<SleepData[]>(`/sleep${query.toString() ? `?${query.toString()}` : ''}`);
  },
  getDeviceSleepData: (deviceId: string, startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    console.log('getDeviceSleepData', deviceId, startDate, endDate);
    return fetchApi<SleepData[]>(`/sleep/device/${deviceId}${query.toString() ? `?${query.toString()}` : ''}`);
  },
  getSleepStats: (deviceId: string) => fetchApi<SleepStats>(`/sleep/stats/${deviceId}`),

  // User Shifts / Schedule
  getAllUserShifts: (filters?: { date?: string; schedule_type?: string; device_id?: string }) => {
    const query = new URLSearchParams();
    if (filters?.date) query.append('date', filters.date);
    if (filters?.schedule_type) query.append('schedule_type', filters.schedule_type);
    if (filters?.device_id) query.append('device_id', filters.device_id);
    return fetchApi<UserShift[]>(`/user-shifts${query.toString() ? `?${query.toString()}` : ''}`);
  },
  getUserShiftsByDate: (date: string) => fetchApi<ScheduleResponse>(`/user-shifts/date/${date}`),
  getUserShift: (id: string) => fetchApi<UserShift>(`/user-shifts/${id}`),
  getScheduleStats: (date?: string) => {
    const query = new URLSearchParams();
    if (date) query.append('date', date);
    return fetchApi<{ date: string; statistics: ScheduleStats; details: any[] }>(`/user-shifts/stats${query.toString() ? `?${query.toString()}` : ''}`);
  },
  createUserShift: (data: { device_id: string; date: string; schedule_type: string }) => 
    fetchApi<{ message: string; data: UserShift }>('/user-shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUserShift: (data: { device_id: string; date: string; schedule_type: string }) => 
    fetchApi<{ message: string; data: UserShift }>('/user-shifts', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUserShift: (data: { device_id: string; date: string }) => 
    fetchApi<{ message: string; data: UserShift }>('/user-shifts', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
};
