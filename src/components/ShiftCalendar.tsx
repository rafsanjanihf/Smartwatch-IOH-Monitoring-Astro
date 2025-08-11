import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Device, UserShift } from '../types';

interface ShiftCalendarProps {
  devices: Device[];
}

interface ShiftData {
  [deviceId: string]: {
    [date: string]: 'fullday' | 'day' | 'night' | 'off';
  };
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ devices }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [shiftData, setShiftData] = useState<ShiftData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Load shift data for current month
  useEffect(() => {
    loadShiftData();
  }, [currentYear, currentMonth, selectedDevices]);

  const loadShiftData = async () => {
    if (selectedDevices.length === 0) return;
    
    setIsLoading(true);
    try {
      const newShiftData: ShiftData = {};
      
      for (const deviceId of selectedDevices) {
        try {
          // Get all shifts for this device
          const shifts = await api.getAllUserShifts({ device_id: deviceId });
          newShiftData[deviceId] = {};
          
          // Filter shifts for current month and year
          shifts.forEach((shift: UserShift) => {
            // Parse date safely without timezone issues
            const dateStr = shift.date.split('T')[0]; // Get YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-').map(Number);
            
            if (year === currentYear && month === currentMonth) {
              newShiftData[deviceId][dateStr] = shift.schedule_type;
            }
          });
        } catch (error) {
          console.error(`Failed to load shifts for device ${deviceId}:`, error);
          newShiftData[deviceId] = {};
        }
      }
      
      setShiftData(newShiftData);
    } catch (error) {
      console.error('Failed to load shift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getShiftBadge = (shiftType: string | undefined) => {
    if (!shiftType) return { text: '-', color: 'bg-gray-100 text-gray-400' };
    
    switch (shiftType) {
      case 'fullday':
        return { text: 'D', color: 'bg-blue-500 text-white' };
      case 'day':
        return { text: 'D', color: 'bg-yellow-500 text-white' };
      case 'night':
        return { text: 'N', color: 'bg-purple-500 text-white' };
      case 'off':
        return { text: 'OFF', color: 'bg-red-500 text-white' };
      default:
        return { text: '-', color: 'bg-gray-100 text-gray-400' };
    }
  };

  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Mgg', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAllDevices = () => {
    setSelectedDevices(devices.map(d => d.id));
  };

  const clearSelection = () => {
    setSelectedDevices([]);
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">📅 Calendar Shift</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentMonth(12);
                    setCurrentYear(prev => prev - 1);
                  } else {
                    setCurrentMonth(prev => prev - 1);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-lg font-medium min-w-[200px] text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </div>
              
              <button
                onClick={() => {
                  if (currentMonth === 12) {
                    setCurrentMonth(1);
                    setCurrentYear(prev => prev + 1);
                  } else {
                    setCurrentMonth(prev => prev + 1);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const today = new Date();
                setCurrentYear(today.getFullYear());
                setCurrentMonth(today.getMonth() + 1);
              }}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={loadShiftData}
              disabled={isLoading || selectedDevices.length === 0}
              className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Device Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">📱 Pilih Device untuk Ditampilkan</h3>
          <div className="space-x-2">
            <button
              onClick={selectAllDevices}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Pilih Semua
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Bersihkan
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {devices.map((device) => (
            <label key={device.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border">
              <input
                type="checkbox"
                checked={selectedDevices.includes(device.id)}
                onChange={() => handleDeviceToggle(device.id)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{device.name}</div>
                <div className="text-xs text-gray-500 truncate">{device.mac_address}</div>
              </div>
            </label>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          {selectedDevices.length} dari {devices.length} device dipilih
        </div>
      </div>

      {/* Calendar View */}
      {selectedDevices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-800">
              Shift Calendar - {monthNames[currentMonth - 1]} {currentYear}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 bg-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 border-r min-w-[200px]">
                    NAMA
                  </th>
                  {calendarDays.map((day, index) => (
                    <th key={index} className="px-2 py-3 text-center text-xs font-medium text-gray-700 border-r min-w-[50px]">
                      {day && (
                        <div>
                          <div className="text-xs text-gray-500">
                            {String(day).padStart(2, '0')}-{monthNames[currentMonth - 1].slice(0, 3)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {(() => {
                              // Calculate day of week safely without timezone issues
                              const date = new Date(currentYear, currentMonth - 1, day, 12, 0, 0); // Use noon to avoid DST issues
                              return dayNames[date.getDay()];
                            })()}
                          </div>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDevices.map((deviceId) => {
                  const device = devices.find(d => d.id === deviceId);
                  if (!device) return null;
                  
                  return (
                    <tr key={deviceId} className="border-b hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-3 border-r">
                        <div className="font-medium text-sm">{device.name}</div>
                        <div className="text-xs text-gray-500">{device.mac_address}</div>
                      </td>
                      {calendarDays.map((day, index) => {
                        if (!day) {
                          return <td key={index} className="px-2 py-3 border-r"></td>;
                        }
                        
                        const date = formatDate(day);
                        const shift = shiftData[deviceId]?.[date];
                        const badge = getShiftBadge(shift);
                        
                        return (
                          <td key={index} className="px-2 py-3 text-center border-r">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium min-w-[30px] ${badge.color}`}>
                              {badge.text}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {selectedDevices.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Pilih device untuk melihat calendar shift
            </div>
          )}
          
          {isLoading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memuat data shift...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-medium text-gray-800 mb-3">Keterangan:</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white">D</span>
            <span className="text-sm text-gray-600">Fullday</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-500 text-white">D</span>
            <span className="text-sm text-gray-600">Pagi</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-500 text-white">N</span>
            <span className="text-sm text-gray-600">Malam</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-500 text-white">OFF</span>
            <span className="text-sm text-gray-600">Libur</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400">-</span>
            <span className="text-sm text-gray-600">Tidak ada data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftCalendar;