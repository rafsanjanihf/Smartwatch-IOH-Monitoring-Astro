import type { SleepTimes } from '../utils/sleep';
import { formatDuration } from '../utils/sleep';

interface SleepTimeStatsProps {
  sleepTimes: SleepTimes;
  className?: string;
}

export default function SleepTimeStats({ sleepTimes, className }: SleepTimeStatsProps) {
  return (
    <div className={`grid grid-cols-4 gap-4 text-center ${className}`}>
      <div className='p-2 bg-orange-100 rounded'>
        <div className='text-orange-600'>Awake</div>
        <div>{formatDuration(sleepTimes.awakeTime)}</div>
      </div>
      <div className='p-2 bg-green-100 rounded'>
        <div className='text-green-600'>Eye Movement</div>
        <div>{formatDuration(sleepTimes.eyeMovementTime)}</div>
      </div>
      <div className='p-2 bg-blue-100 rounded'>
        <div className='text-blue-600'>Light Sleep</div>
        <div>{formatDuration(sleepTimes.lightSleepTime)}</div>
      </div>
      <div className='p-2 bg-purple-100 rounded'>
        <div className='text-purple-600'>Deep Sleep</div>
        <div>{formatDuration(sleepTimes.deepSleepTime)}</div>
      </div>
    </div>
  );
}
