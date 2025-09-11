import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { SleepData, Device } from '../types';
import moment from 'moment';
import 'moment-timezone';
import { api } from '../utils/api';
import { Switch } from '@headlessui/react';

interface SleepChartProps {
  sleepData: SleepData | null;
  devices?: Device[];
  className?: string;
}

interface SleepTimes {
  awakeTime: number;
  eyeMovementTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  totalTime: number;
}

interface InfoCardProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

const SLEEP_STAGES = {
  AWAKE: { value: 1, name: 'Awake', color: '#FF9F43', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
  EYE_MOVEMENT: {
    value: 2,
    name: 'Eye Movement',
    color: '#28C76F',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  LIGHT_SLEEP: { value: 3, name: 'Light Sleep', color: '#00CFE8', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  DEEP_SLEEP: {
    value: 4,
    name: 'Deep Sleep',
    color: '#7367F0',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
} as const;

const initialSleepTimes: SleepTimes = {
  awakeTime: 0,
  eyeMovementTime: 0,
  lightSleepTime: 0,
  deepSleepTime: 0,
  totalTime: 0,
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const InfoCard = ({ label, value, unit, className = '' }: InfoCardProps) => (
  <div className={`p-3 lg:p-4 bg-gray-50 rounded-lg ${className}`}>
    <div className='text-xs lg:text-sm text-gray-600 truncate' title={label}>
      {label}
    </div>
    <div className='text-sm lg:text-lg font-semibold truncate' title={`${value}${unit ? ` ${unit}` : ''}`}>
      {value}
      {unit && <span className='text-xs lg:text-sm text-gray-500 ml-1'>{unit}</span>}
    </div>
  </div>
);

export default function SleepChart({ sleepData, devices = [], className }: SleepChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [currentData, setCurrentData] = useState<SleepData | null>(sleepData);
  const [sleepTimes, setSleepTimes] = useState<SleepTimes>(initialSleepTimes);
  const [isListView, setIsListView] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(devices[0]?.id || null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentShiftType, setCurrentShiftType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));

  // Function to get shift badge label
  const getShiftBadgeLabel = (shiftType: string | null): string => {
    switch (shiftType) {
      case 'day':
        return 'Shift Pagi';
      case 'night':
        return 'Shift Malam';
      case 'fullday':
        return 'Shift Fullday';
      case 'off':
        return 'OFF';
      case 'other':
        return 'Shift Lainnya';
      default:
        return 'No Schedule';
    }
  };

  // Function to get shift badge color
  const getShiftBadgeColor = (shiftType: string | null): string => {
    switch (shiftType) {
      case 'fullday':
        return 'bg-blue-100 text-blue-800';
      case 'day':
        return 'bg-yellow-100 text-yellow-800';
      case 'night':
        return 'bg-purple-100 text-purple-800';
      case 'off':
        return 'bg-red-100 text-red-800';
      case 'other':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    if (sleepData && sleepData.sleepLogs && sleepData.sleepLogs.length > 0) {
      setCurrentData(sleepData);
    }
  }, [sleepData]);

  // Function to filter sleep data based on shift type
  const filterSleepDataByShift = (data: SleepData | null, shiftType: string | null): SleepData | null => {
    // console.log('Filtering sleep data by shift:', shiftType, 'Data:', data);
    
    if (!data) {
      return null;
    }
    
    if (!shiftType || shiftType === 'other' || !data.sleepLogs || data.sleepLogs.length === 0) {
      // console.log('No filtering applied - returning original data');
      return data;
    }

    const filteredSleepLogs = data.sleepLogs.filter(log => {
      const startTime = new Date(log.startTime);
      const hour = startTime.getHours();
      const minute = startTime.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      if (shiftType === 'day') {
        // Shift pagi: tidur malam dari jam 17:00 (hari kemarin) s/d 5:30 (hari ini)
        const isInRange = timeInMinutes >= 1020 || timeInMinutes <= 330; // 17:00 = 1020 menit, 5:30 = 330 menit
        return isInRange;
      } else if (shiftType === 'night') {
        // Shift malam: tidur siang dari jam 5:00 s/d 17:30 (hari ini)
        const isInRange = timeInMinutes >= 300 && timeInMinutes <= 1050; // 5:00 = 300 menit, 17:30 = 1050 menit
        return isInRange;
      }

      return true;
    });

    const filteredData = {
      ...data,
      sleepLogs: filteredSleepLogs,
      sleepTime: filteredSleepLogs.reduce((total, log) => total + log.duration, 0)
    };
    
    // console.log('Filtered data:', filteredData);
    return filteredData;
  };

  const fetchSleepData = async (deviceId: string, start?: string, end?: string, shiftType?: string) => {
    try {
      // console.log('fetching sleep data', deviceId, start, end, shiftType);
      // Get timezone from global state or use default
      const timezone = (window as any).globalTimezone || '+8';
      
      // Fix timezone issue: use date string directly without UTC conversion
      const data = await api.getDeviceSleepData(
        deviceId,
        start || new Date().toISOString().split('T')[0],
        timezone
      );
      
      if (data && data.sleepLogs && data.sleepLogs.length > 0) {
        // Apply shift-based filtering
        const filteredData = filterSleepDataByShift(data, shiftType || currentShiftType);
        setCurrentData(filteredData);
      } else {
        setCurrentData(null);
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setCurrentData(null);
    }
  };

  useEffect(() => {
    const handleDeviceSelect = (e: CustomEvent) => {
      if (!e.detail) {
        console.warn('Device select event detail is null');
        return;
      }
      const { deviceId, shiftType } = e.detail;
      setSelectedDeviceId(deviceId);
      setCurrentShiftType(shiftType || null);
      const end = (document.getElementById('datepicker-range-end') as HTMLInputElement)?.value;
      const start = moment(end).format('YYYY-MM-DD');
      
      // Update selected date state
      setSelectedDate(start);
      
      fetchSleepData(deviceId, start, end, shiftType);
    };

    const handleDateRangeChange = (e: CustomEvent) => {
      const { start, end } = e.detail;
      
      // Update selected date state
      setSelectedDate(start);
      
      const deviceId = document.querySelector('[data-device-list] .bg-blue-50')?.getAttribute('data-device-id');
      if (deviceId) fetchSleepData(deviceId, start, end, currentShiftType || undefined);
    };

    const handleDatePickerChange = (e: CustomEvent) => {
      const selectedDateFromEvent = e.detail;
      // selectedDate is now already a formatted date string from DatePickerCard
      const formattedDate = typeof selectedDateFromEvent === 'string' ? selectedDateFromEvent : moment(selectedDateFromEvent).format('YYYY-MM-DD');
      
      // Update selected date state
      setSelectedDate(formattedDate);
      
      if (selectedDeviceId) {
fetchSleepData(selectedDeviceId, formattedDate, formattedDate, currentShiftType || undefined);
      }
    };

    const handleShiftChange = (e: CustomEvent) => {
      const { shiftType } = e.detail;
      setCurrentShiftType(shiftType);
      
      // Re-fetch data with new shift filter if we have a selected device
      if (selectedDeviceId) {
        const end = (document.getElementById('datepicker-range-end') as HTMLInputElement)?.value;
        const start = moment(end).format('YYYY-MM-DD');
        fetchSleepData(selectedDeviceId, start, end, shiftType);
      }
    };

    document.addEventListener('device-select', handleDeviceSelect as EventListener);
    document.addEventListener('daterange-change', handleDateRangeChange as EventListener);
    document.addEventListener('datepicker-range-end', handleDatePickerChange as EventListener);
    document.addEventListener('shift-filter-change', handleShiftChange as EventListener);
    document.addEventListener('sleep-data-update', ((e: CustomEvent<SleepData>) =>
      setCurrentData(e.detail)) as EventListener);

    return () => {
      document.removeEventListener('device-select', handleDeviceSelect as EventListener);
      document.removeEventListener('daterange-change', handleDateRangeChange as EventListener);
      document.removeEventListener('datepicker-range-end', handleDatePickerChange as EventListener);
      document.removeEventListener('shift-filter-change', handleShiftChange as EventListener);
      document.removeEventListener('sleep-data-update', ((e: CustomEvent<SleepData>) =>
        setCurrentData(e.detail)) as EventListener);
    };
  }, [selectedDeviceId]);
  
  // Listen for timezone changes
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      console.log('Timezone changed in SleepChart:', event.detail.timezone);
      if (selectedDeviceId) {
        fetchSleepData(selectedDeviceId);
      }
    };
    
    document.addEventListener('timezone-change', handleTimezoneChange as EventListener);
    
    return () => {
      document.removeEventListener('timezone-change', handleTimezoneChange as EventListener);
    };
  }, [selectedDeviceId]);

  // Handle shift type changes and re-filter existing data
  useEffect(() => {
    if (sleepData && sleepData.sleepLogs && sleepData.sleepLogs.length > 0) {
      const filteredData = filterSleepDataByShift(sleepData, currentShiftType);
      setCurrentData(filteredData);
    }
  }, [currentShiftType, selectedDate]);

  // Handle initial sleep data and apply current shift filter
  useEffect(() => {
    if (sleepData && sleepData.sleepLogs && sleepData.sleepLogs.length > 0) {
      const filteredData = filterSleepDataByShift(sleepData, currentShiftType);
      setCurrentData(filteredData);
    }
  }, [sleepData, currentShiftType, selectedDate]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);
    
    const handleResize = () => {
      chartInstance.current?.resize();
      // Update mobile state based on window width
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    // Set initial mobile state
    setIsMobile(window.innerWidth < 1024);
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !currentData?.sleepLogs?.length) {
      if (chartInstance.current) {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        chartInstance.current.setOption({
          title: {
            text: 'Sleep Stages Distribution',
            left: 'center',
            top: 0,
          },
          tooltip: {
            show: true,
            trigger: 'axis',
            axisPointer: {
              type: 'line',
              lineStyle: { color: '#6B7280', width: 1, type: 'dashed' },
            },
          },
          grid: {
            left: '5%',
            right: '5%',
            bottom: '15%',
            top: '15%',
            containLabel: true,
          },
          xAxis: {
            type: 'time',
            min: startOfDay.getTime(),
            max: now.getTime(),
            axisLabel: {
              formatter: (value: number) => moment(value).format('HH:mm'),
              hideOverlap: true,
            },
            splitLine: {
              show: true,
              lineStyle: { type: 'dashed', color: '#E5E7EB' },
            },
          },
          yAxis: {
            type: 'category',
            data: Object.values(SLEEP_STAGES).map((s) => s.name),
            inverse: true,
            axisLine: { show: true },
            axisTick: { show: true },
          },
          dataZoom: [
            {
              type: 'slider',
              show: true,
              xAxisIndex: [0],
              bottom: '2%',
              height: 20,
              borderColor: 'transparent',
              backgroundColor: '#F3F4F6',
              fillerColor: '#60A5FA',
              handleStyle: { color: '#3B82F6', borderColor: '#2563EB' },
              emphasis: { handleStyle: { color: '#2563EB' } },
            },
          ],
          series: [
            {
              type: 'custom',
              renderItem: () => null,
              data: [],
            },
          ],
        });
      }
      setSleepTimes(initialSleepTimes);
      return;
    }

    const processedData: Array<[number, number, number, number]> = [];
    const newSleepTimes = { ...initialSleepTimes };
    const activeStages = new Set<number>();

    // Process sleepLogs for new API structure
    if (currentData && currentData.sleepLogs) {
      // Use sleepTime from API response as total duration
      newSleepTimes.totalTime = currentData.sleepTime;
      
      // Parse timestamp dengan format ISO 8601 (2025-09-04T00:24:06.000+08:00)
      const parseTimestamp = (timeStr: string): number => {
        // Validasi input
        if (!timeStr || typeof timeStr !== 'string') {
          console.warn('Invalid timeStr:', timeStr);
          return Date.now();
        }
        
        try {
          // Format dari API: "2025-09-04T00:24:06.000+08:00" (ISO 8601 dengan timezone)
          // Gunakan moment untuk parsing ISO 8601 format
          const parsedMoment = moment(timeStr);
          
          if (!parsedMoment.isValid()) {
            console.warn('Invalid moment parsing for:', timeStr);
            return Date.now();
          }
          
          return parsedMoment.valueOf();
        } catch (error) {
          console.error('Error parsing timestamp:', timeStr, error);
          return Date.now();
        }
      };
      
      currentData.sleepLogs
        .sort((a, b) => parseTimestamp(a.startTime) - parseTimestamp(b.startTime))
        .forEach((log) => {
          const startTime = parseTimestamp(log.startTime);
          const endTime = parseTimestamp(log.endTime);
          const duration = log.duration;
          
          // Map quality to sleep stage value
          let stageValue: number = SLEEP_STAGES.LIGHT_SLEEP.value; // default
          const qualityLower = log.quality.toLowerCase();
          
          if (qualityLower === 'awake') {
            stageValue = SLEEP_STAGES.AWAKE.value;
          } else if (qualityLower === 'light sleep' || qualityLower === 'light') {
            stageValue = SLEEP_STAGES.LIGHT_SLEEP.value;
          } else if (qualityLower === 'deep sleep' || qualityLower === 'deep') {
            stageValue = SLEEP_STAGES.DEEP_SLEEP.value;
          } else if (qualityLower === 'eye movement' || qualityLower === 'rem') {
            stageValue = SLEEP_STAGES.EYE_MOVEMENT.value;
          }
          
          // Store duration in seconds for tooltip
          processedData.push([startTime, stageValue, endTime, duration]);
          activeStages.add(stageValue);

          switch (stageValue) {
            case SLEEP_STAGES.AWAKE.value:
              newSleepTimes.awakeTime += duration;
              break;
            case SLEEP_STAGES.EYE_MOVEMENT.value:
              newSleepTimes.eyeMovementTime += duration;
              break;
            case SLEEP_STAGES.LIGHT_SLEEP.value:
              newSleepTimes.lightSleepTime += duration;
              break;
            case SLEEP_STAGES.DEEP_SLEEP.value:
              newSleepTimes.deepSleepTime += duration;
              break;
          }
        });
     }

    setSleepTimes(newSleepTimes);

    // Calculate time range based on actual sleep data from API
    let timeRange = { min: 0, max: 0 };
    if (processedData.length > 0) {
      // Use startTime from first sleepLog and endTime from last sleepLog
      const firstDataPoint = processedData[0];
      const lastDataPoint = processedData[processedData.length - 1];
      
      timeRange = {
        min: firstDataPoint[0], // startTime from first log
        max: lastDataPoint[2]   // endTime from last log
      };
    }

    const activeStagesList = Object.values(SLEEP_STAGES).filter((stage) => activeStages.has(stage.value));

    const option: echarts.EChartsOption = {
      title: { text: 'Sleep Stages Distribution', left: 'center', top: 0 },
      tooltip: {
        show: true,
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';

          const [startTime, stageValue, endTime, durationInSeconds] = data;
          const stage = Object.values(SLEEP_STAGES).find((s) => s.value === stageValue)?.name || 'Unknown';

          // Format waktu dalam timezone lokal
          const timeStart = moment(startTime).format('DD/MM HH:mm:ss');
          const timeEnd = moment(endTime).format('DD/MM HH:mm:ss');
          const durationFormatted = formatDuration(durationInSeconds);

          let html = `<div style="font-size: 14px;">
            <p style="margin: 0;"><strong>Start:</strong> ${timeStart}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${timeEnd}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationFormatted}</p>
            <p style="margin: 5px 0 0;"><strong>Stage:</strong> ${stage}</p>
          </div>`;

          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#6B7280', width: 1, type: 'dashed' },
        },
      },
      grid: { 
        left: isMobile ? '2%' : '1%', 
        right: isMobile ? '2%' : '1%', 
        bottom: '20%', 
        top: '15%', 
        containLabel: true 
      },
      xAxis: {
        type: 'time',
        min: timeRange.min,
        max: timeRange.max,
        axisLabel: {
          formatter: (value: number) => moment(value).format('DD/MM HH:mm'),
          hideOverlap: true,
        },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#E5E7EB' } },
      },
      yAxis: {
        type: 'category',
        data: activeStagesList.map((s) => s.name),
        inverse: true,
        axisLine: { show: !isMobile },
        axisTick: { show: !isMobile },
        axisLabel: { 
          show: !isMobile,
          margin: 10,
          fontSize: 12,
          color: '#4B5563',
          fontWeight: 500
        },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: '2%',
          height: 20,
          borderColor: 'transparent',
          backgroundColor: '#F3F4F6',
          fillerColor: '#60A5FA',
          handleStyle: { color: '#3B82F6', borderColor: '#2563EB' },
          emphasis: { 
            handleLabel: {
              show: true
            },
            handleStyle: { 
              color: '#2563EB' 
            }
          },
          textStyle: { color: '#6B7280' },
          start: 0,
          end: 100,
          zoomLock: false,
          moveHandleIcon: 'move',
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series: [
        {
          name: 'Sleep Stage',
          type: 'custom',
          renderItem: (params: echarts.CustomSeriesRenderItemParams, api: echarts.CustomSeriesRenderItemAPI) => {
            const startTime = api.value(0) as number;
            const stageValue = api.value(1) as number;
            const endTime = api.value(2) as number;
            // const duration = api.value(3) as number; // Available if needed
            const stageIndex = activeStagesList.findIndex((s) => s.value === stageValue);

            const start = api.coord([startTime, stageIndex]);
            const end = api.coord([endTime, stageIndex]);

            const rectShape = {
              x: start[0],
              y: start[1] - 10,
              width: Math.max(end[0] - start[0], 2),
              height: 20,
            };

            // Perbaikan tipe coordSys
            const coordSys = params.coordSys as unknown as { x: number; y: number; width: number; height: number };
            const clippedShape = echarts.graphic.clipRectByRect(rectShape, coordSys);

            return (
              clippedShape && {
                type: 'rect',
                shape: clippedShape,
                style: { fill: activeStagesList[stageIndex].color },
              }
            );
          },
          encode: { x: [0, 2], y: 1 }, // x uses startTime and endTime, y uses stageValue
          data: processedData,
        },
      ],
      legend: {
        show: true,
        data: activeStagesList.map((stage) => ({
          name: stage.name,
          icon: 'rect',
          itemStyle: { color: stage.color },
        })),
        bottom: 5,
        textStyle: { 
          color: '#374151', 
          fontSize: 13,
          fontWeight: 500
        },
        selectedMode: false,
        orient: 'horizontal',
        left: 'center',
        itemGap: 20,
        itemWidth: 14,
        itemHeight: 14,
      },
    };

    chartInstance.current.setOption(option, true);
  }, [currentData, isMobile]);

  const StageCard = ({ stage, time }: { stage: keyof typeof SLEEP_STAGES; time: number }) => (
    <div className={`p-2 lg:p-3 ${SLEEP_STAGES[stage].bgColor} rounded`}>
      <div
        className={`${SLEEP_STAGES[stage].textColor} text-xs lg:text-sm truncate`}
        title={SLEEP_STAGES[stage].name}
      >
        {SLEEP_STAGES[stage].name}
      </div>
      <div className='text-xs lg:text-sm font-medium truncate'>{formatDuration(time)}</div>
    </div>
  );

  // Get selected device name
  const selectedDevice = devices.find(device => device.id === selectedDeviceId);
  const deviceName = selectedDevice?.name || 'Unknown Device';

  return (
    <div className={`bg-white rounded-lg p-4 lg:p-6 ${className}`}>
      <div className='mb-3 lg:mb-4'>
        <div className='text-left mb-3 lg:mb-4'>
          <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4'>
            <h5 className='text-lg lg:text-2xl font-bold text-gray-900'>
              Sleep Monitoring
              <span className='text-sm lg:text-lg text-blue-600 font-medium ml-2'>
                - {deviceName}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 ml-3 text-xs font-medium rounded-full border ${getShiftBadgeColor(currentShiftType)}`}>
                {getShiftBadgeLabel(currentShiftType)}
              </span>
            </h5>
            <div className='flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 lg:px-4 py-2 rounded-lg border border-blue-200'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
              <span className='text-xs lg:text-sm text-gray-600 font-medium'>Total Duration:</span>
              <span className='text-sm lg:text-lg font-bold text-blue-700'>
                {formatDuration(sleepTimes.totalTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className='mb-3 lg:mb-4'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 text-center mb-3 lg:mb-4'>
          <StageCard stage='AWAKE' time={sleepTimes.awakeTime} />
          <StageCard stage='EYE_MOVEMENT' time={sleepTimes.eyeMovementTime} />
          <StageCard stage='LIGHT_SLEEP' time={sleepTimes.lightSleepTime} />
          <StageCard stage='DEEP_SLEEP' time={sleepTimes.deepSleepTime} />
        </div>
      </div>
      <div ref={chartRef} className='w-full' style={{ height: 'min(200px, 35vh)' }} />

      <div className='mt-6 lg:mt-8'>
        <div className='flex justify-between items-center mb-3 lg:mb-4'>
          <h5 className='text-lg lg:text-xl font-bold text-gray-900'>Additional Information</h5>
          <Switch.Group>
            <div className='flex items-center'>
              <Switch.Label className='mr-2 lg:mr-3 text-xs lg:text-sm text-gray-600'>List View</Switch.Label>
              <Switch
                checked={isListView}
                onChange={setIsListView}
                className={`${
                  isListView ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
              >
                <span
                  className={`${
                    isListView ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </Switch.Group>
        </div>

        {currentData &&
          (isListView ? (
            <div className='space-y-2'>
              {Object.entries({
                'Sleep Time': { value: formatDuration(sleepTimes.totalTime), unit: '' },
                'Sleep Quality': { value: (currentData.sleepQuality * 100).toFixed(2), unit: '%' },
                'Heart Rate': {
                  value: `${currentData.heartRate.min}-${currentData.heartRate.max}`,
                  unit: 'bpm',
                },
                'Blood Oxygen': {
                  value: `${currentData.bloodOxygen.min}-${currentData.bloodOxygen.max}`,
                  unit: '%',
                },
              }).map(([label, data]) => (
                <div key={label} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <span className='text-gray-600'>{label}</span>
                  <span className='font-semibold'>
                    {data.value}
                    {data.unit && <span className='text-sm text-gray-500 ml-1'>{data.unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4'>
              <InfoCard label='Total Sleep Time' value={formatDuration(currentData.sleepTime)} />
              <InfoCard label='Sleep Quality' value={(currentData.sleepQuality * 100).toFixed(2)} unit='%' />
              <InfoCard
                label='Heart Rate'
                value={`${currentData.heartRate.min}-${currentData.heartRate.max}`}
                unit='bpm'
              />
              <InfoCard
                label='Blood Oxygen'
                value={`${currentData.bloodOxygen.min}-${currentData.bloodOxygen.max}`}
                unit='%'
              />
            </div>
          ))}
      </div>
    </div>
  );
}
