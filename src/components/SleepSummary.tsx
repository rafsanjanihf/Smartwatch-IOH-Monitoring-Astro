import type { SleepData } from '../types';

interface SleepSummaryProps {
  healthData: SleepData[];
}

export default function SleepSummary({ healthData }: SleepSummaryProps) {
  // Get latest data
  const latestData = healthData[0] || {
    maxHeartRate: 0,
    minHeartRate: 0,
    avgHeartRate: 0,
    sleepQuality: 0,
    sleepTotalTime: 0,
  };

  // Format minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className='bg-white rounded-lg p-6'>
      <h3 className='text-lg font-semibold mb-6'>Summary</h3>
      <div className='space-y-4'>
        <div className='grid grid-cols-4 text-sm'>
          <div className='text-gray-500'>Monitoring</div>
          <div className='font-medium text-emerald-500'>High</div>
          <div className='font-medium text-red-500'>Low</div>
          <div className='font-medium'>Average</div>
        </div>

        <div className='grid grid-cols-4 text-sm'>
          <div className='text-gray-500'>Heart Rate</div>
          <div className='font-medium text-emerald-500'>
            {latestData.maxHeartRate} <span className='text-xs'>bpm</span>
          </div>
          <div className='font-medium text-red-500'>
            {latestData.minHeartRate} <span className='text-xs'>bpm</span>
          </div>
          <div className='font-medium'>
            {latestData.avgHeartRate.toFixed(1)} <span className='text-xs'>bpm</span>
          </div>
        </div>

        <div className='grid grid-cols-4 text-sm'>
          <div className='text-gray-500'>Sleep Quality</div>
          <div className='font-medium text-emerald-500'>
            {(latestData.sleepQuality * 100).toFixed(1)} <span className='text-xs'>%</span>
          </div>
          <div className='font-medium text-red-500'>-</div>
          <div className='font-medium'>-</div>
        </div>

        <div className='grid grid-cols-4 text-sm'>
          <div className='text-gray-500'>Sleep Duration</div>
          <div className='font-medium text-emerald-500'>{formatDuration(latestData.sleepTotalTime)}</div>
          <div className='font-medium text-red-500'>-</div>
          <div className='font-medium'>-</div>
        </div>
      </div>
    </div>
  );
}
