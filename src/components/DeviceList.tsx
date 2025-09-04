import { useState, useMemo, useEffect } from 'react';
import type { Device, SleepData, UserShift, ScheduleResponse } from '../types';
import { api } from '../utils/api';
import moment from 'moment';

interface DeviceListProps {
  devices: Device[];
  className?: string;
}

type FilterOption = 'all' | 'normal' | 'abnormal' | 'nodata';
type ShiftFilterOption = 'all' | 'day' | 'night' | 'other';

export default function DeviceList({ devices: initialDevices, className }: DeviceListProps) {
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

  const [devices, setDevices] = useState<Device[]>(sortedDevices);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(sortedDevices[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [shiftFilterOption, setShiftFilterOption] = useState<ShiftFilterOption>('all');
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [scheduleData, setScheduleData] = useState<UserShift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));

  const [isLoading, setIsLoading] = useState(false);
  const [filteredSleepCount, setFilteredSleepCount] = useState({
    normal: 0,
    abnormal: 0,
    nodata: 0,
    total: 0,
  });

  const [filteredShiftCount, setFilteredShiftCount] = useState({
    day: 0,
    night: 0,
    other: 0,
    total: 0,
  });

  // Fetch schedule data based on selected date
  const fetchScheduleData = async (date: string) => {
    try {
      console.log('Fetching schedule data for date:', date);
      const scheduleResponse = await api.getUserShiftsByDate(date);
      console.log('Schedule response:', scheduleResponse);
      
      // Handle both array and object response formats
      let newScheduleData: UserShift[] = [];
      if (Array.isArray(scheduleResponse)) {
        newScheduleData = scheduleResponse;
      } else if (scheduleResponse && scheduleResponse.all) {
        newScheduleData = scheduleResponse.all;
      }
      
      console.log('Setting schedule data:', newScheduleData);
      setScheduleData(newScheduleData);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setScheduleData([]);
    }
  };

  // Filter sleep data based on shift type
  const filterSleepDataByShift = (data: SleepData[], shiftType: string | null): SleepData[] => {
    if (!data) {
      return [];
    }
    
    if (!shiftType || shiftType === 'all' || shiftType === 'other') {
      return data;
    }

    console.log('Filtering sleep data by shift:', shiftType);
    console.log('Initial data length:', data.length);

    const filteredData = data.map(sleepRecord => {
      if (!sleepRecord.sleepMotion || sleepRecord.sleepMotion.length === 0) {
        return sleepRecord;
      }

      const originalMotionCount = sleepRecord.sleepMotion.length;
      const selectedDateMoment = moment(selectedDate);
      
      let filteredSleepMotion;
      
      if (shiftType === 'day') {
        // Day shift: filter for night sleep (5:00 PM yesterday to 5:30 AM today)
        const startTime = selectedDateMoment.clone().subtract(1, 'day').hour(17).minute(0).second(0);
        const endTime = selectedDateMoment.clone().hour(5).minute(30).second(0);
        
        filteredSleepMotion = sleepRecord.sleepMotion.filter(motion => {
          const motionStart = moment(motion.startTime);
          return motionStart.isBetween(startTime, endTime, null, '[]');
        });
      } else if (shiftType === 'night') {
        // Night shift: filter for day sleep (5:00 AM to 5:30 PM today)
        const startTime = selectedDateMoment.clone().hour(5).minute(0).second(0);
        const endTime = selectedDateMoment.clone().hour(17).minute(30).second(0);
        
        filteredSleepMotion = sleepRecord.sleepMotion.filter(motion => {
          const motionStart = moment(motion.startTime);
          return motionStart.isBetween(startTime, endTime, null, '[]');
        });
      } else {
        filteredSleepMotion = sleepRecord.sleepMotion;
      }

      // Calculate new sleepTotalTime based on filtered motion data
      const newSleepTotalTime = filteredSleepMotion.reduce((total, motion) => {
        const start = moment(motion.startTime);
        const end = moment(motion.endTime);
        return total + end.diff(start, 'seconds');
      }, 0);

      console.log(`Device ${sleepRecord.device_id}: ${originalMotionCount} -> ${filteredSleepMotion.length} motion records, sleepTotalTime: ${sleepRecord.sleepTotalTime} -> ${newSleepTotalTime}`);

      return {
        ...sleepRecord,
        sleepMotion: filteredSleepMotion,
        sleepTotalTime: newSleepTotalTime
      };
    });
    
    console.log('Filtered data length:', filteredData.length);
    return filteredData;
  };

  // Fetch sleep data when component mounts
  useEffect(() => {
    const fetchSleepData = async (dateToUse?: string) => {
      try {
        setIsLoading(true);
        const deviceIds = devices.map((d) => d.id).join(',');
        
        // Use the provided date or current selectedDate
        let targetDate = dateToUse || selectedDate;
        
        const data = await api.getAllSleepData(deviceIds, targetDate);
        
        // Ensure data is an array
        const sleepDataArray = Array.isArray(data) ? data : [];
        
        // Apply shift filter if shiftFilterOption is set
        const filteredData = filterSleepDataByShift(sleepDataArray, shiftFilterOption === 'all' ? null : shiftFilterOption);
        setSleepData(filteredData);

        // Calculate counts for each category based on filtered data
        const counts = filteredData.reduce(
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
        
        // Count devices that don't have sleep data at all (based on filtered data)
        const devicesWithSleepData = new Set(filteredData.filter(sleep => sleep.sleepTotalTime > 0).map(sleep => sleep.device_id));
        const devicesWithoutSleepData = devices.filter(device => !devicesWithSleepData.has(device.id));
        counts.nodata += devicesWithoutSleepData.length;
        counts.total += devicesWithoutSleepData.length;
        
        setFilteredSleepCount(counts);
        
        // Shift counts will be calculated by the dedicated useEffect
      } catch (error) {
        console.error('Error fetching sleep data:', error);
        setSleepData([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay to ensure DatePickerCard is initialized
    const timer = setTimeout(() => {
      fetchSleepData();
      fetchScheduleData(selectedDate);
    }, 500);

    return () => clearTimeout(timer);
  }, [devices, selectedDate]);



  // Auto-select first device on initial load (alphabetically first)
  useEffect(() => {
    if (sortedDevices.length > 0 && !activeDeviceId) {
      const firstDevice = sortedDevices[0];
      setActiveDeviceId(firstDevice.id);
      
      // Add a small delay to ensure HealthChart is ready to receive the event
      setTimeout(() => {
        // Get shift type for the first device
        const deviceSchedule = scheduleData.find(schedule => schedule.device_id === firstDevice.id);
        const shiftType = deviceSchedule?.schedule_type || null;
        
        // Dispatch device-select event to notify other components
        document.dispatchEvent(
          new CustomEvent('device-select', {
            detail: { deviceId: firstDevice.id, shiftType },
          }),
        );
      }, 100);
    }
  }, [sortedDevices, activeDeviceId, scheduleData]);

  // Calculate shift counts whenever scheduleData or devices change
  useEffect(() => {
    const calculateShiftCounts = () => {
      console.log('Calculating shift counts with scheduleData:', scheduleData);
      const shiftCounts = devices.reduce(
        (acc, device) => {
          const deviceSchedule = scheduleData.find(schedule => schedule.device_id === device.id);
          const scheduleType = deviceSchedule?.schedule_type;
          
          console.log(`Device ${device.id}: schedule_type = ${scheduleType}`);
          
          if (scheduleType === 'day') {
            acc.day++;
          } else if (scheduleType === 'night') {
            acc.night++;
          } else {
            acc.other++; // fullday, off, or no schedule data counts as 'other'
          }
          acc.total++;
          return acc;
        },
        { day: 0, night: 0, other: 0, total: 0 }
      );
      
      console.log('Calculated shift counts:', shiftCounts);
      setFilteredShiftCount(shiftCounts);
    };

    if (scheduleData.length > 0 || devices.length > 0) {
      calculateShiftCounts();
    }
  }, [scheduleData, devices]);

  // Listen for date changes
  useEffect(() => {
    const handleDateChange = async (e: CustomEvent) => {
      try {
        setIsLoading(true);
        const deviceIds = devices.map((d) => d.id).join(',');
        const selectedDateFromEvent = e.detail;

        // Handle formatted date string from DatePickerCard (already in YYYY-MM-DD format)
        let formattedDate: string;
        if (typeof selectedDateFromEvent === 'string') {
          // Already formatted as YYYY-MM-DD from DatePickerCard
          formattedDate = selectedDateFromEvent;
        } else if (selectedDateFromEvent instanceof Date) {
          // Fallback for Date object - use local date without UTC conversion
          const year = selectedDateFromEvent.getFullYear();
          const month = String(selectedDateFromEvent.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDateFromEvent.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else {
          formattedDate = moment().format('YYYY-MM-DD');
        }
        
        setSelectedDate(formattedDate);

        // Fetch both sleep data and schedule data
        const data = await api.getAllSleepData(deviceIds, formattedDate);
        setSleepData(data);
        
        // Fetch schedule data for the selected date
        await fetchScheduleData(formattedDate);

        // Recalculate sleep counts
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
        
        // Shift counts will be calculated automatically by the useEffect above
      } catch (error) {
        console.error('Error fetching sleep data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleShiftFilterChange = async (e: CustomEvent) => {
      try {
        setIsLoading(true);
        const deviceIds = devices.map((d) => d.id).join(',');
        
        // Re-fetch sleep data and apply new shift filter
        const data = await api.getAllSleepData(deviceIds, selectedDate);
        
        // Ensure data is an array
        const sleepDataArray = Array.isArray(data) ? data : [];
        
        const filteredData = filterSleepDataByShift(sleepDataArray, e.detail === 'all' ? null : e.detail);
        setSleepData(filteredData);

        // Recalculate sleep counts based on filtered data
        const counts = filteredData.reduce(
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
        
        // Count devices that don't have sleep data at all (based on filtered data)
        const devicesWithSleepData = new Set(filteredData.filter(sleep => sleep.sleepTotalTime > 0).map(sleep => sleep.device_id));
        const devicesWithoutSleepData = devices.filter(device => !devicesWithSleepData.has(device.id));
        counts.nodata += devicesWithoutSleepData.length;
        counts.total += devicesWithoutSleepData.length;
        
        setFilteredSleepCount(counts);
      } catch (error) {
        console.error('Error handling shift filter change:', error);
        setSleepData([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Add event listeners
    document.addEventListener('datepicker-range-end', handleDateChange as EventListener);
    document.addEventListener('shift-filter-change', handleShiftFilterChange as EventListener);

    // Cleanup
    return () => {
      document.removeEventListener('datepicker-range-end', handleDateChange as EventListener);
      document.removeEventListener('shift-filter-change', handleShiftFilterChange as EventListener);
    };
  }, [devices, scheduleData]);

  // Filter devices based on search query and sleep data
  const filteredDevices = useMemo(() => {
    const filtered = devices.filter((device) => {
      // First apply search filter
      const matchesSearch =
        device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.idEmployee?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Then apply shift filter
      if (shiftFilterOption !== 'all') {
        const deviceSchedule = scheduleData.find(schedule => schedule.device_id === device.id);
        const scheduleType = deviceSchedule?.schedule_type;
        
        if (shiftFilterOption === 'day' && scheduleType !== 'day') {
          return false;
        }
        if (shiftFilterOption === 'night' && scheduleType !== 'night') {
          return false;
        }
        if (shiftFilterOption === 'other' && (scheduleType === 'day' || scheduleType === 'night')) {
          return false;
        }
      }

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

    // Sort devices by idEmployee first, then by name
    return filtered.sort((a, b) => {
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
  }, [devices, searchQuery, filterOption, shiftFilterOption, sleepData, scheduleData]);

  const handleDeviceClick = (deviceId: string) => {
    setActiveDeviceId(deviceId);
    
    // Get shift type for the selected device
    const deviceSchedule = scheduleData.find(schedule => schedule.device_id === deviceId);
    const shiftType = deviceSchedule?.schedule_type || null;
    
    // Dispatch device-select event to notify other components
    document.dispatchEvent(
      new CustomEvent('device-select', {
        detail: { deviceId, shiftType },
      }),
    );
  };

  // Helper function to get device schedule
  const getDeviceSchedule = (deviceId: string): UserShift | null => {
    const schedule = scheduleData.find(schedule => schedule.device_id === deviceId);
    return schedule || null;
  };



  // Helper function to render schedule badge
  const renderScheduleBadge = (scheduleType: string | undefined) => {
    const scheduleConfig = {
      fullday: { label: 'Fullday', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
      day: { label: 'Pagi', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
      night: { label: 'Malam', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
      off: { label: 'OFF', bgColor: 'bg-red-100', textColor: 'text-red-800' }
    };

    const config = scheduleType ? scheduleConfig[scheduleType as keyof typeof scheduleConfig] : null;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs ${
          config ? `${config.bgColor} ${config.textColor}` : 'bg-gray-100 text-gray-600'
        }`}
      >
        {config ? config.label : 'No Schedule'}
      </span>
    );
  };

  // Helper function to render sleep time based on shift
  const renderSleepTime = (deviceSleepData: any, shiftType: string | undefined) => {
    if (!deviceSleepData || deviceSleepData.sleepTotalTime <= 0) {
      return null;
    }

    // If shift is 'off', show 'Off Day'
    if (shiftType === 'off') {
      return 'Off Day';
    }

    // Calculate filtered sleep time based on shift
    let filteredSleepTime = 0;
    
    if (deviceSleepData.sleepMotion && deviceSleepData.sleepMotion.length > 0) {
      deviceSleepData.sleepMotion.forEach((motion: any) => {
        const startTime = new Date(motion.startTime);
        const hour = startTime.getHours();
        const minute = startTime.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        const duration = (motion.endTime - motion.startTime) / 1000; // Convert to seconds

        let includeInShift = false;

        if (shiftType === 'day') {
          // Shift pagi: tidur malam dari jam 17:00 s/d 5:30
          includeInShift = timeInMinutes >= 1020 || timeInMinutes <= 330; // 17:00 = 1020 menit, 5:30 = 330 menit
        } else if (shiftType === 'night') {
          // Shift malam: tidur siang dari jam 5:00 s/d 17:30
          includeInShift = timeInMinutes >= 300 && timeInMinutes <= 1050; // 5:00 = 300 menit, 17:30 = 1050 menit
        } else {
          // For other shifts, include all sleep time
          includeInShift = true;
        }

        if (includeInShift) {
          filteredSleepTime += duration;
        }
      });
    } else {
      // If no sleepMotion data, use total sleep time
      filteredSleepTime = deviceSleepData.sleepTotalTime;
    }

    const hours = Math.floor(filteredSleepTime / 3600);
    const mins = Math.floor((filteredSleepTime % 3600) / 60);
    const formattedTime = `${hours}h ${mins}m`;

    if (shiftType === 'day') {
      return `${formattedTime}*`;
    } else if (shiftType === 'night') {
      return `${formattedTime}*`;
    } else {
      return formattedTime;
    }
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

        {/* Filter Options - 2 Columns Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Left Column - Shift Filter */}
          <div>
            <label htmlFor='shift-filter' className='block text-sm font-medium text-gray-700 mb-2'>
              Filter Shift
            </label>
            <select
              id='shift-filter'
              value={shiftFilterOption}
              onChange={(e) => {
                const newShiftFilter = e.target.value as ShiftFilterOption;
                setShiftFilterOption(newShiftFilter);
                
                // Dispatch shift filter change event to notify other components
                document.dispatchEvent(
                  new CustomEvent('shift-filter-change', {
                    detail: { shiftType: newShiftFilter === 'all' ? null : newShiftFilter },
                  }),
                );
              }}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='all'>All Shifts</option>
              <option value='day'>Pagi ({filteredShiftCount.day})</option>
              <option value='night'>Malam ({filteredShiftCount.night})</option>
              <option value='other'>Other ({filteredShiftCount.other})</option>
            </select>
          </div>
          
          {/* Right Column - Sleep Filter */}
          <div>
            <label htmlFor='sleep-filter' className='block text-sm font-medium text-gray-700 mb-2'>
              Filter Sleep
            </label>
            <select
              id='sleep-filter'
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value as FilterOption)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='all'>All Sleep Status</option>
              <option value='normal'>Normal Sleep ({filteredSleepCount.normal})</option>
              <option value='abnormal'>Abnormal Sleep ({filteredSleepCount.abnormal})</option>
              <option value='nodata'>No Data Sleep ({filteredSleepCount.nodata})</option>
            </select>
          </div>
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
            const deviceSchedule = getDeviceSchedule(device.id);
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
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h4 className='text-sm lg:text-base font-medium'>{device.name || 'Unnamed Device'}</h4>
                      {renderScheduleBadge(deviceSchedule?.schedule_type)}
                    </div>
                    <p className='text-xs lg:text-sm text-gray-600'>
                      {device.idEmployee ? `${device.idEmployee} - Operator ${index + 1}` : `Operator ${index + 1}`}
                    </p>
                    {(deviceSleepData && deviceSleepData.sleepTotalTime > 0) || deviceSchedule?.schedule_type === 'off' ? (
                      <p className='text-xs text-gray-500 mt-1'>
                        Total Sleep Time:{' '}
                        {renderSleepTime(deviceSleepData, deviceSchedule?.schedule_type)}
                      </p>
                    ) : null}
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
