import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import { api } from '../utils/api';
import type { Health } from '../types';

interface HealthChartProps {
  selectedDeviceId?: string;
  selectedDate?: string;
  className?: string;
}

interface HealthStats {
  heartRate: { max: number; min: number; avg: number; data: { time: string; value: number | null; timestamp: Date }[] };
  bloodOxygen: { max: number; min: number; avg: number; data: { time: string; value: number | null; timestamp: Date }[] };
  stress: { max: number; min: number; avg: number; data: { time: string; value: number | null; timestamp: Date }[] };
}

const HealthChart: React.FC<HealthChartProps> = ({ 
  selectedDeviceId: initialDeviceId, 
  selectedDate: initialDate = moment().format('YYYY-MM-DD'),
  className = "" 
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(initialDeviceId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [healthData, setHealthData] = useState<Health[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    heartRate: { max: 0, min: 0, avg: 0, data: [] },
    bloodOxygen: { max: 0, min: 0, avg: 0, data: [] },
    stress: { max: 0, min: 0, avg: 0, data: [] }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync with props changes
  useEffect(() => {
    if (initialDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(initialDeviceId);
    }
  }, [initialDeviceId]);

  useEffect(() => {
    if (initialDate !== selectedDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const fetchHealthData = async (deviceId: string, date?: string) => {
    if (!deviceId) return;
    
    setIsLoading(true);
    try {
      let startDate, endDate;
      if (date) {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to today
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      }

      const data = await api.getHealthByDeviceId(deviceId, startDate.toISOString(), endDate.toISOString());

      setHealthData(data);
      processHealthData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processHealthData = (data: Health[]) => {
    // Process data by actual timestamps, not grouped by hour
    const heartRateData: { time: string; value: number | null; timestamp: Date }[] = [];
    const bloodOxygenData: { time: string; value: number | null; timestamp: Date }[] = [];
    const stressData: { time: string; value: number | null; timestamp: Date }[] = [];

    // Function to classify stress level
    const getStressLevel = (value: number | null): string => {
      if (value === null) return 'Unknown';
      if (value >= 75) return 'High Stress';
      if (value >= 50) return 'Medium Stress';
      if (value >= 25) return 'Low Stress';
      return 'Relaxed';
    };

    // Process each data point with actual timestamp
    data.forEach(item => {
      const startDate = new Date(item.start_time_utc);
      const rawValue = item.string_val.toString();
      const value = parseFloat(rawValue);
      
      // More robust value validation
      const isValidValue = !isNaN(value) && isFinite(value) && value !== null && value !== undefined;
      
      const timeString = startDate.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      const dataPoint = {
        time: timeString,
        value: isValidValue ? value : null,
        timestamp: startDate
      };

      switch (item.data_type) {
        case 'heart_rate':
          heartRateData.push(dataPoint);
          break;
        case 'blood_oxygen':
          bloodOxygenData.push(dataPoint);
          break;
        case 'pressure':
        case 'stress':
          stressData.push(dataPoint);
          break;
      }
    });

    // Sort data by timestamp
    heartRateData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    bloodOxygenData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    stressData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate stats from actual values
    const calculateStats = (data: { value: number | null }[]) => {
      const values = data.filter(d => d.value !== null).map(d => d.value as number);
      if (values.length === 0) return { max: 0, min: 0, avg: 0 };
      return {
        max: Math.max(...values),
        min: Math.min(...values),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      };
    };



    setHealthStats({
      heartRate: { ...calculateStats(heartRateData), data: heartRateData },
      bloodOxygen: { ...calculateStats(bloodOxygenData), data: bloodOxygenData },
      stress: { ...calculateStats(stressData), data: stressData }
    });
  };

  const getEChartsOption = () => {
    // Get the selected date or use today as default
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Set time range from 00:00 to 24:00 of the selected date
    const startTime = baseDate.getTime();
    const endTime = baseDate.getTime() + (24 * 60 * 60 * 1000); // Add 24 hours

    // Store reference to healthStats for tooltip
    const currentHealthStats = healthStats;

    // Prepare Heart Rate line data with actual timestamps
    const heartRateLineData = healthStats.heartRate.data
      .filter(d => d.value !== null)
      .map(d => [d.timestamp.getTime(), d.value]);

    // Prepare Blood Oxygen scatter data (>=95% and <95%)
    const bloodOxygenNormal: [number, number][] = [];
    const bloodOxygenLow: [number, number][] = [];
    
    healthStats.bloodOxygen.data.forEach(dataPoint => {
      if (dataPoint.value !== null) {
        if (dataPoint.value >= 95) {
          bloodOxygenNormal.push([dataPoint.timestamp.getTime(), dataPoint.value]);
        } else {
          bloodOxygenLow.push([dataPoint.timestamp.getTime(), dataPoint.value]);
        }
      }
    });

    // Prepare Stress scatter data with color coding
    const stressRelaxed: [number, number][] = [];
    const stressLow: [number, number][] = [];
    const stressMedium: [number, number][] = [];
    const stressHigh: [number, number][] = [];
    
    healthStats.stress.data.forEach(dataPoint => {
      if (dataPoint.value !== null) {
        const point: [number, number] = [dataPoint.timestamp.getTime(), dataPoint.value];
        if (dataPoint.value >= 75) {
          stressHigh.push(point);
        } else if (dataPoint.value >= 50) {
          stressMedium.push(point);
        } else if (dataPoint.value >= 25) {
          stressLow.push(point);
        } else {
          stressRelaxed.push(point);
        }
      }
    });





    return {
      title: {
        text: 'Health Monitoring Chart',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          if (!params || params.length === 0) return '';
          
          const currentTime = params[0]?.axisValue || params[0]?.value?.[0];
          const datetime = new Date(currentTime).toLocaleString('id-ID', { 
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          
          let result = `<strong>${datetime}</strong><br/>`;
          
          // Function to interpolate value between two data points
           const interpolateValue = (data: any[], targetTime: number) => {
             if (!data || data.length === 0) return null;
             
             // Sort data by timestamp
             const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
             
             // Find the two closest points that bracket the target time
             let beforePoint = null;
             let afterPoint = null;
             
             for (let i = 0; i < sortedData.length; i++) {
               const pointTime = sortedData[i].timestamp.getTime();
               
               if (pointTime <= targetTime) {
                 beforePoint = sortedData[i];
               }
               if (pointTime >= targetTime && !afterPoint) {
                 afterPoint = sortedData[i];
                 break;
               }
             }
             
             // If we have exact match
             if (beforePoint && beforePoint.timestamp.getTime() === targetTime) {
               return beforePoint;
             }
             
             // If we have both before and after points, interpolate
             if (beforePoint && afterPoint && beforePoint !== afterPoint) {
               const beforeTime = beforePoint.timestamp.getTime();
               const afterTime = afterPoint.timestamp.getTime();
               const beforeValue = beforePoint.value;
               const afterValue = afterPoint.value;
               
               // Linear interpolation
               const ratio = (targetTime - beforeTime) / (afterTime - beforeTime);
               const interpolatedValue = beforeValue + (afterValue - beforeValue) * ratio;
               
               return {
                  ...beforePoint,
                  value: Math.round(interpolatedValue), // Round to whole number
                  interpolated: true
                };
             }
             
             // If we only have one point, return the closest one
             if (beforePoint) return beforePoint;
             if (afterPoint) return afterPoint;
             
             return null;
           };
           
           // Function to find closest value by time (fallback for non-interpolated data)
           const findClosestValue = (data: any[], targetTime: number) => {
             if (!data || data.length === 0) return null;
             
             let closest = data[0];
             let minDiff = Math.abs(data[0].timestamp.getTime() - targetTime);
             
             for (let i = 1; i < data.length; i++) {
               const diff = Math.abs(data[i].timestamp.getTime() - targetTime);
               if (diff < minDiff) {
                 minDiff = diff;
                 closest = data[i];
               }
             }
             
             return closest;
           };
          
          // Get values for each metric (interpolated for blood oxygen, closest for others)
            const heartRateData = findClosestValue(currentHealthStats.heartRate.data, currentTime);
            const bloodOxygenData = interpolateValue(currentHealthStats.bloodOxygen.data, currentTime);
            const stressData = findClosestValue(currentHealthStats.stress.data, currentTime);
          
          // Display heart rate
          if (heartRateData && heartRateData.value !== null) {
            result += `❤️ Heart rate: ${heartRateData.value} bpm<br/>`;
          }
          
          // Display blood oxygen
            if (bloodOxygenData && bloodOxygenData.value !== null) {
              result += `🫁 Blood oxygen: ${bloodOxygenData.value}%<br/>`;
            }
          
          // Display stress level
          if (stressData && stressData.value !== null) {
            const getStressLevel = (value: number): string => {
              if (value >= 75) return 'High Stress';
              if (value >= 50) return 'Medium Stress';
              if (value >= 25) return 'Low Stress';
              return 'Relaxed';
            };
            const stressLevel = getStressLevel(stressData.value);
            result += `🧠 Stress: ${stressData.value} (${stressLevel})<br/>`;
          }
          
          return result;
        }
      },
      legend: {
        data: ['Heart Rate', 'Blood Oxygen', 'Stress Level'],
        top: 30
      },
      grid: {
        left: '9%',
        right: '9%',
        bottom: '15%',
        top: '20%'
      },
      xAxis: {
        type: 'time',
        name: 'Waktu (00:00 - 24:00)',
        nameLocation: 'middle',
        nameGap: 30,
        min: startTime,
        max: endTime,
        axisLabel: {
          rotate: 45,
          formatter: function(value: any) {
            const date = new Date(value);
            return date.toLocaleTimeString('id-ID', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
          }
        },
        splitNumber: 12, // Show approximately 12 time labels (every 2 hours)
        minorTick: {
          show: true
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Heart Rate (bpm)',
          position: 'left',
          min: 40,
          max: 220,
          axisLabel: {
            formatter: '{value} bpm'
          }
        },
        {
          type: 'value',
          name: '%',
          position: 'right',
          min: 70,
          max: 100,
          axisLabel: {
            formatter: '{value}%'
          }
        },
        {
          type: 'value',
          name: 'Pressure',
          position: 'right',
          offset: 40,
          min: function(value: any) {
            // Dynamic min based on data, with some padding
            return Math.max(0, Math.floor(value.min - 10));
          },
          max: function(value: any) {
            // Dynamic max based on data, with some padding
            return Math.ceil(value.max + 10);
          },
          axisLabel: {
            formatter: '{value}'
          }
        }
      ],
      series: [
        // Heart Rate Line Chart
        {
          name: 'Heart Rate',
          type: 'line',
          yAxisIndex: 0,
          data: heartRateLineData,
          lineStyle: {
            color: '#EF4444',
            width: 2
          },
          itemStyle: {
            color: '#EF4444'
          },
          symbol: 'circle',
          symbolSize: 6,
          connectNulls: false
        },
        // Blood Oxygen Normal (≥95%)
        {
          name: 'Blood Oxygen',
          type: 'scatter',
          yAxisIndex: 1,
          data: bloodOxygenNormal,
          itemStyle: {
            color: '#10B981'
          },
          symbolSize: 8
        },
        // Blood Oxygen Scatter (Low <95%)
          {
            name: 'Blood Oxygen',
            type: 'scatter',
            yAxisIndex: 1,
            data: bloodOxygenLow,
            itemStyle: {
              color: '#ff4444'
            },
            symbolSize: 8,
            legendHoverLink: false
          },
          // Stress Levels
          {
            name: 'Stress Level',
            type: 'scatter',
            yAxisIndex: 2,
            data: stressRelaxed,
            itemStyle: {
              color: '#4ade80' // green-400
            },
            symbol: 'diamond',
            symbolSize: 10
          },
          {
            name: 'Stress Level',
            type: 'scatter',
            yAxisIndex: 2,
            data: stressLow,
            itemStyle: {
              color: '#facc15' // yellow-400
            },
            symbol: 'diamond',
            symbolSize: 10,
            legendHoverLink: false
          },
          {
            name: 'Stress Level',
            type: 'scatter',
            yAxisIndex: 2,
            data: stressMedium,
            itemStyle: {
              color: '#fb923c' // orange-400
            },
            symbol: 'diamond',
            symbolSize: 10,
            legendHoverLink: false
          },
          {
            name: 'Stress Level',
            type: 'scatter',
            yAxisIndex: 2,
            data: stressHigh,
            itemStyle: {
              color: '#f87171' // red-400
            },
            symbol: 'diamond',
            symbolSize: 10,
            legendHoverLink: false
          }
      ]
    };
  };

  useEffect(() => {
    if (selectedDeviceId) {
      fetchHealthData(selectedDeviceId, selectedDate);
    }
  }, [selectedDeviceId, selectedDate]);

  // No need for useEffect with ReactECharts as it handles updates automatically

  // Listen for device selection changes
  useEffect(() => {
    const handleDeviceSelect = (event: CustomEvent) => {
      const deviceId = event.detail.deviceId;
      if (deviceId) {
        setSelectedDeviceId(deviceId);
        fetchHealthData(deviceId, selectedDate);
      }
    };

    const handleDateChange = (event: CustomEvent) => {
      const date = event.detail;
      setSelectedDate(date);
      if (selectedDeviceId) {
        fetchHealthData(selectedDeviceId, date);
      }
    };

    document.addEventListener('device-select', handleDeviceSelect as EventListener);
    document.addEventListener('date-change', handleDateChange as EventListener);

    return () => {
      document.removeEventListener('device-select', handleDeviceSelect as EventListener);
      document.removeEventListener('date-change', handleDateChange as EventListener);
    };
  }, [selectedDeviceId, selectedDate]);

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Health Tracking</h3>
        {selectedDate && (
          <span className="text-sm text-gray-500">
            {new Date(selectedDate).toLocaleDateString('id-ID')}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Memuat data kesehatan...
          </div>
        </div>
      ) : healthData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {selectedDeviceId ? 'Tidak ada data kesehatan untuk tanggal yang dipilih' : 'Pilih device untuk melihat data kesehatan'}
        </div>
      ) : (
        <>
          <div className="h-[300px]">
            <ReactECharts option={getEChartsOption()} style={{ height: '100%', width: '100%' }} />
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {healthStats.heartRate.data.some(d => d.value !== null) && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Heart Rate</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-600">Max:</span>
                    <span className="font-medium">{healthStats.heartRate.max} bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Min:</span>
                    <span className="font-medium">{healthStats.heartRate.min} bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Avg:</span>
                    <span className="font-medium">{healthStats.heartRate.avg} bpm</span>
                  </div>
                </div>
              </div>
            )}

            {healthStats.bloodOxygen.data.some(d => d.value !== null) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Blood Oxygen</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Max:</span>
                    <span className="font-medium">{healthStats.bloodOxygen.max}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Min:</span>
                    <span className="font-medium">{healthStats.bloodOxygen.min}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Avg:</span>
                    <span className="font-medium">{healthStats.bloodOxygen.avg}%</span>
                  </div>
                </div>
              </div>
            )}

            {healthStats.stress.data.some(d => d.value !== null) && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Stress</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-600">Max:</span>
                    <span className="font-medium">{healthStats.stress.max} ({(() => {
                      const value = healthStats.stress.max;
                      if (value >= 75) return 'High Stress';
                      if (value >= 50) return 'Medium Stress';
                      if (value >= 25) return 'Low Stress';
                      return 'Relaxed';
                    })()})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Min:</span>
                    <span className="font-medium">{healthStats.stress.min} ({(() => {
                      const value = healthStats.stress.min;
                      if (value >= 75) return 'High Stress';
                      if (value >= 50) return 'Medium Stress';
                      if (value >= 25) return 'Low Stress';
                      return 'Relaxed';
                    })()})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Avg:</span>
                    <span className="font-medium">{healthStats.stress.avg} ({(() => {
                      const value = healthStats.stress.avg;
                      if (value >= 75) return 'High Stress';
                      if (value >= 50) return 'Medium Stress';
                      if (value >= 25) return 'Low Stress';
                      return 'Relaxed';
                    })()})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HealthChart;