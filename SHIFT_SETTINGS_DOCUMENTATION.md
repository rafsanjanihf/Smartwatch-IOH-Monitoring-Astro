# Shift Settings - Dokumentasi Fitur

## Overview
Fitur Shift Settings adalah halaman khusus untuk mengelola pengaturan shift secara bulk dan efisien. Fitur ini memungkinkan administrator untuk mengatur shift multiple device sekaligus dengan template tanggal yang mudah digunakan.

## 🚀 Fitur Utama

### 1. **Bulk Assignment**
Mengatur shift untuk multiple device sekaligus dalam rentang tanggal tertentu.

#### Fitur:
- ✅ **Quick Date Templates**: Template cepat untuk pemilihan tanggal
  - Hari Ini
  - Besok  
  - Minggu Ini
  - Minggu Depan
  - Bulan Ini
  - Bulan Depan

- ✅ **Device Selection**: 
  - Search device berdasarkan nama atau MAC address
  - Select all / Clear selection
  - Preview device terpilih dengan tag
  - Counter device terpilih

- ✅ **Shift Types**: 
  - 🔵 Fullday
  - 🟡 Pagi
  - 🟣 Malam
  - 🔴 OFF

- ✅ **Preview Summary**: Menampilkan ringkasan sebelum apply
  - Periode tanggal
  - Jumlah device
  - Tipe shift
  - Total schedule entries

### 2. **Template Management** (Coming Soon)
Fitur untuk membuat dan mengelola template shift custom.

#### Planned Features:
- Buat template shift custom
- Simpan kombinasi shift untuk berbagai skenario
- Terapkan template ke rentang tanggal
- Import/export template

### 3. **Individual Setting**
Redirect ke halaman Device Management untuk pengaturan individual.

## 📱 User Interface

### Navigation
- **Menu Location**: Sidebar → "Shift Settings"
- **URL**: `/shift-settings`
- **Icon**: Settings icon

### Layout
- **Responsive Design**: Mobile dan desktop friendly
- **Tab Navigation**: 3 tab utama (Bulk, Template, Individual)
- **Card-based Layout**: Setiap section dalam card terpisah

### Components
- **Date Range Picker**: Input tanggal mulai dan selesai
- **Quick Date Buttons**: 6 template tanggal cepat
- **Device Search**: Real-time search dengan filter
- **Device Checkboxes**: Multi-select dengan preview
- **Shift Selector**: Dropdown dengan emoji icons
- **Preview Panel**: Summary sebelum apply
- **Notifications**: Success/error messages

## 🔧 Technical Implementation

### Frontend Components
```typescript
// Main Component
src/components/ShiftSettings.tsx

// Page
src/pages/shift-settings.astro

// Navigation
src/components/Sidebar.astro (updated)
```

### State Management
```typescript
interface ShiftSettingsState {
  devices: Device[];
  selectedDevices: string[];
  dateRange: { startDate: string; endDate: string };
  bulkShiftType: 'fullday' | 'day' | 'night' | 'off';
  quickDateTemplate: string;
  deviceSearchTerm: string;
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' } | null;
  activeTab: 'bulk' | 'template' | 'individual';
}
```

### API Integration
Menggunakan existing API endpoints:
- `api.getDevices()` - Load device list
- `api.updateUserShift()` - Bulk update shifts
- `api.getUserShiftsByDate()` - Get existing schedules

### Key Functions
```typescript
// Date range generation
generateDateRange(start: string, end: string): string[]

// Quick date templates
applyQuickDateTemplate(template: string): void

// Bulk assignment
handleBulkAssignment(): Promise<void>

// Device selection
handleDeviceSelection(deviceId: string): void
selectAllDevices(): void
clearSelection(): void

// Search and filter
filteredDevices: Device[]
```

## 📋 Usage Instructions

### 1. **Akses Halaman**
- Klik menu "Shift Settings" di sidebar
- Atau navigasi ke `/shift-settings`

### 2. **Bulk Assignment Workflow**
1. **Pilih Tanggal**:
   - Gunakan quick template (Hari Ini, Minggu Ini, dll)
   - Atau input manual tanggal mulai dan selesai

2. **Pilih Device**:
   - Search device jika perlu
   - Centang device yang ingin diatur
   - Atau gunakan "Pilih Semua"

3. **Pilih Shift Type**:
   - Fullday, Pagi, Malam, atau OFF

4. **Review Preview**:
   - Cek summary periode, device, dan total entries
   - Pastikan data sudah benar

5. **Apply**:
   - Klik "Terapkan Shift ke Device Terpilih"
   - Tunggu proses selesai
   - Lihat notifikasi sukses/error

### 3. **Tips Penggunaan**
- **Quick Templates**: Gunakan untuk periode umum (hari ini, minggu ini)
- **Search Device**: Ketik nama atau MAC address untuk filter cepat
- **Preview Summary**: Selalu cek sebelum apply untuk menghindari kesalahan
- **Bulk Operations**: Cocok untuk pengaturan shift rutin atau darurat

## 🎨 UI/UX Features

### Visual Indicators
- **Color-coded Shifts**: Setiap shift type punya warna berbeda
- **Loading States**: Spinner animation saat proses
- **Progress Feedback**: Real-time notification
- **Selected State**: Visual feedback untuk item terpilih

### Responsive Design
- **Mobile**: Stack layout, touch-friendly buttons
- **Desktop**: Grid layout, hover effects
- **Tablet**: Adaptive layout

### Accessibility
- **Keyboard Navigation**: Tab support
- **Screen Reader**: Proper labels dan ARIA
- **Focus States**: Clear focus indicators
- **Color Contrast**: WCAG compliant

## 🔄 Integration dengan Existing Features

### Device Management
- Shared API endpoints
- Consistent data structure
- Cross-navigation support

### Schedule Badge
- Same shift types dan colors
- Unified notification system
- Real-time data sync

### Date Picker
- Consistent date format
- Shared date utilities
- Synchronized date selection

## 📊 Performance Considerations

### Optimization
- **Lazy Loading**: Component loaded on demand
- **Debounced Search**: Prevent excessive API calls
- **Batch Operations**: Efficient bulk updates
- **Local State**: Minimize re-renders

### Error Handling
- **API Failures**: Graceful error messages
- **Validation**: Input validation sebelum submit
- **Retry Logic**: Auto-retry untuk network errors
- **Fallback UI**: Loading states dan empty states

## 🚀 Future Enhancements

### Phase 2 Features
1. **Template System**:
   - Custom template creation
   - Template library
   - Template sharing

2. **Advanced Scheduling**:
   - Recurring schedules
   - Conflict detection
   - Schedule optimization

3. **Reporting**:
   - Shift coverage reports
   - Utilization analytics
   - Export capabilities

4. **Automation**:
   - Auto-assignment rules
   - Smart scheduling
   - Integration dengan HR systems

### Technical Improvements
- **Caching**: Local storage untuk templates
- **Offline Support**: PWA capabilities
- **Real-time Updates**: WebSocket integration
- **Bulk Import**: CSV/Excel import

## 📈 Success Metrics

### User Experience
- **Time to Complete**: Reduce bulk assignment time by 80%
- **Error Rate**: Minimize scheduling conflicts
- **User Adoption**: Track feature usage
- **Satisfaction**: User feedback scores

### System Performance
- **API Response Time**: < 2 seconds untuk bulk operations
- **UI Responsiveness**: < 100ms interaction feedback
- **Error Rate**: < 1% API failures
- **Scalability**: Support 1000+ devices

## 🔗 Related Documentation
- [Schedule Badge Implementation](./SCHEDULE_BADGE_IMPLEMENTATION.md)
- [API Specification](./API_SPECIFICATION.yml)
- [User Shift API](./backend/USER_SHIFT_API.md)

---

**Status**: ✅ **Implemented and Ready**  
**Version**: 1.0.0  
**Last Updated**: January 2025