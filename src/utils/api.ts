import type { Device, Health, HealthData, SleepData, SleepStats, UserShift, ScheduleStats, ScheduleResponse } from '../types';

const BASE_URL =
  import.meta.env.MODE == 'development' ? 'http://localhost:3031/api' : 'https://sw-ioh-be.terretech.id/api'; // Sesuaikan dengan port yang benar
const companyOwner = import.meta.env.PUBLIC_COMPANY_OWNER;
const devicesIds = '';
// Fungsi helper untuk fetch dengan error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    //console.log('Fetching:', url); // Untuk debugging

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
  getAllDevices: async () => {
    const response = await fetchApi<{success: boolean, data: Device[]}>(`/devices?companyOwner=${companyOwner}`);
    return response.data || [];
  },
  getDevice: async (id: string) => {
    const response = await fetchApi<{success: boolean, data: Device}>(`/devices/${id}`);
    return response.data;
  },

  // Health Data
  getAllHealthData: async () => {
    const response = await fetchApi<{success: boolean, data: HealthData[]}>(`/health?companyOwner=${companyOwner}`);
    return response.data || [];
  },
  getHealthDataByDevice: async (deviceId: string) => {
    const response = await fetchApi<{success: boolean, data: HealthData[]}>(`/health/device/${deviceId}?companyOwner=${companyOwner}`);
    return response.data || [];
  },
  getHealthByDeviceId: async (deviceId: string, startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.append('start_date', startDate);
    if (endDate) query.append('end_date', endDate);
    query.append('companyOwner', companyOwner);
    const response = await fetchApi<{success: boolean, data: HealthData[]}>(`/health/device/${deviceId}${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data || [];
  },

  // Sleep Data
  getAllSleepData: async (deviceIds: string, date?: string) => {
    const query = new URLSearchParams();
    if (deviceIds) {
      query.append('deviceIds', deviceIds);
    }
    if (date) {
      query.append('date', date);
    }
    query.append('companyOwner', companyOwner);
    //console.log('getAllSleepData', deviceIds, date);

    const response = await fetchApi<{success: boolean, data: SleepData[]}>(`/sleep${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data || [];
  },
  getDeviceSleepData: async (deviceId: string, startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    query.append('companyOwner', companyOwner);
    //console.log('getDeviceSleepData', deviceId, startDate, endDate);
    const response = await fetchApi<{success: boolean, data: SleepData[]}>(`/sleep/device/${deviceId}${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data || [];
  },
  getSleepStats: async (deviceId: string) => {
    const response = await fetchApi<{success: boolean, data: SleepStats}>(`/sleep/stats/${deviceId}?companyOwner=${companyOwner}`);
    return response.data;
  },

  // User Shifts / Schedule
  getAllUserShifts: async (filters?: { date?: string; schedule_type?: string; device_id?: string }) => {
    const query = new URLSearchParams();
    if (filters?.date) query.append('date', filters.date);
    if (filters?.schedule_type) query.append('schedule_type', filters.schedule_type);
    if (filters?.device_id) query.append('device_id', filters.device_id);
    query.append('companyOwner', companyOwner);
    const response = await fetchApi<{success: boolean, data: UserShift[]}>(`/user-shifts${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data || [];
  },
  getUserShiftsByDate: async (date: string) => {
    const response = await fetchApi<ScheduleResponse>(`/user-shifts/date/${date}?companyOwner=${companyOwner}`);
    return response;
  },
  getUserShift: async (id: string) => {
    const response = await fetchApi<UserShift>(`/user-shifts/${id}?companyOwner=${companyOwner}`);
    return response;
  },
  getScheduleStats: async (date?: string) => {
    const query = new URLSearchParams();
    if (date) query.append('date', date);
    query.append('companyOwner', companyOwner);
    const response = await fetchApi<{ date: string; statistics: ScheduleStats; details: any[] }>(`/user-shifts/stats${query.toString() ? `?${query.toString()}` : ''}`);
    return response;
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
