import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Device, UserShift } from '../types';
import { Datepicker } from 'flowbite-datepicker';
import ShiftCalendar from './ShiftCalendar';

interface ShiftTemplate {
  id: string;
  name: string;
  description: string;
  shifts: {
    [deviceId: string]: 'fullday' | 'day' | 'night' | 'off';
  };
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ShiftSettingsProps {
  devices: Device[];
}

const ShiftSettings: React.FC<ShiftSettingsProps> = ({ devices }) => {

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [bulkShiftType, setBulkShiftType] = useState<'fullday' | 'day' | 'night' | 'off'>('fullday');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activeTab, setActiveTab] = useState<'bulk' | 'template' | 'individual'>('bulk');
  const [quickDateTemplate, setQuickDateTemplate] = useState<string>('');
  const [deviceSearchTerm, setDeviceSearchTerm] = useState<string>('');

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Helper function to format date without timezone issues
  const formatDateSafe = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize datepickers
  useEffect(() => {
    const initializeDatepickers = () => {
      const startDateElement = document.getElementById('datepicker-start-date');
      const endDateElement = document.getElementById('datepicker-end-date');

      if (startDateElement && endDateElement) {
        // Destroy existing datepickers if they exist
        const existingStartPicker = (startDateElement as any)._datepicker;
        const existingEndPicker = (endDateElement as any)._datepicker;
        
        if (existingStartPicker) {
          existingStartPicker.destroy();
        }
        if (existingEndPicker) {
          existingEndPicker.destroy();
        }

        const pickerOptions = {
          format: 'yyyy-mm-dd',
          autohide: true
        };

        const startPicker = new Datepicker(startDateElement, pickerOptions);
        const endPicker = new Datepicker(endDateElement, pickerOptions);

        // Event listeners for date changes
        startDateElement.addEventListener('changeDate', (e: any) => {
          const selectedDate = e.detail.date;
          if (selectedDate) {
            const formattedDate = formatDateSafe(selectedDate);
            setDateRange(prev => ({ ...prev, startDate: formattedDate }));
            setQuickDateTemplate('');
          }
        });

        endDateElement.addEventListener('changeDate', (e: any) => {
          const selectedDate = e.detail.date;
          if (selectedDate) {
            const formattedDate = formatDateSafe(selectedDate);
            setDateRange(prev => ({ ...prev, endDate: formattedDate }));
            setQuickDateTemplate('');
          }
        });

        // Store datepicker instances for cleanup
        (startDateElement as any)._datepicker = startPicker;
        (endDateElement as any)._datepicker = endPicker;

        // Cleanup function
        return () => {
          if (startPicker) startPicker.destroy();
          if (endPicker) endPicker.destroy();
        };
      }
    };

    // Only initialize datepickers when bulk tab is active
    if (activeTab === 'bulk') {
      // Delay initialization to ensure DOM is ready
      const timer = setTimeout(initializeDatepickers, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]); // Re-initialize when activeTab changes

  const loadTemplates = () => {
    // Load templates from localStorage or use default templates
    const savedTemplates = localStorage.getItem('shiftTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Default templates
      const defaultTemplates: ShiftTemplate[] = [
        {
          id: 'weekday',
          name: 'Weekday Standard',
          description: 'Template untuk hari kerja (Senin-Jumat)',
          shifts: {}
        },
        {
          id: 'weekend',
          name: 'Weekend',
          description: 'Template untuk akhir pekan',
          shifts: {}
        }
      ];
      setTemplates(defaultTemplates);
    }
  };

  const saveTemplates = (newTemplates: ShiftTemplate[]) => {
    localStorage.setItem('shiftTemplates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start + 'T00:00:00'); // Add time to avoid timezone issues
    const endDate = new Date(end + 'T00:00:00');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    
    return dates;
  };

  const handleBulkAssignment = async () => {
    if (!dateRange.startDate || !dateRange.endDate || selectedDevices.length === 0) {
      showNotification('Pilih tanggal dan device terlebih dahulu', 'error');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      const dates = generateDateRange(dateRange.startDate, dateRange.endDate);
      
      for (const date of dates) {
        for (const deviceId of selectedDevices) {
          try {
            // Coba CREATE terlebih dahulu
            await api.createUserShift({
              device_id: deviceId,
              date: date,
              schedule_type: bulkShiftType
            });
            successCount++;
          } catch (createError) {
            // Jika CREATE gagal, coba UPDATE
            try {
              await api.updateUserShift({
                device_id: deviceId,
                date: date,
                schedule_type: bulkShiftType
              });
              successCount++;
            } catch (updateError) {
              console.error(`Failed to create/update shift for device ${deviceId} on ${date}:`, updateError);
              errorCount++;
            }
          }
        }
      }

      if (successCount > 0) {
        showNotification(`Berhasil mengatur ${successCount} shift ${bulkShiftType} untuk ${selectedDevices.length} device dari ${dateRange.startDate} sampai ${dateRange.endDate}${errorCount > 0 ? `. ${errorCount} gagal diproses.` : ''}`, 'success');
        setSelectedDevices([]);
      } else {
        showNotification('Gagal mengatur shift. Periksa koneksi dan coba lagi.', 'error');
      }
    } catch (error) {
      showNotification('Gagal mengatur shift', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateAssignment = async () => {
    if (!selectedTemplate || !dateRange.startDate || !dateRange.endDate) {
      showNotification('Pilih template dan tanggal terlebih dahulu', 'error');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      const dates = generateDateRange(dateRange.startDate, dateRange.endDate);
      
      for (const date of dates) {
        for (const [deviceId, shiftType] of Object.entries(template.shifts)) {
          try {
            // Coba CREATE terlebih dahulu
            await api.createUserShift({
              device_id: deviceId,
              date: date,
              schedule_type: shiftType
            });
            successCount++;
          } catch (createError) {
            // Jika CREATE gagal, coba UPDATE
            try {
              await api.updateUserShift({
                device_id: deviceId,
                date: date,
                schedule_type: shiftType
              });
              successCount++;
            } catch (updateError) {
              console.error(`Failed to create/update shift for device ${deviceId} on ${date}:`, updateError);
              errorCount++;
            }
          }
        }
      }

      if (successCount > 0) {
        showNotification(`Template "${template.name}" berhasil diterapkan. ${successCount} shift berhasil diatur${errorCount > 0 ? `, ${errorCount} gagal diproses` : ''}`, 'success');
      } else {
        showNotification('Gagal menerapkan template', 'error');
      }
    } catch (error) {
      showNotification('Gagal menerapkan template', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceSelection = (deviceId: string) => {
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

  const applyQuickDateTemplate = (template: string) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    // Helper function to format date safely
    const formatDateSafe = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (template) {
      case 'today':
        startDate = endDate = formatDateSafe(today);
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = endDate = formatDateSafe(tomorrow);
        break;
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        startDate = formatDateSafe(startOfWeek);
        endDate = formatDateSafe(endOfWeek);
        break;
      case 'next_week':
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() - today.getDay() + 8); // Next Monday
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6); // Next Sunday
        startDate = formatDateSafe(nextWeekStart);
        endDate = formatDateSafe(nextWeekEnd);
        break;
      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDate = formatDateSafe(startOfMonth);
        endDate = formatDateSafe(endOfMonth);
        break;
      case 'next_month':
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        startDate = formatDateSafe(nextMonthStart);
        endDate = formatDateSafe(nextMonthEnd);
        break;
    }

    setDateRange({ startDate, endDate });
     setQuickDateTemplate(template);
   };

   const filteredDevices = devices.filter(device => {
     const searchTerm = deviceSearchTerm.toLowerCase();
     const deviceName = device.name?.toLowerCase() || '';
     
     return deviceName.includes(searchTerm);
   });

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 sm:p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span className="text-sm sm:text-base">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 sm:ml-4 text-gray-400 hover:text-gray-600 text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-1 sm:mb-3">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4 lg:space-x-8 lg:gap-0">
            {[
              { id: 'bulk', label: 'Shift Management', icon: '📋' },
              { id: 'template', label: 'Template Management', icon: '📝' },
              // { id: 'individual', label: 'Individual Setting', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2 sm:px-3 lg:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1 sm:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'bulk' ? 'Shift' : tab.id === 'template' ? 'Template' : 'Individual'}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Bulk Assignment Tab */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <h1 className="sm:text-lg font-bold mb-3 sm:mb-4">Shift Management</h1>
          {/* Bulk Assignment Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Date Range Selection */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📅 Pilih Rentang Tanggal</h3>
              
              {/* Quick Date Templates */}
              <div className="mb-3 sm:mb-4">
                {/* <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Template Cepat</label> */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'tomorrow', label: 'Besok' },
                    { id: 'this_week', label: 'Minggu Ini' },
                    { id: 'next_week', label: 'Minggu Depan' },
                    { id: 'this_month', label: 'Bulan Ini' },
                    { id: 'next_month', label: 'Bulan Depan' }
                  ].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyQuickDateTemplate(template.id)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs rounded-md border transition-colors ${
                        quickDateTemplate === template.id
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Date Range - 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                        </svg>
                      </div>
                      <input
                        id="datepicker-start-date"
                        type="text"
                        value={dateRange.startDate}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5"
                        placeholder="Pilih tanggal mulai"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Sampai dengan</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                        </svg>
                      </div>
                      <input
                        id="datepicker-end-date"
                        type="text"
                        value={dateRange.endDate}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5"
                        placeholder="Pilih tanggal akhir"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                
                {/* Shift Type */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Tipe Shift</label>
                  <select
                    value={bulkShiftType}
                    onChange={(e) => setBulkShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  >
                    <option value="fullday">🔵 Fullday</option>
                    <option value="day">🟡 Pagi</option>
                    <option value="night">🟣 Malam</option>
                    <option value="off">🔴 OFF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Device Selection */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold">📱 Pilih Device</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllDevices}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              {/* Search Device */}
              <div className="mb-3 sm:mb-4">
                <input
                  type="text"
                  placeholder="Cari device berdasarkan nama..."
                  value={deviceSearchTerm}
                  onChange={(e) => setDeviceSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>

              {/* Selected Devices Summary */}
              {selectedDevices.length > 0 && (
                <div className="mb-3 sm:mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs sm:text-sm text-blue-800 font-medium mb-2">
                    {selectedDevices.length} device terpilih:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDevices.slice(0, 3).map(deviceId => {
                      const device = devices.find(d => d.id === deviceId);
                      return device ? (
                        <span key={deviceId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          <span className="truncate max-w-20 sm:max-w-none">{device.name}</span>
                          <button
                            onClick={() => handleDeviceSelection(deviceId)}
                            className="ml-1 text-blue-600 hover:text-blue-800 flex-shrink-0"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                    {selectedDevices.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                        +{selectedDevices.length - 3} lainnya
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-1 sm:space-y-2">
                {filteredDevices.map((device) => (
                  <label key={device.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceSelection(device.id)}
                      className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                    />
                    <div className="font-medium text-xs sm:text-sm truncate">{device.name || 'Unknown Device'}</div>
                  </label>
                ))}
              </div>
              
              {filteredDevices.length === 0 && deviceSearchTerm && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Tidak ada device yang ditemukan untuk "{deviceSearchTerm}"
                </div>
              )}
              
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                {selectedDevices.length} dari {devices.length} device dipilih
              </div>
            </div>

            {/* Preview Summary */}
            <div className="lg:col-span-2 xl:col-span-1">
              {dateRange.startDate && dateRange.endDate && selectedDevices.length > 0 && (
                <div className="lg:col-span-2 bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">📋 Preview Perubahan</h4>
                  <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                    <p><strong>Periode:</strong> {dateRange.startDate} sampai {dateRange.endDate} ({generateDateRange(dateRange.startDate, dateRange.endDate).length} hari)</p>
                    <p><strong>User:</strong> {selectedDevices.length} user terpilih</p>
                    <p><strong>Shift diterapkan:</strong> {bulkShiftType === 'fullday' ? '🔵 Fullday' : bulkShiftType === 'day' ? '🟡 Pagi' : bulkShiftType === 'night' ? '🟣 Malam' : '🔴 OFF'}</p>
                    <p><strong>Total Assignment:</strong> {selectedDevices.length * generateDateRange(dateRange.startDate, dateRange.endDate).length} schedule entries</p>
                  </div>
                </div>
              )}
            </div>

            {/* Apply Button */}
            <div className="lg:col-span-3">
              <button
                onClick={handleBulkAssignment}
                disabled={isLoading || !dateRange.startDate || !dateRange.endDate || selectedDevices.length === 0}
                className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Mengatur Shift...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Terapkan Shift</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Calendar View Section */}
          <h1 className="sm:text-lg font-bold mb-3 sm:mb-4">Scheduled View</h1>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold">📅 Calendar View</h3>
              <div className="text-xs sm:text-sm text-gray-600">
                Visualisasi schedule shift untuk semua device
              </div>
            </div>
            <div className="overflow-x-auto">
              <ShiftCalendar devices={devices} />
            </div>
          </div>
        </div>
      )}

      {/* Template Management Tab */}
      {activeTab === 'template' && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📝 Template Management</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Fitur template akan segera tersedia. Anda dapat membuat template shift untuk memudahkan pengaturan berulang.</p>
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-sm sm:text-base">Fitur yang akan datang:</h4>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              <li>• Buat template shift custom</li>
              <li>• Simpan kombinasi shift untuk berbagai skenario</li>
              <li>• Terapkan template ke rentang tanggal</li>
              <li>• Import/export template</li>
            </ul>
          </div>
        </div>
      )}

      {/* Individual Setting Tab */}
      {activeTab === 'individual' && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">⚙️ Individual Setting</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Untuk pengaturan individual device, silakan gunakan fitur edit pada halaman Device Management.</p>
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="flex items-start sm:items-center">
              <div className="text-blue-600 mr-2 sm:mr-3 flex-shrink-0">💡</div>
              <div>
                <h4 className="font-medium text-blue-800 text-sm sm:text-base">Tips:</h4>
                <p className="text-xs sm:text-sm text-blue-700">Klik pada badge schedule di halaman Device Management untuk mengubah shift individual device.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSettings;