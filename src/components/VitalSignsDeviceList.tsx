import { useState, useMemo, useEffect } from 'react';
import type { Device, Health } from '../types';
import { api } from '../utils/api';
import moment from 'moment';

interface VitalSignsDeviceListProps {
  devices: Device[];
  className?: string;
}

interface DeviceHealthStats {
  deviceId: string;
  heartRate: number | null;
  bloodOxygen: number | null;
  stressLevel: 'Low' | 'Medium' | 'High' | 'Relaxed' | null;
}

export default function VitalSignsDeviceList({ devices: initialDevices, className }: VitalSignsDeviceListProps) {
  // Sort devices by idEmployee first, then by name
  const sortedDevices = useMemo(() => {
    return [...initialDevices].sort((a, b) => {
      // If both have idEmployee, sort by idEmployee
      if (a.idEmployee && b.idEmployee) {
        return a.idEmployee.localeCompare(b.idEmployee);
      }
      
      // If only one has idEmployee, prioritize the one with idEmployee
      if (a.idEmployee && !b.idEmployee) {
        return -1;
      }
      if (!a.idEmployee && b.idEmployee) {
        return 1;
      }
      
      // If neither has idEmployee, sort by name
      const nameA = (a.name || 'Unnamed Device').toLowerCase();
      const nameB = (b.name || 'Unnamed Device').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [initialDevices]);

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(sortedDevices[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const [healthStats, setHealthStats] = useState<DeviceHealthStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch health data for all devices
  const fetchHealthDataForAllDevices = async (date: string) => {
    try {
      setIsLoading(true);
      const healthStatsPromises = sortedDevices.map(async (device) => {
        try {
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);

          const healthData = await api.getHealthByDeviceId(
            device.id, 
            startDate.toISOString(), 
            endDate.toISOString()
          );

          // Get latest values for each metric
          const latestHeartRate = healthData
            .filter(h => h.data_type === 'heart_rate')
            .sort((a, b) => new Date(b.start_time_utc).getTime() - new Date(a.start_time_utc).getTime())[0];

          const latestBloodOxygen = healthData
            .filter(h => h.data_type === 'blood_oxygen')
            .sort((a, b) => new Date(b.start_time_utc).getTime() - new Date(a.start_time_utc).getTime())[0];

          const latestStress = healthData
            .filter(h => h.data_type === 'stress' || h.data_type === 'pressure')
            .sort((a, b) => new Date(b.start_time_utc).getTime() - new Date(a.start_time_utc).getTime())[0];

          // Parse values
          const heartRate = latestHeartRate ? parseFloat(latestHeartRate.string_val.toString()) : null;
          const bloodOxygen = latestBloodOxygen ? parseFloat(latestBloodOxygen.string_val.toString()) : null;
          const stressValue = latestStress ? parseFloat(latestStress.string_val.toString()) : null;

          // Determine stress level
          let stressLevel: 'Low' | 'Medium' | 'High' | 'Relaxed' | null = null;
          if (stressValue !== null && !isNaN(stressValue)) {
            if (stressValue >= 75) stressLevel = 'High';
            else if (stressValue >= 50) stressLevel = 'Medium';
            else if (stressValue >= 25) stressLevel = 'Low';
            else stressLevel = 'Relaxed';
          }

          return {
            deviceId: device.id,
            heartRate: heartRate && !isNaN(heartRate) ? Math.round(heartRate) : null,
            bloodOxygen: bloodOxygen && !isNaN(bloodOxygen) ? Math.round(bloodOxygen) : null,
            stressLevel
          };
        } catch (error) {
          console.error(`Error fetching health data for device ${device.id}:`, error);
          return {
            deviceId: device.id,
            heartRate: null,
            bloodOxygen: null,
            stressLevel: null
          };
        }
      });

      const stats = await Promise.all(healthStatsPromises);
      setHealthStats(stats);
    } catch (error) {
      console.error('Error fetching health data for all devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-select first device on initial load
  useEffect(() => {
    if (sortedDevices.length > 0 && !activeDeviceId) {
      const firstDevice = sortedDevices[0];
      setActiveDeviceId(firstDevice.id);
      
      // Add a small delay to ensure HealthChart is ready to receive the event
      setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent('device-select', {
            detail: { deviceId: firstDevice.id },
          }),
        );
      }, 100);
    }
  }, [sortedDevices, activeDeviceId]);

  // Fetch health data when component mounts or date changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHealthDataForAllDevices(selectedDate);
    }, 500);

    return () => clearTimeout(timer);
  }, [sortedDevices, selectedDate]);

  // Listen for date changes
  useEffect(() => {
    const handleDateChange = async (e: CustomEvent) => {
      try {
        const selectedDateFromEvent = e.detail;

        let formattedDate: string;
        if (typeof selectedDateFromEvent === 'string') {
          formattedDate = selectedDateFromEvent;
        } else if (selectedDateFromEvent instanceof Date) {
          const year = selectedDateFromEvent.getFullYear();
          const month = String(selectedDateFromEvent.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDateFromEvent.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else {
          formattedDate = moment().format('YYYY-MM-DD');
        }
        
        setSelectedDate(formattedDate);
        await fetchHealthDataForAllDevices(formattedDate);
      } catch (error) {
        console.error('Error handling date change:', error);
      }
    };

    document.addEventListener('datepicker-range-end', handleDateChange as EventListener);

    return () => {
      document.removeEventListener('datepicker-range-end', handleDateChange as EventListener);
    };
  }, [sortedDevices]);

  // Filter devices based on search query only
  const filteredDevices = useMemo(() => {
    return sortedDevices.filter((device) => {
      const matchesSearch =
        device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.idEmployee?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [sortedDevices, searchQuery]);

  const handleDeviceClick = (deviceId: string) => {
    setActiveDeviceId(deviceId);
    document.dispatchEvent(
      new CustomEvent('device-select', {
        detail: { deviceId },
      }),
    );
  };

  // Get health stats for a specific device
  const getDeviceHealthStats = (deviceId: string): DeviceHealthStats | null => {
    return healthStats.find(stats => stats.deviceId === deviceId) || null;
  };

  // Helper function to render health badges
  const renderHealthBadges = (deviceId: string) => {
    const stats = getDeviceHealthStats(deviceId);
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {/* Heart Rate Badge */}
        <div className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-md text-xs font-medium border border-red-200">
          <span className="text-red-500">❤️</span>
          <span>{stats?.heartRate ? `${stats.heartRate}bpm` : '00bpm'}</span>
        </div>

        {/* Blood Oxygen Badge */}
        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-medium border border-blue-200">
          <span className="text-blue-500">🫁</span>
          <span>{stats?.bloodOxygen ? `${stats.bloodOxygen}%` : '00%'}</span>
        </div>

        {/* Stress Level Badge */}
        <div className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border ${
          stats?.stressLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
          stats?.stressLevel === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-200' :
          stats?.stressLevel === 'Low' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
          stats?.stressLevel === 'Relaxed' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          <span className={
            stats?.stressLevel === 'High' ? 'text-red-500' :
            stats?.stressLevel === 'Medium' ? 'text-orange-500' :
            stats?.stressLevel === 'Low' ? 'text-yellow-500' :
            stats?.stressLevel === 'Relaxed' ? 'text-green-500' :
            'text-gray-500'
          }>🧠</span>
          <span>{stats?.stressLevel ? `${stats.stressLevel} Stress` : 'No Data'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">List Devices</h3>
        <span className="text-sm text-gray-500">
          {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search Only - No Filtering Options */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Device List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading health data...
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No devices found matching your search.
          </div>
        ) : (
          filteredDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => handleDeviceClick(device.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeDeviceId === device.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {device.name || 'Unnamed Device'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {/* ID: {device.id} */}
                    {device.idEmployee && (
                      <span>NRP: {device.idEmployee}</span>
                    )}
                  </p>
                  
                  {/* Health Badges */}
                  {renderHealthBadges(device.id)}
                </div>
                
                {activeDeviceId === device.id && (
                  <div className="ml-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}