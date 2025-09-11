import { useEffect, useState } from "react";
import moment from "moment";
import "moment-timezone";
import type { SleepData } from "../types";
import { api } from "../utils/api";

interface SleepTrackingChartProps {
  sleepData: SleepData | null;
  selectedDeviceId: string | null;
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
  const [sleepData, setSleepData] = useState<SleepData | null>(initialSleepData);
  const [currentShiftType, setCurrentShiftType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );

  // Filter sleep data based on shift type
  const filterSleepDataByShift = (data: SleepData | null, shiftType: string | null): SleepData | null => {
    if (!data || !data.sleepLogs || data.sleepLogs.length === 0) {
      return data;
    }

    if (!shiftType || shiftType === "all" || shiftType === "other") {
      return data;
    }

    const selectedDateMoment = moment(selectedDate);
    let filteredSleepLogs;
    
    if (shiftType === 'day') {
      // Day shift: filter for night sleep (5:00 PM yesterday to 5:30 AM today)
      const startTime = selectedDateMoment.clone().subtract(1, 'day').hour(17).minute(0).second(0);
      const endTime = selectedDateMoment.clone().hour(5).minute(30).second(0);
      
      filteredSleepLogs = data.sleepLogs.filter(log => {
        const logStart = moment(log.startTime);
        return logStart.isBetween(startTime, endTime, null, '[]');
      });
    } else if (shiftType === 'night') {
      // Night shift: filter for day sleep (5:00 AM to 5:30 PM today)
      const startTime = selectedDateMoment.clone().hour(5).minute(0).second(0);
      const endTime = selectedDateMoment.clone().hour(17).minute(30).second(0);
      
      filteredSleepLogs = data.sleepLogs.filter(log => {
        const logStart = moment(log.startTime);
        return logStart.isBetween(startTime, endTime, null, '[]');
      });
    } else {
      filteredSleepLogs = data.sleepLogs;
    }

    return {
      ...data,
      sleepLogs: filteredSleepLogs,
      sleepTime: filteredSleepLogs.reduce((total, log) => total + log.duration, 0)
    };
  };

  // Store original unfiltered data
  const [originalSleepData, setOriginalSleepData] = useState<SleepData | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    if (initialSleepData && initialSleepData.sleepLogs && initialSleepData.sleepLogs.length > 0) {
      setOriginalSleepData(initialSleepData);
      // Apply current shift filter to initial data
      const filteredData = filterSleepDataByShift(
        initialSleepData,
        currentShiftType
      );
      setSleepData(filteredData);
    }
  }, [initialSleepData]);

  // Apply shift filter when currentShiftType changes
  useEffect(() => {
    if (originalSleepData && originalSleepData.sleepLogs && originalSleepData.sleepLogs.length > 0) {
      const filteredData = filterSleepDataByShift(originalSleepData, currentShiftType);

      setSleepData(filteredData);
    }
  }, [currentShiftType, originalSleepData]);

  // Menangani perubahan perangkat dan rentang tanggal
  useEffect(() => {
    const handleDateRangeChange = async (e: CustomEvent) => {
      try {
        if (!initialSelectedDeviceId) {
          console.warn('No device selected, skipping date range change');
          return;
        }
        const { start, end } = e.detail;
        //console.log('handleDateRangeChange', start, end);
        const data = await api.getDeviceSleepData(initialSelectedDeviceId, start);
        
        // Store original data and apply current shift filter
        setOriginalSleepData(data);
        const filteredData = filterSleepDataByShift(data, currentShiftType);
        setSleepData(filteredData);
      } catch (error) {
        console.error("Error fetching sleep data:", error);
        setOriginalSleepData(null);
        setSleepData(null);
      }
    };

    const handleDeviceSelect = async (e: CustomEvent) => {
      try {
        if (!e.detail) {
          console.warn("Device select event detail is null");
          return;
        }
        const { deviceId, shiftType } = e.detail;
        const end = (
          document.getElementById("datepicker-range-end") as HTMLInputElement
        )?.value;
        const start = moment(end).format("YYYY-MM-DD");

        // Update current shift type
        setCurrentShiftType(shiftType || null);
        setSelectedDate(start);

        // Fix timezone issue: use date string directly without UTC conversion
        const data = await api.getDeviceSleepData(deviceId, start);
        // Store original data and apply shift filter
        setOriginalSleepData(data);
        const filteredData = filterSleepDataByShift(data, shiftType || null);
        setSleepData(filteredData);
      } catch (error) {
        console.error("Error fetching sleep data:", error);
        setSleepData(null);
      }
    };

    const handleDatePickerChange = async (e: CustomEvent) => {
      try {
        if (!initialSelectedDeviceId) {
          console.warn('No device selected, skipping date picker change');
          return;
        }
        const selectedDateFromEvent = e.detail;
        // selectedDate is now already a formatted date string from DatePickerCard
        const formattedDate =
          typeof selectedDateFromEvent === "string"
            ? selectedDateFromEvent
            : moment(selectedDateFromEvent).format("YYYY-MM-DD");

        // Update selected date
        setSelectedDate(formattedDate);

        // Fix timezone issue: use date string directly without UTC conversion
        const data = await api.getDeviceSleepData(
          initialSelectedDeviceId, 
          formattedDate
        );

        // Store original data and apply current shift filter
        setOriginalSleepData(data);
        const filteredData = filterSleepDataByShift(data, currentShiftType);
        setSleepData(filteredData);
      } catch (error) {
        console.error("Error fetching sleep data:", error);
        setSleepData(null);
      }
    };

    const handleShiftFilterChange = (e: CustomEvent) => {
      const newShiftType = e.detail === "all" ? null : e.detail;
      setCurrentShiftType(newShiftType);

      // Re-filter will be handled by useEffect that watches currentShiftType
    };

    const handleSleepDataUpdate = (e: CustomEvent) => {
      //console.log('handleSleepDataUpdate', e.detail);

      // Store original data and apply current shift filter
      setOriginalSleepData(e.detail);
      const filteredData = filterSleepDataByShift(e.detail, currentShiftType);
      setSleepData(filteredData);
    };

    // Menambahkan event listeners
    document.addEventListener(
      "daterange-change",
      handleDateRangeChange as EventListener
    );
    document.addEventListener(
      "device-select",
      handleDeviceSelect as EventListener
    );
    document.addEventListener(
      "datepicker-range-end",
      handleDatePickerChange as EventListener
    );
    document.addEventListener(
      "shift-filter-change",
      handleShiftFilterChange as EventListener
    );
    document.addEventListener(
      "sleep-data-update",
      handleSleepDataUpdate as EventListener
    );

    // Membersihkan event listeners
    return () => {
      document.removeEventListener(
        "daterange-change",
        handleDateRangeChange as EventListener
      );
      document.removeEventListener(
        "device-select",
        handleDeviceSelect as EventListener
      );
      document.removeEventListener(
        "datepicker-range-end",
        handleDatePickerChange as EventListener
      );
      document.removeEventListener(
        "shift-filter-change",
        handleShiftFilterChange as EventListener
      );
      document.removeEventListener(
        "sleep-data-update",
        handleSleepDataUpdate as EventListener
      );
    };
  }, [initialSelectedDeviceId]);

  // Memproses data setiap kali sleepData berubah
  useEffect(() => {
    const processData = (data: SleepData | null) => {
      if (!data || !data.sleepLogs || data.sleepLogs.length === 0) {
        setProcessedData([]);
        return;
      }

      const processed: ProcessedSleepData[] = [];

      data.sleepLogs.forEach((log, index) => {
        if (!log?.startTime || !log?.endTime || !log?.quality) {
          return;
        }

        try {
          // Parse ISO 8601 timestamp format
          const startMoment = moment(log.startTime);
          const endMoment = moment(log.endTime);

          if (!startMoment.isValid() || !endMoment.isValid()) {
            return;
          }

          const duration = moment.duration(endMoment.diff(startMoment));
          const hours = Math.floor(duration.asHours());
          const minutes = duration.minutes();
          const seconds = duration.seconds();

          processed.push({
            id: `${data.deviceId}-${index}-${log.startTime}`,
            startTime: startMoment.format('DD/MM/YYYY HH:mm:ss'),
            endTime: endMoment.format('DD/MM/YYYY HH:mm:ss'),
            duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            quality: log.quality,
          });
        } catch (error) {
          console.error('Error processing sleep data entry:', error);
        }

      });

      setProcessedData(processed);
    };

    processData(sleepData);
  }, [sleepData]);

  return (
    <div className={`bg-white rounded-lg p-4 sm:p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 sm:mb-6 truncate">
        Sleep Logs
      </h3>
      <div className="max-h-[calc(100vh-300px)] overflow-auto">
        <table className="w-full table-auto">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b">
              <th className="p-2 sm:p-3 text-left text-xs sm:text-base font-semibold">
                Start Time
              </th>
              <th className="p-2 sm:p-3 text-left text-xs sm:text-base font-semibold">
                End Time
              </th>
              <th className="hidden sm:table-cell p-2 sm:p-3 text-left text-sm sm:text-base font-semibold">
                Duration
              </th>
              <th className="p-2 sm:p-3 text-left text-xs sm:text-base font-semibold">
                Quality
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.length > 0 ? (
              processedData.map((data) => (
                <tr key={data.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">
                    <div className="break-words" title={data.startTime}>
                      {data.startTime}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">
                    <div className="break-words" title={data.endTime}>
                      {data.endTime}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell p-2 sm:p-3 text-sm">
                    <div title={data.duration}>{data.duration}</div>
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm">
                    <div className="break-words" title={data.quality}>
                      {data.quality}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-gray-500 text-sm sm:text-base"
                >
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
