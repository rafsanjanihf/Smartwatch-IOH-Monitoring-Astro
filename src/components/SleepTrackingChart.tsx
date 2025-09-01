import { useEffect, useState } from "react";
import moment from "moment";
import "moment-timezone";
import type { SleepData } from "../types";
import { api } from "../utils/api";

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
  const [sleepData, setSleepData] = useState<SleepData[] | null>(
    initialSleepData
  );
  const [currentShiftType, setCurrentShiftType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );

  // Filter sleep data based on shift type
  const filterSleepDataByShift = (
    data: SleepData[],
    shiftType: string | null
  ): SleepData[] => {
    if (!data) {
      return [];
    }

    if (!shiftType || shiftType === "all" || shiftType === "other") {
      return data;
    }

    //console.log('SleepTrackingChart - Filtering sleep data by shift:', shiftType);
    //console.log('SleepTrackingChart - Initial data length:', data.length);

    const filteredData = data
      .map((sleepRecord) => {
        if (!sleepRecord.sleepMotion || sleepRecord.sleepMotion.length === 0) {
          return sleepRecord;
        }

        const originalMotionCount = sleepRecord.sleepMotion.length;
        const selectedDateMoment = moment(selectedDate);

        let filteredSleepMotion;

        if (shiftType === "day") {
          // Day shift: filter for night sleep (5:00 PM yesterday to 5:30 AM today)
          const startTime = selectedDateMoment
            .clone()
            .subtract(1, "day")
            .hour(17)
            .minute(0)
            .second(0)
            .millisecond(0);
          const endTime = selectedDateMoment
            .clone()
            .hour(5)
            .minute(30)
            .second(0)
            .millisecond(0);

          filteredSleepMotion = sleepRecord.sleepMotion.filter((motion) => {
            const motionStart = moment(motion.startTime);
            const motionEnd = moment(motion.endTime);

            // Check if motion overlaps with the time range
            // Motion is included if it starts before endTime and ends after startTime
            return (
              motionStart.isBefore(endTime) && motionEnd.isAfter(startTime)
            );
          });
        } else if (shiftType === "night") {
          // Night shift: filter for day sleep (5:00 AM to 5:30 PM today)
          const startTime = selectedDateMoment
            .clone()
            .hour(5)
            .minute(0)
            .second(0)
            .millisecond(0);
          const endTime = selectedDateMoment
            .clone()
            .hour(17)
            .minute(30)
            .second(0)
            .millisecond(0);

          filteredSleepMotion = sleepRecord.sleepMotion.filter((motion) => {
            const motionStart = moment(motion.startTime);
            const motionEnd = moment(motion.endTime);
            
            // Check if motion overlaps with the time range
            // Motion is included if it starts before endTime and ends after startTime
            return (
              motionStart.isBefore(endTime) && motionEnd.isAfter(startTime)
            );
          });
        } else {
          filteredSleepMotion = sleepRecord.sleepMotion;
        }

        //console.log(`SleepTrackingChart - Device ${sleepRecord.device_id}: ${originalMotionCount} -> ${filteredSleepMotion.length} motion records`);

        return {
          ...sleepRecord,
          sleepMotion: filteredSleepMotion,
        };
      })
      .filter((sleepRecord) => sleepRecord.sleepMotion.length > 0);

    //console.log('SleepTrackingChart - Filtered data length:', filteredData.length);
    return filteredData;
  };

  // Initialize data on component mount
  useEffect(() => {
    if (initialSleepData && initialSleepData.length > 0) {
      setOriginalSleepData(initialSleepData);
      // Apply current shift filter to initial data
      const filteredData = filterSleepDataByShift(
        initialSleepData,
        currentShiftType
      );
      setSleepData(filteredData);
    }
  }, [initialSleepData]);

  // Store original unfiltered data
  const [originalSleepData, setOriginalSleepData] = useState<
    SleepData[] | null
  >(null);

  // Apply shift filter when currentShiftType changes
  useEffect(() => {
    if (originalSleepData && originalSleepData.length > 0) {
      const filteredData = filterSleepDataByShift(
        originalSleepData,
        currentShiftType
      );
      setSleepData(filteredData);
    }
  }, [currentShiftType, originalSleepData]);

  // Menangani perubahan perangkat dan rentang tanggal
  useEffect(() => {
    const handleDateRangeChange = async (e: CustomEvent) => {
      try {
        const { start, end } = e.detail;
        //console.log('handleDateRangeChange', start, end);
        const data = await api.getDeviceSleepData(
          initialSelectedDeviceId,
          start,
          end
        );

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
        const data = await api.getDeviceSleepData(deviceId, start, end);

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
          formattedDate,
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
          if (
            !motion?.startTime ||
            !motion?.endTime ||
            typeof motion?.value === "undefined"
          ) {
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
              startTime: startMoment.format("DD/MM/YYYY HH:mm:ss"),
              endTime: endMoment.format("DD/MM/YYYY HH:mm:ss"),
              duration: `${Math.floor(
                duration.asHours()
              )}:${duration.minutes()}:${duration.seconds()}`,
              quality: quality,
            });
          } catch (error) {
            console.error("Error processing sleep data entry:", error);
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
        return "Awake";
      case 2:
        return "Eye Movement";
      case 3:
        return "Light Sleep";
      case 4:
        return "Deep Sleep";
      default:
        return "Unknown";
    }
  };

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
