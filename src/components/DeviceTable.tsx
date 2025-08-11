import { useState, useEffect, useMemo } from 'react';
import type { Device } from '../types';

interface DeviceTableProps {
  devices: Device[];
  id?: string;
}

export default function DeviceTable({ devices: initialDevices, id }: DeviceTableProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Memoized filtered and sorted devices
  const filteredDevices = useMemo(() => {
    let result = [...devices];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (device) =>
          (device.name?.toLowerCase() || '').includes(term) || 
          (device.email_pic?.toLowerCase() || '').includes(term) ||
          (device.idEmployee?.toLowerCase() || '').includes(term),
      );
    }

    if (statusFilter) {
      result = result.filter((device) => device.status === statusFilter);
    }

    // Sort devices: 
    // 1. Devices with idEmployee sorted by idEmployee (ascending)
    // 2. Devices without idEmployee sorted by name (alphabetical)
    result.sort((a, b) => {
      const hasIdA = a.idEmployee && a.idEmployee.trim() !== '';
      const hasIdB = b.idEmployee && b.idEmployee.trim() !== '';

      // If both have idEmployee, sort by idEmployee
      if (hasIdA && hasIdB) {
        return a.idEmployee!.localeCompare(b.idEmployee!);
      }

      // If only A has idEmployee, A comes first
      if (hasIdA && !hasIdB) {
        return -1;
      }

      // If only B has idEmployee, B comes first
      if (!hasIdA && hasIdB) {
        return 1;
      }

      // If neither has idEmployee, sort by name alphabetically
      const nameA = (a.name || 'Unnamed Device').toLowerCase();
      const nameB = (b.name || 'Unnamed Device').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [devices, searchTerm, statusFilter]);

  // Handle search with debounce
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
  };

  // Handle status filter
  const handleStatusFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };

  useEffect(() => {
    const handleUpdate = (event: CustomEvent<Device[]>) => {
      setDevices(event.detail);
    };

    const eventListener = handleUpdate as EventListener;
    const tableElement = document.getElementById(id || '');

    if (tableElement) {
      tableElement.addEventListener('update-devices', eventListener);

      return () => {
        tableElement.removeEventListener('update-devices', eventListener);
      };
    }
  }, [id]);

  return (
    <div className='space-y-4'>
      {/* Search and Filter Controls */}
      <div className='p-4 border-b'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex flex-col sm:flex-row gap-4 w-full sm:w-auto'>
            <div className='relative w-full sm:w-64'>
              <input
                type='text'
                value={searchTerm}
                onChange={handleSearch}
                placeholder='Search devices...'
                className='w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <svg
                className='w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className='w-full sm:w-auto border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>All Status</option>
              <option value='published'>Active</option>
              <option value='draft'>Inactive</option>
            </select>
          </div>
          <button className='w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'>
            Add Device
          </button>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className='overflow-x-auto'>
        <div className='inline-block min-w-full align-middle'>
          <div className='overflow-hidden'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th
                    scope='col'
                    className='hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    ID Employee / NRP
                  </th>
                  <th
                    scope='col'
                    className='px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Name
                  </th>
                  <th
                    scope='col'
                    className='hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    MAC
                  </th>
                  <th
                    scope='col'
                    className='px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Status
                  </th>
                  <th
                    scope='col'
                    className='hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Email
                  </th>
                  <th
                    scope='col'
                    className='px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredDevices.map((device) => (
                  <tr key={device.id} className='hover:bg-gray-50'>
                    <td className='hidden sm:table-cell px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900 truncate max-w-[150px]' title={device.idEmployee || 'ID Not Set'}>
                        {device.idEmployee || 'ID Not Set'}
                      </div>
                    </td>
                    <td className='px-3 sm:px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='w-8 sm:w-10 h-8 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                          <span className='text-gray-600 font-medium'>{device.name?.charAt(0) || 'D'}</span>
                        </div>
                        <div className='ml-3 sm:ml-4 min-w-0 flex-1'>
                          <div className='text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs'>
                            {device.name || 'Unnamed Device'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='hidden lg:table-cell px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900 truncate max-w-[150px]' title={device.mac}>
                        {device.mac}
                      </div>
                    </td>
                    <td className='px-3 sm:px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {device.status === 'published' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='hidden md:table-cell px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-500 truncate max-w-[200px]' title={device.email_pic || '-'}>
                        {device.email_pic || '-'}
                      </div>
                    </td>
                    <td className='px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <a href={`/devices/${device.id}`} className='text-blue-600 hover:text-blue-900'>
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className='px-3 sm:px-6 py-4 border-t'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='text-sm text-gray-500 w-full sm:w-auto'>
            Showing {filteredDevices.length} of {devices.length} results
          </div>
          <div className='flex space-x-2 w-full sm:w-auto justify-center sm:justify-end'>
            <button className='px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50' disabled>
              Previous
            </button>
            <button className='px-3 py-1 border rounded bg-blue-50 text-blue-600'>1</button>
            <button className='px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50' disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
