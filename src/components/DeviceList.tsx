import { useState, useMemo, useEffect } from 'react';
import type { Device, SleepData } from '../types';
import { api } from '../utils/api';
import moment from 'moment';

interface DeviceListProps {
  devices: Device[];
  className?: string;
}

type FilterOption = 'all' | 'normal' | 'abnormal' | 'nodata';

export default function DeviceList({ devices, className }: DeviceListProps) {
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(devices[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredSleepCount, setFilteredSleepCount] = useState({
    normal: 0,
    abnormal: 0,
    nodata: 0,
    total: 0,
  });

  // Fetch sleep data when component mounts
  useEffect(() => {
    const fetchSleepData = async () => {
      try {
        setIsLoading(true);
        const deviceIds = devices.map((d) => d.id).join(',');
        const data = await api.getAllSleepData(deviceIds);
        setSleepData(data);

        // Calculate counts for each category
        const counts = data.reduce(
          (acc, sleep) => {
            if (sleep.sleepTotalTime > 0) {
              if (sleep.sleepTotalTime >= 21600) {
                acc.normal++;
              } else {
                acc.abnormal++;
              }
            } else {
              acc.nodata++;
            }
            acc.total++;
            return acc;
          },
          { normal: 0, abnormal: 0, nodata: 0, total: 0 },
        );
        
        // Count devices that don't have sleep data at all
        const devicesWithSleepData = new Set(data.map(sleep => sleep.device_id));
        const devicesWithoutSleepData = devices.filter(device => !devicesWithSleepData.has(device.id));
        counts.nodata += devicesWithoutSleepData.length;
        counts.total += devicesWithoutSleepData.length;
        
        setFilteredSleepCount(counts);
      } catch (error) {
        console.error('Error fetching sleep data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSleepData();
  }, [devices]);

  // Listen for date changes
  useEffect(() => {
    const handleDateChange = async (e: CustomEvent) => {
      try {
        setIsLoading(true);
        const deviceIds = devices.map((d) => d.id).join(',');
        const selectedDate = e.detail;

        // Format date for API call
        const formattedDate = moment(selectedDate).format('YYYY-MM-DD');

        const data = await api.getAllSleepData(deviceIds, formattedDate);
        setSleepData(data);

        // Recalculate counts
        const counts = data.reduce(
          (acc, sleep) => {
            if (sleep.sleepTotalTime > 0) {
              if (sleep.sleepTotalTime >= 21600) {
                acc.normal++;
              } else {
                acc.abnormal++;
              }
            } else {
              acc.nodata++;
            }
            acc.total++;
            return acc;
          },
          { normal: 0, abnormal: 0, nodata: 0, total: 0 },
        );
        
        // Count devices that don't have sleep data at all
        const devicesWithSleepData = new Set(data.map(sleep => sleep.device_id));
        const devicesWithoutSleepData = devices.filter(device => !devicesWithSleepData.has(device.id));
        counts.nodata += devicesWithoutSleepData.length;
        counts.total += devicesWithoutSleepData.length;
        
        setFilteredSleepCount(counts);
      } catch (error) {
        console.error('Error fetching sleep data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Add event listener
    document.addEventListener('datepicker-range-end', handleDateChange as EventListener);

    // Cleanup
    return () => {
      document.removeEventListener('datepicker-range-end', handleDateChange as EventListener);
    };
  }, [devices]);

  // Filter devices based on search query and sleep data
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // First apply search filter
      const matchesSearch =
        device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Then apply sleep data filter
      if (filterOption === 'all') return true;

      // Find sleep data for this device
      const deviceSleepData = sleepData.find((sleep) => sleep.device_id === device.id);

      // No data filter: devices without sleep data or with sleepTotalTime = 0
      if (filterOption === 'nodata') {
        return !deviceSleepData || deviceSleepData.sleepTotalTime === 0;
      }

      if (!deviceSleepData) return false;

      // Normal sleep: sleepTotalTime >= 21600 (6 hours in seconds)
      if (filterOption === 'normal') {
        return deviceSleepData.sleepTotalTime >= 21600;
      }

      // Abnormal sleep: sleepTotalTime < 21600 but > 0
      if (filterOption === 'abnormal') {
        return deviceSleepData.sleepTotalTime > 0 && deviceSleepData.sleepTotalTime < 21600;
      }

      return true;
    });
  }, [devices, searchQuery, filterOption, sleepData]);

  const handleDeviceClick = (deviceId: string) => {
    setActiveDeviceId(deviceId);
    document.dispatchEvent(
      new CustomEvent('device-select', {
        detail: { deviceId },
      }),
    );
  };

  return (
    <div className={`bg-white rounded-lg p-4 lg:p-6 ${className}`}>
      <h3 className='text-base lg:text-lg font-semibold mb-3 lg:mb-4'>List Devices</h3>

      {/* Search and Filter Controls */}
      <div className='space-y-2 lg:space-y-3 mb-4 lg:mb-6'>
        {/* Search Input */}
        <div className='relative'>
          <input
            type='text'
            placeholder='Search devices...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full px-3 lg:px-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
          <svg
            className='absolute right-3 top-2.5 h-5 w-5 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        </div>

        {/* Filter Options */}
        <div className='flex gap-2 lg:gap-3 overflow-x-auto pb-2 scrollbar-hide'>
          <button
            onClick={() => setFilterOption('all')}
            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
              ${filterOption === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterOption('normal')}
            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
              ${
                filterOption === 'normal'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Normal Sleep ({filteredSleepCount.normal})
          </button>
          <button
            onClick={() => setFilterOption('abnormal')}
            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
              ${
                filterOption === 'abnormal' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Abnormal Sleep ({filteredSleepCount.abnormal})
          </button>
          <button
            onClick={() => setFilterOption('nodata')}
            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
              ${
                filterOption === 'nodata' ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            No Data Sleep ({filteredSleepCount.nodata})
          </button>
        </div>
      </div>

      {/* Device List */}
      <div className='space-y-3 lg:space-y-4 max-h-[400px] lg:max-h-[500px] overflow-y-auto'>
        {isLoading ? (
          <div className='text-center py-8 text-gray-500'>Loading devices...</div>
        ) : filteredDevices.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>No devices found matching your criteria</div>
        ) : (
          filteredDevices.map((device, index) => {
            const deviceSleepData = sleepData.find((sleep) => sleep.device_id === device.id);
            return (
              <div
                key={device.id}
                data-device-id={device.id}
                onClick={() => handleDeviceClick(device.id)}
                className={`p-3 lg:p-4 rounded-lg cursor-pointer transition-colors
                  ${
                    activeDeviceId === device.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='text-sm lg:text-base font-medium'>{device.name || 'Unnamed Device'}</h4>
                    <p className='text-xs lg:text-sm text-gray-600'>Operator {index + 1}</p>
                    {deviceSleepData && deviceSleepData.sleepTotalTime > 0 && (
                      <p className='text-xs text-gray-500 mt-1'>
                        Sleep Time:{' '}
                        {deviceSleepData.sleepTotalTime
                          ? Math.floor(deviceSleepData.sleepTotalTime / 3600) +
                            'h ' +
                            Math.floor((deviceSleepData.sleepTotalTime % 3600) / 60) +
                            'm'
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    {deviceSleepData && deviceSleepData.sleepTotalTime > 0 ? (
                      <span
                        className={`px-2 py-1 rounded-full text-xs
                          ${
                            deviceSleepData.sleepTotalTime >= 21600
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {deviceSleepData.sleepTotalTime >= 21600 ? 'Normal Sleep' : 'Abnormal Sleep'}
                      </span>
                    ) : (
                      <span className='px-2 py-1 rounded-full text-xs text-gray-800 bg-stone-300'>No Sleep Data</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
