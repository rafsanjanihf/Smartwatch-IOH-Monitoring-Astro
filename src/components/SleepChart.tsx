import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { SleepData } from '../types';
import moment from 'moment';
import { api } from '../utils/api';
import { Switch } from '@headlessui/react';

interface SleepChartProps {
  sleepData: SleepData[] | null;
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
  <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
    <div className='text-sm text-gray-600 truncate' title={label}>
      {label}
    </div>
    <div className='text-lg font-semibold truncate' title={`${value}${unit ? ` ${unit}` : ''}`}>
      {value}
      {unit && <span className='text-sm text-gray-500 ml-1'>{unit}</span>}
    </div>
  </div>
);

export default function SleepChart({ sleepData, className }: SleepChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [currentData, setCurrentData] = useState<SleepData[] | null>(sleepData);
  const [sleepTimes, setSleepTimes] = useState<SleepTimes>(initialSleepTimes);
  const [isListView, setIsListView] = useState(false);

  const fetchSleepData = async (deviceId: string, start?: string, end?: string) => {
    try {
      console.log('fetching sleep data', deviceId, start, end);
      const data = await api.getDeviceSleepData(
        deviceId,
        start ? moment(start).toISOString() : undefined,
        end ? moment(end).toISOString() : undefined,
      );
      setCurrentData(data);
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setCurrentData(null);
    }
  };

  useEffect(() => {
    const handleDeviceSelect = (e: CustomEvent) => {
      const { deviceId } = e.detail;
      const end = (document.getElementById('datepicker-range-end') as HTMLInputElement)?.value;
      const start = moment(end).format('YYYY-MM-DD');
      fetchSleepData(deviceId, start, end);
    };

    const handleDateRangeChange = (e: CustomEvent) => {
      const { start, end } = e.detail;
      const deviceId = document.querySelector('[data-device-list] .bg-blue-50')?.getAttribute('data-device-id');
      if (deviceId) fetchSleepData(deviceId, start, end);
    };

    document.addEventListener('device-select', handleDeviceSelect as EventListener);
    document.addEventListener('daterange-change', handleDateRangeChange as EventListener);
    document.addEventListener('sleep-data-update', ((e: CustomEvent<SleepData[]>) =>
      setCurrentData(e.detail)) as EventListener);

    return () => {
      document.removeEventListener('device-select', handleDeviceSelect as EventListener);
      document.removeEventListener('daterange-change', handleDateRangeChange as EventListener);
      document.removeEventListener('sleep-data-update', ((e: CustomEvent<SleepData[]>) =>
        setCurrentData(e.detail)) as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !currentData?.length) {
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

    const processedData: Array<[number, number, number]> = [];
    const newSleepTimes = { ...initialSleepTimes };
    const activeStages = new Set<number>();

    const sortedData = [...currentData]
      .sort((a, b) => (a.sleepMotion[0]?.startTime || 0) - (b.sleepMotion[0]?.startTime || 0))
      .flatMap(
        (sleep) =>
          sleep.sleepMotion
            ?.sort((a, b) => a.startTime - b.startTime)
            .map((motion) => {
              const duration = (motion.endTime - motion.startTime) / 1000;
              const stage = Object.values(SLEEP_STAGES).find((s) => s.value === motion.value);

              if (stage) {
                processedData.push([motion.startTime, motion.value, motion.endTime]);
                activeStages.add(motion.value);

                switch (motion.value) {
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
                newSleepTimes.totalTime += duration;
              }
              return motion;
            }) || [],
      );

    setSleepTimes(newSleepTimes);

    const timeRange = processedData.reduce(
      (range, [time]) => ({
        min: Math.min(range.min, time),
        max: Math.max(range.max, time),
      }),
      { min: Infinity, max: -Infinity },
    );

    const activeStagesList = Object.values(SLEEP_STAGES).filter((stage) => activeStages.has(stage.value));

    const option: echarts.EChartsOption = {
      title: { text: 'Sleep Stages Distribution', left: 'center', top: 0 },
      tooltip: {
        show: true,
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';

          const [startTime, stageValue, endTime] = data;
          const stage = Object.values(SLEEP_STAGES).find((s) => s.value === stageValue)?.name || 'Unknown';

          // Format waktu dalam timezone lokal
          const timeStart = moment(startTime).format('DD/MM HH:mm:ss');
          const timeEnd = moment(endTime).format('DD/MM HH:mm:ss');
          const duration = moment.duration(endTime - startTime).asMinutes();

          let html = `<div style="font-size: 14px;">
            <p style="margin: 0;"><strong>Start:</strong> ${timeStart}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${timeEnd}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${Math.round(duration)} minutes</p>
            <p style="margin: 5px 0 0;"><strong>Stage:</strong> ${stage}</p>
          </div>`;

          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#6B7280', width: 1, type: 'dashed' },
        },
      },
      grid: { left: '5%', right: '5%', bottom: '15%', top: '15%', containLabel: true },
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
          textStyle: { color: '#6B7280' },
          start: 0,
          end: 100,
          zoomLock: false,
          moveOnMouseMove: true,
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
            const coordSys = params.coordSys as { x: number; y: number; width: number; height: number };
            const clippedShape = echarts.graphic.clipRectByRect(rectShape, coordSys);

            return (
              clippedShape && {
                type: 'rect',
                shape: clippedShape,
                style: { fill: activeStagesList[stageIndex].color },
              }
            );
          },
          encode: { x: [0, 2], y: 1 },
          data: processedData,
        },
      ],
      legend: {
        data: activeStagesList.map((stage) => ({
          name: stage.name,
          icon: 'rect',
          itemStyle: { color: stage.color },
        })),
        bottom: 40,
        textStyle: { color: '#4B5563' },
        selectedMode: false,
      },
    };

    chartInstance.current.setOption(option, true);
  }, [currentData]);

  const StageCard = ({ stage, time }: { stage: keyof typeof SLEEP_STAGES; time: number }) => (
    <div className={`p-2 sm:p-3 ${SLEEP_STAGES[stage].bgColor} rounded`}>
      <div
        className={`${SLEEP_STAGES[stage].textColor} text-sm sm:text-base truncate`}
        title={SLEEP_STAGES[stage].name}
      >
        {SLEEP_STAGES[stage].name}
      </div>
      <div className='text-sm sm:text-base truncate'>{formatDuration(time)}</div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg p-4 sm:p-6 ${className}`}>
      <div className='mb-4'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-left mb-4'>
          <div>
            <h5 className='mb-2 text-2xl font-bold text-black'>Sleep Montitoring</h5>
          </div>
        </div>
      </div>
      <div className='mb-4'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center mb-4'>
          <StageCard stage='AWAKE' time={sleepTimes.awakeTime} />
          <StageCard stage='EYE_MOVEMENT' time={sleepTimes.eyeMovementTime} />
          <StageCard stage='LIGHT_SLEEP' time={sleepTimes.lightSleepTime} />
          <StageCard stage='DEEP_SLEEP' time={sleepTimes.deepSleepTime} />
        </div>
      </div>
      <div ref={chartRef} className='w-full' style={{ height: 'min(400px, 50vh)' }} />

      <div className='mt-8'>
        <div className='flex justify-between items-center mb-4'>
          <h5 className='text-xl font-bold text-gray-900'>Additional Information</h5>
          <Switch.Group>
            <div className='flex items-center'>
              <Switch.Label className='mr-3 text-sm text-gray-600'>List View</Switch.Label>
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

        {currentData?.[0] &&
          (isListView ? (
            <div className='space-y-2'>
              {Object.entries({
                'Sleep Quality': { value: currentData[0].sleepQuality * 100, unit: '%' },
                'Total Sleep Time': { value: formatDuration(currentData[0].sleepTotalTime), unit: '' },
                'Heart Rate': {
                  value: `${currentData[0].minHeartRate}-${currentData[0].maxHeartRate}`,
                  unit: 'bpm',
                  avg: currentData[0].avgHeartRate,
                },
                'Blood Oxygen': {
                  value: `${currentData[0].minBloodOxygen}-${currentData[0].maxBloodOxygen}`,
                  unit: '%',
                  avg: currentData[0].avgBloodOxygen,
                },
              }).map(([label, data]) => (
                <div key={label} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <span className='text-gray-600'>{label}</span>
                  <span className='font-semibold'>
                    {data.value}
                    {data.unit && <span className='text-sm text-gray-500 ml-1'>{data.unit}</span>}
                    {data.avg && (
                      <span className='text-sm text-gray-500 ml-2'>
                        (avg: {Math.round(data.avg)}
                        {data.unit})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
              <InfoCard label='Sleep Quality' value={currentData[0].sleepQuality * 100} unit='%' />
              <InfoCard label='Total Sleep Time' value={formatDuration(currentData[0].sleepTotalTime)} />
              <InfoCard
                label='Heart Rate'
                value={`${currentData[0].minHeartRate}-${currentData[0].maxHeartRate}`}
                unit='bpm'
              />
              <InfoCard
                label='Blood Oxygen'
                value={`${currentData[0].minBloodOxygen}-${currentData[0].maxBloodOxygen}`}
                unit='%'
              />
            </div>
          ))}
      </div>
    </div>
  );
}
