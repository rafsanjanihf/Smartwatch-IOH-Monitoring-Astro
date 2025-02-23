import type { Device, Health, HealthData, SleepData, SleepStats } from '../types';

const BASE_URL =
  import.meta.env.MODE == 'development' ? 'http://localhost:3001/api' : 'https://smartwatch-backend.terretech.id/api'; // Sesuaikan dengan port yang benar
const companyOwner = import.meta.env.COMPANY_OWNER;
const devicesIds = '';
// Fungsi helper untuk fetch dengan error handling
async function fetchApi<T>(endpoint: string): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log('Fetching:', url); // Untuk debugging

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error('API request failed:', error);
    return [] as T; // Return empty array sebagai fallback
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
};
