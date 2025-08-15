# Shift-Based Sleep Filter - Dokumentasi Fitur

## Overview
Fitur ini memungkinkan filtering data tidur berdasarkan shift kerja yang dipilih di halaman Devices. Data tidur akan difilter sesuai dengan waktu tidur yang relevan untuk setiap shift.

## 🚀 Fitur yang Diimplementasikan

### 1. **Filter Tidur Berdasarkan Shift**

#### Shift Pagi (Day Shift)
- **Waktu Tidur**: 17:00 (hari kemarin) s/d 5:30 (hari ini)
- **Deskripsi**: Menampilkan data tidur malam untuk pekerja shift pagi
- **Logika**: Data sleep motion yang berada di luar rentang waktu ini akan disembunyikan

#### Shift Malam (Night Shift)  
- **Waktu Tidur**: 5:00 s/d 17:30 (hari ini)
- **Deskripsi**: Menampilkan data tidur siang untuk pekerja shift malam
- **Logika**: Data sleep motion yang berada di luar rentang waktu ini akan disembunyikan

#### Shift Lainnya (Other/Fullday/Off)
- **Waktu Tidur**: Semua waktu (tidak ada filter)
- **Deskripsi**: Menampilkan semua data tidur tanpa filter waktu

### 2. **Integrasi dengan Komponen**

#### DeviceList Component
- Filter shift otomatis mengirim informasi shift type saat device diklik
- Event `device-select` sekarang menyertakan `shiftType`
- Event `shift-filter-change` dipicu saat filter shift berubah

#### SleepChart Component
- Menerima dan memproses informasi shift type
- Memfilter data `sleepMotion` berdasarkan waktu
- Re-filter otomatis saat shift berubah

### 3. **Event System**

#### Events yang Ditambahkan:
- `device-select`: `{ deviceId, shiftType }`
- `shift-filter-change`: `{ shiftType }`

## 📱 Cara Penggunaan

1. **Buka halaman Sleep Monitoring atau Dashboard**
2. **Pilih filter shift** di DeviceList:
   - "All Shifts" - Tampilkan semua data tidur
   - "Pagi" - Filter untuk tidur malam (17:00-05:30)
   - "Malam" - Filter untuk tidur siang (05:00-17:30)
   - "Other" - Tampilkan semua data tidur
3. **Klik device** untuk melihat data tidur yang sudah difilter
4. **Chart akan menampilkan** hanya data tidur sesuai shift yang dipilih

## 🔧 Technical Implementation

### Filter Logic
```typescript
// Shift Pagi: 17:00 - 05:30
if (shiftType === 'day') {
  return timeInMinutes >= 1020 || timeInMinutes <= 330;
}

// Shift Malam: 05:00 - 17:30  
if (shiftType === 'night') {
  return timeInMinutes >= 300 && timeInMinutes <= 1050;
}
```

### Data Flow
1. User memilih shift filter di DeviceList
2. Event `shift-filter-change` dipicu
3. SleepChart menerima event dan update `currentShiftType`
4. Data sleep di-filter ulang dengan `filterSleepDataByShift()`
5. Chart di-render ulang dengan data yang sudah difilter

## 🐛 Debugging

Fitur ini dilengkapi dengan console logging untuk debugging:
- Log saat filtering dimulai
- Log jumlah motion records sebelum dan sesudah filter
- Log hasil akhir filtering

Untuk melihat log, buka Developer Tools > Console saat menggunakan fitur.

## 📝 Notes

- Filter hanya berlaku untuk data `sleepMotion`, bukan untuk summary statistics
- Waktu dikonversi ke menit untuk memudahkan perbandingan
- Filter bekerja pada timezone lokal browser
- Data yang tidak memiliki motion records akan disembunyikan setelah filtering