import type { Device, Health, HealthData, SleepData, SleepStats, UserShift, ScheduleStats, ScheduleResponse } from '../types';

const API_BASE_URL = 
  import.meta.env.MODE == 'development' ? 'http://localhost:3031/api' : 'https://sw-ioh-be.terretech.id/api'; // Sesuaikan dengan port yang benar
const companyOwner = import.meta.env.COMPANY_OWNER || 'terretech'; // Menggunakan nilai default jika tidak ada di env
const devicesIds = '';
// Fungsi helper untuk fetch dengan error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
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
  getDevicesByDate: async (date: string, companyOwner: string) => {
    const response = await fetchApi<{success: boolean, data: Device[]}>(`/devices?date=${date}&companyOwner=${companyOwner}`);
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
  // Cache untuk menyimpan hasil permintaan API
  _sleepDataCache: new Map<string, {data: any, timestamp: number}>(),
  
  getAllSleepData: async (deviceIds: string, date?: string) => {
    // Use new API /sleep/statsByDate for each device
    if (!deviceIds || !date) {
      return [];
    }
    
    // Buat cache key berdasarkan deviceIds dan date
    const cacheKey = `${deviceIds}_${date}`;
    
    // Cek apakah data ada di cache dan masih valid (cache valid selama 5 menit)
    const cachedData = api._sleepDataCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp < 5 * 60 * 1000)) {
      console.log('Using cached sleep data for', cacheKey);
      return cachedData.data;
    }
    
    const deviceIdArray = deviceIds.split(',').filter(id => id.trim());
    const sleepDataPromises = deviceIdArray.map(async (deviceId) => {
      try {
        const data = await api.getDeviceSleepData(deviceId.trim(), date);
        // Convert new API response to old format for compatibility
        return {
          deviceId: data.deviceId || deviceId,
          date: data.date || date,
          sleepTime: data.sleepTime || 0,
          sleepTotalTime: data.sleepTime || 0, // For backward compatibility
          originalSleepTime: data.originalSleepTime || 0,
          sleepQuality: data.sleepQuality || 0,
          heartRate: data.heartRate || { min: 0, max: 0 },
          bloodOxygen: data.bloodOxygen || { min: 0, max: 0 },
          sleepLogs: data.sleepLogs || []
        };
      } catch (error) {
        console.error(`Error fetching sleep data for device ${deviceId}:`, error);
        return {
          deviceId: deviceId,
          date: date,
          sleepTime: 0,
          sleepTotalTime: 0,
          originalSleepTime: 0,
          sleepQuality: 0,
          heartRate: { min: 0, max: 0 },
          bloodOxygen: { min: 0, max: 0 },
          sleepLogs: []
        };
      }
    });
    
    const results = await Promise.all(sleepDataPromises);
    
    // Simpan hasil di cache
    api._sleepDataCache.set(cacheKey, {
      data: results,
      timestamp: now
    });
    
    return results;
  },
  getDeviceSleepData: async (deviceId: string, date: string, tz: string = '+8') => {
    // Buat cache key berdasarkan deviceId, date, dan tz
    const cacheKey = `${deviceId}_${date}_${tz}`;
    
    // Cek apakah data ada di cache dan masih valid (cache valid selama 5 menit)
    const cachedData = api._sleepDataCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp < 5 * 60 * 1000)) {
      console.log('Using cached device sleep data for', cacheKey);
      return cachedData.data;
    }
    
    const query = new URLSearchParams();
    query.append('deviceId', deviceId);
    query.append('date', date);
    query.append('tz', tz);
    //console.log('getDeviceSleepData', deviceId, date, tz);
    const response = await fetchApi<{success: boolean, data: any}>(`/sleep/statsByDate?${query.toString()}`);
    const data = response.data || {};
    
    // Simpan hasil di cache
    api._sleepDataCache.set(cacheKey, {
      data: data,
      timestamp: now
    });
    
    return data;
  },
  getSleepStatsByDate: async (deviceId: string, date: string, tz: string = '+8') => {
    // Buat cache key berdasarkan deviceId, date, dan tz
    const cacheKey = `${deviceId}_${date}_${tz}`;
    
    // Cek apakah data ada di cache dan masih valid (cache valid selama 5 menit)
    const cachedData = api._sleepDataCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp < 5 * 60 * 1000)) {
      console.log('Using cached sleep stats for', cacheKey);
      return cachedData.data;
    }
    
    const response = await fetchApi<{success: boolean, data: {sleepTime: number}}>(`/sleep/statsByDate?deviceId=${deviceId}&date=${date}&tz=${tz}`);
    const data = response.data;
    
    // Simpan hasil di cache
    api._sleepDataCache.set(cacheKey, {
      data: data,
      timestamp: now
    });
    
    return data;
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
