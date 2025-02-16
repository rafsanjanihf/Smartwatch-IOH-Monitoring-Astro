interface SleepData {
  id: string;
  sleepQuality: number;
  sleepTotalTime: number;
  deepSleepTotalTime: number;
  simpleSleepTotalTime: number;
  fastEyeTotalTime: number;
  maxHeartRate: number;
  minHeartRate: number;
  avgHeartRate: number;
  startReal: string;
  endReal: string;
}

interface SleepAnalyticsProps {
  sleepData: SleepData[];
}

export default function SleepAnalytics({ sleepData }: SleepAnalyticsProps) {
  // Calculate averages from last 7 days data
  const recentData = sleepData.slice(0, 7);
  const averages = recentData.reduce(
    (acc, curr) => ({
      totalSleep: acc.totalSleep + curr.sleepTotalTime,
      quality: acc.quality + curr.sleepQuality,
      heartRate: acc.heartRate + curr.avgHeartRate,
      count: acc.count + 1,
    }),
    { totalSleep: 0, quality: 0, heartRate: 0, count: 0 },
  );

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className='bg-white rounded-lg p-6'>
      <h3 className='text-lg font-semibold mb-6'>Sleep Analytics (Last 7 Days)</h3>

      <div className='grid grid-cols-3 gap-6'>
        <div className='text-center'>
          <p className='text-sm text-gray-500 mb-1'>Average Sleep Duration</p>
          <p className='text-2xl font-bold text-blue-600'>{formatDuration(averages.totalSleep / averages.count)}</p>
        </div>

        <div className='text-center'>
          <p className='text-sm text-gray-500 mb-1'>Average Sleep Quality</p>
          <p className='text-2xl font-bold text-green-600'>{((averages.quality / averages.count) * 100).toFixed(1)}%</p>
        </div>

        <div className='text-center'>
          <p className='text-sm text-gray-500 mb-1'>Average Heart Rate</p>
          <p className='text-2xl font-bold text-red-600'>{(averages.heartRate / averages.count).toFixed(1)} bpm</p>
        </div>
      </div>

      <div className='mt-6'>
        <h4 className='text-sm font-medium text-gray-700 mb-4'>Recent Sleep Pattern</h4>
        <div className='space-y-2'>
          {recentData.map((day) => (
            <div key={day.id} className='flex items-center justify-between'>
              <span className='text-sm text-gray-600'>
                {new Date(parseInt(day.startReal) * 1000).toLocaleDateString()}
              </span>
              <div className='flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden'>
                <div className='h-full bg-blue-500 rounded-full' style={{ width: `${day.sleepQuality * 100}%` }} />
              </div>
              <span className='text-sm font-medium'>{formatDuration(day.sleepTotalTime)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
