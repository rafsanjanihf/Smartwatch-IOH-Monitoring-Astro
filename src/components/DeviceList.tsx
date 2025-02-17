import { useState } from 'react';
import type { Device } from '../types';

interface DeviceListProps {
  devices: Device[];
  className?: string;
}

export default function DeviceList({ devices, className }: DeviceListProps) {
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(devices[0]?.id || null);

  const handleDeviceClick = (deviceId: string) => {
    setActiveDeviceId(deviceId);
    document.dispatchEvent(
      new CustomEvent('device-select', {
        detail: { deviceId },
      }),
    );
  };

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <h3 className='text-lg font-semibold mb-6'>List Devices</h3>
      <div className='space-y-4'>
        {devices.map((device, index) => (
          <div
            key={device.id}
            data-device-id={device.id}
            onClick={() => handleDeviceClick(device.id)}
            className={`p-4 rounded-lg cursor-pointer transition-colors
              ${
                activeDeviceId === device.id
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
          >
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='font-medium'>{device.name || 'Unnamed Device'}</h4>
                <p className='text-sm text-gray-600'>Operator {index + 1}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs
                ${device.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {device.status === 'published' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
