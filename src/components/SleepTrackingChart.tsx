import { useEffect, useState } from 'react';
import moment from 'moment';
import type { SleepData } from '../types';
import { api } from '../utils/api';

interface SleepTrackingChartProps {
  sleepData: SleepData[] | null;
  selectedDeviceId: string;
  className?: string;
}

interface ProcessedSleepData {
  id: string;
  startTime: string;
  endTime: string;
  duration: string;
  quality: string | number;
}

export default function SleepTrackingChart({
  sleepData: initialSleepData,
  selectedDeviceId: initialSelectedDeviceId,
  className,
}: SleepTrackingChartProps) {
  const [processedData, setProcessedData] = useState<ProcessedSleepData[]>([]);
  const [sleepData, setSleepData] = useState<SleepData[] | null>(initialSleepData);

  // Menangani perubahan perangkat dan rentang tanggal
  useEffect(() => {
    const handleDateRangeChange = async (e: CustomEvent) => {
      try {
        const { start, end } = e.detail;
        const data = await api.getDeviceSleepData(initialSelectedDeviceId, start, end);
        setSleepData(data);
      } catch (error) {
        console.error('Error fetching sleep data:', error);
        setSleepData(null);
      }
    };

    const handleDeviceSelect = async (e: CustomEvent) => {
      try {
        const { deviceId } = e.detail;
        const end = (document.getElementById('datepicker-range-end') as HTMLInputElement)?.value;
        const start = (document.getElementById('datepicker-range-start') as HTMLInputElement)?.value;

        const data = await api.getDeviceSleepData(deviceId, moment(start).toISOString(), moment(end).toISOString());
        setSleepData(data);
      } catch (error) {
        console.error('Error fetching sleep data:', error);
        setSleepData(null);
      }
    };

    // Menambahkan event listeners
    document.addEventListener('daterange-change', handleDateRangeChange as EventListener);
    document.addEventListener('device-select', handleDeviceSelect as EventListener);

    // Membersihkan event listeners
    return () => {
      document.removeEventListener('daterange-change', handleDateRangeChange as EventListener);
      document.removeEventListener('device-select', handleDeviceSelect as EventListener);
    };
  }, [initialSelectedDeviceId]);

  // Memproses data setiap kali sleepData berubah
  useEffect(() => {
    const processData = (data: SleepData[] | null) => {
      if (!data?.length) {
        setProcessedData([]);
        return;
      }

      const processed: ProcessedSleepData[] = [];

      data.forEach((sleep) => {
        if (!sleep?.id || !sleep?.sleepMotion?.length) {
          return;
        }

        sleep.sleepMotion.forEach((motion) => {
          if (!motion?.startTime || !motion?.endTime || typeof motion?.value === 'undefined') {
            return;
          }

          try {
            const startMoment = moment(motion.startTime);
            const endMoment = moment(motion.endTime);

            if (!startMoment.isValid() || !endMoment.isValid()) {
              return;
            }

            const duration = moment.duration(endMoment.diff(startMoment));
            const quality = getQualityLabel(motion.value);

            processed.push({
              id: `${sleep.id}-${motion.startTime}`,
              startTime: startMoment.format('DD/MM/YYYY HH:mm:ss'),
              endTime: endMoment.format('DD/MM/YYYY HH:mm:ss'),
              duration: `${Math.floor(duration.asHours())}:${duration.minutes()}:${duration.seconds()}`,
              quality: quality,
            });
          } catch (error) {
            console.error('Error processing sleep data entry:', error);
          }
        });
      });

      setProcessedData(processed);
    };

    processData(sleepData);
  }, [sleepData]);

  // Add helper function for quality label
  const getQualityLabel = (value: number): string => {
    switch (value) {
      case 1:
        return 'Awake';
      case 2:
        return 'Eye Movement';
      case 3:
        return 'Light Sleep';
      case 4:
        return 'Deep Sleep';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`bg-white rounded-lg p-4 sm:p-6 ${className}`}>
      <h3 className='text-lg font-semibold mb-4 sm:mb-6 truncate'>Sleep Logs</h3>
      <div className='max-h-[calc(100vh-300px)] overflow-auto'>
        <table className='min-w-full'>
          <thead className='sticky top-0 bg-white'>
            <tr className='border-b'>
              <th className='p-2 sm:p-3 text-left text-sm sm:text-base'>Start Time</th>
              <th className='p-2 sm:p-3 text-left text-sm sm:text-base'>End Time</th>
              <th className='hidden sm:table-cell p-2 sm:p-3 text-left text-sm sm:text-base'>Duration</th>
              <th className='p-2 sm:p-3 text-left text-sm sm:text-base'>Quality</th>
            </tr>
          </thead>
          <tbody>
            {processedData.length > 0 ? (
              processedData.map((data) => (
                <tr key={data.id} className='border-b hover:bg-gray-50'>
                  <td className='p-2 sm:p-3 text-sm whitespace-nowrap'>
                    <div className='truncate max-w-[120px] sm:max-w-none' title={data.startTime}>
                      {data.startTime}
                    </div>
                  </td>
                  <td className='p-2 sm:p-3 text-sm whitespace-nowrap'>
                    <div className='truncate max-w-[120px] sm:max-w-none' title={data.endTime}>
                      {data.endTime}
                    </div>
                  </td>
                  <td className='hidden sm:table-cell p-2 sm:p-3 text-sm whitespace-nowrap'>
                    <div className='truncate' title={data.duration}>
                      {data.duration}
                    </div>
                  </td>
                  <td className='p-2 sm:p-3 text-sm whitespace-nowrap'>
                    <div className='truncate max-w-[100px] sm:max-w-none' title={data.quality}>
                      {data.quality}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className='p-4 text-center text-gray-500 text-sm sm:text-base'>
                  Tidak ada data tidur yang tersedia
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
