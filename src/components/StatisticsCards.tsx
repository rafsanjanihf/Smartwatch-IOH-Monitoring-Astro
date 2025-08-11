import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

interface StatisticsCardsProps {
  deviceCount: number;
  sleepRecordsCount: number;
  heartRateStats: {
    avgBpm: number;
    maxBpm: number;
    minBpm: number;
  };
  sleepStats: {
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  };
  selectedDate?: string; // Format YYYY-MM-DD
  deviceIds?: string; // Comma-separated device IDs
}

const StatisticsCards: FC<StatisticsCardsProps> = ({ 
  deviceCount, 
  sleepRecordsCount: initialSleepRecordsCount, 
  heartRateStats, 
  sleepStats, 
  selectedDate,
  deviceIds 
}) => {
  const [sleepRecordsCount, setSleepRecordsCount] = useState(initialSleepRecordsCount);

  const [currentSelectedDate, setCurrentSelectedDate] = useState(selectedDate);

  // Listen for date changes from DatePickerCard
  useEffect(() => {
    const handleDateChange = (e: CustomEvent) => {
      setCurrentSelectedDate(e.detail);
    };

    document.addEventListener('date-change', handleDateChange as EventListener);
    
    return () => {
      document.removeEventListener('date-change', handleDateChange as EventListener);
    };
  }, []);

  // Update sleep records count when selectedDate changes
  useEffect(() => {
    const updateSleepRecordsCount = async () => {
      if (currentSelectedDate && deviceIds) {
        try {
          const sleepData = await api.getAllSleepData(deviceIds, currentSelectedDate);
          // Hitung Normal Sleep + Abnormal Sleep (exclude No Data)
          const count = sleepData.filter(sleep => sleep.sleepTotalTime > 0).length;
          setSleepRecordsCount(count);
        } catch (error) {
          console.error('Error fetching sleep data for selected date:', error);
          // Fallback to initial count if error
          setSleepRecordsCount(initialSleepRecordsCount);
        }
      } else {
        // Use initial count if no date selected
        setSleepRecordsCount(initialSleepRecordsCount);
      }
    };

    updateSleepRecordsCount();
  }, [currentSelectedDate, deviceIds, initialSleepRecordsCount]);

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4'>
      <div className='bg-[#474F7C] p-4 lg:p-6 rounded-lg flex items-center justify-between text-white'>
        <div>
          <h3 className='text-xl lg:text-2xl xl:text-4xl font-bold mb-1 lg:mb-2'>{deviceCount}</h3>
          <p className='text-xs lg:text-sm opacity-80'>Device Registered</p>
        </div>
      </div>

      <div className='bg-white p-3 lg:p-6 rounded-lg flex items-center justify-between shadow-sm'>
        <div>
          <h3 className='text-xl lg:text-2xl xl:text-4xl font-bold mb-1 lg:mb-2'>{sleepRecordsCount}</h3>
          <p className='text-xs lg:text-sm text-gray-600 leading-tight whitespace-nowrap overflow-hidden text-ellipsis'>
            Sleep Records {currentSelectedDate ? `(${currentSelectedDate})` : ''}
          </p>
        </div>
      </div>

      

      <div className='bg-white p-3 lg:p-6 rounded-lg shadow-sm'>
        <div className='mb-2 lg:mb-4'>
          <h3 className='text-lg lg:text-2xl xl:text-4xl font-bold leading-none mb-1'>{sleepStats.avgDuration} hours</h3>
          <p className='text-[10px] lg:text-sm text-gray-600 leading-tight whitespace-nowrap overflow-hidden text-ellipsis'>
            Recommended Sleep Time
          </p>
        </div>
        <div className='text-[10px] lg:text-sm text-gray-600'>
          <span>{sleepStats.maxDuration} h </span>
          <span>• </span>
          <span>{sleepStats.minDuration} h </span>
        </div>
      </div>

      <div className='bg-white p-3 lg:p-6 rounded-lg shadow-sm'>
        <div className='mb-2 lg:mb-4'>
          <h3 className='text-lg lg:text-2xl xl:text-4xl font-bold leading-none mb-1'>{heartRateStats.avgBpm} bpm</h3>
          <p className='text-[10px] lg:text-sm text-gray-600 leading-tight whitespace-nowrap overflow-hidden text-ellipsis'>
            Recommended Heart Rate
          </p>
        </div>
        <div className='flex items-center space-x-1 text-[10px] lg:text-sm text-gray-600'>
          <span>{heartRateStats.maxBpm} bpm</span>
          <span>•</span>
          <span>{heartRateStats.minBpm} bpm</span>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCards;
