# User Shift API Documentation

API untuk mengelola schedule/shift perangkat berdasarkan collection UserShift di Directus.

## Base URL
```
http://localhost:3031/api
```

## Endpoints

### 1. Get All User Shifts dengan Filter
```
GET /user-shifts
```

**Query Parameters:**
- `date` (optional): Filter berdasarkan tanggal (format: YYYY-MM-DD)
- `schedule_type` (optional): Filter berdasarkan tipe schedule (fullday, day, night, off)
- `device_id` (optional): Filter berdasarkan ID perangkat

**Example:**
```
GET /user-shifts?date=2025-01-13&schedule_type=day
GET /user-shifts?device_id=abc123
```

**Response:**
```json
[
  {
    "id": "uuid",
    "device_id": "device-uuid",
    "schedule_type": "day",
    "date": "2025-01-13T00:00:00.000Z",
    "device_name": "Device Name",
    "device_mac": "AA:BB:CC:DD:EE:FF",
    "date_created": "2025-01-13T10:00:00.000Z",
    "date_updated": "2025-01-13T10:00:00.000Z"
  }
]
```

### 2. Get User Shifts by Date
```
GET /user-shifts/date/{date}
```

**Parameters:**
- `date` (required): Tanggal dalam format YYYY-MM-DD

**Example:**
```
GET /user-shifts/date/2025-01-13
```

**Response:**
```json
{
  "date": "2025-01-13",
  "total": 10,
  "schedules": {
    "fullday": [
      {
        "id": "uuid1",
        "device_id": "device-uuid1",
        "schedule_type": "fullday",
        "date": "2025-01-13T00:00:00.000Z",
        "device_name": "Device 1",
        "device_mac": "AA:BB:CC:DD:EE:FF"
      }
    ],
    "day": [
      {
        "id": "uuid2",
        "device_id": "device-uuid2",
        "schedule_type": "day",
        "date": "2025-01-13T00:00:00.000Z",
        "device_name": "Device 2",
        "device_mac": "AA:BB:CC:DD:EE:FF"
      }
    ],
    "night": [],
    "off": []
  },
  "all": [
    // semua data schedule untuk tanggal tersebut
  ]
}
```

### 3. Get Schedule Statistics
```
GET /user-shifts/stats
```

**Query Parameters:**
- `date` (optional): Filter berdasarkan tanggal (format: YYYY-MM-DD)

**Example:**
```
GET /user-shifts/stats?date=2025-01-13
```

**Response:**
```json
{
  "date": "2025-01-13",
  "statistics": {
    "fullday": 5,
    "day": 3,
    "night": 2,
    "off": 1,
    "total": 11
  },
  "details": [
    {
      "schedule_type": "fullday",
      "count": "5",
      "unique_devices": "5"
    },
    {
      "schedule_type": "day",
      "count": "3",
      "unique_devices": "3"
    }
  ]
}
```

### 4. Get User Shift by ID
```
GET /user-shifts/{id}
```

**Parameters:**
- `id` (required): UUID dari user shift

**Example:**
```
GET /user-shifts/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "device_id": "device-uuid",
  "schedule_type": "day",
  "date": "2025-01-13T00:00:00.000Z",
  "device_name": "Device Name",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "date_created": "2025-01-13T10:00:00.000Z",
  "date_updated": "2025-01-13T10:00:00.000Z"
}
```

## Schedule Types

- `fullday`: Perangkat aktif sepanjang hari
- `day`: Perangkat aktif pada shift pagi/siang (Pagi)
- `night`: Perangkat aktif pada shift malam (Malam)
- `off`: Perangkat tidak aktif (OFF)

## Error Responses

### 404 Not Found
```json
{
  "error": "Schedule tidak ditemukan"
}
```

### 400 Bad Request
```json
{
  "error": "Parameter tanggal diperlukan"
}
```

### 500 Internal Server Error
```json
{
  "error": "Kesalahan saat mengambil data schedule"
}
```

## Frontend Integration

Untuk menggunakan API ini di frontend, gunakan fungsi yang sudah tersedia di `src/utils/api.ts`:

```typescript
import { api } from '../utils/api';

// Get all shifts dengan filter
const shifts = await api.getAllUserShifts({
  date: '2025-01-13',
  schedule_type: 'day'
});

// Get shifts berdasarkan tanggal
const scheduleData = await api.getUserShiftsByDate('2025-01-13');

// Get statistik
const stats = await api.getScheduleStats('2025-01-13');

// Get shift by ID
const shift = await api.getUserShift('uuid');
```

## Database Schema (Directus Collection)

**Collection Name:** `UserShift`

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| device_id | Many-to-One | Relasi ke Device.id |
| schedule_type | Dropdown | fullday, day, night, off |
| date | DateTime | Tanggal schedule |
| date_created | DateTime | Auto-generated |
| date_updated | DateTime | Auto-generated |
| status | String | published/draft (default: published) |