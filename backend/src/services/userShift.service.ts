import { pool } from '../index';
import { UserShift } from '../interfaces/types';

export class UserShiftService {
  
  /**
   * Get user shifts with filters
   */
  static async getUserShifts(filters: {
    date?: string;
    schedule_type?: string;
    device_id?: string;
  }) {
    let query = `
      SELECT us.*, d.name as device_name, d.mac as device_mac
      FROM "UserShift" us 
      LEFT JOIN "Device" d ON us.device_id = d.id 
      WHERE us.status = 'published'
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.date) {
      query += ` AND DATE(us.date) = $${paramIndex}`;
      queryParams.push(filters.date);
      paramIndex++;
    }

    if (filters.schedule_type) {
      query += ` AND us.schedule_type = $${paramIndex}`;
      queryParams.push(filters.schedule_type);
      paramIndex++;
    }

    if (filters.device_id) {
      query += ` AND us.device_id = $${paramIndex}`;
      queryParams.push(filters.device_id);
      paramIndex++;
    }

    query += ` ORDER BY us.date DESC, us.date_created DESC`;

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Get devices with their schedule for a specific date
   */
  static async getDevicesWithSchedule(date: string) {
    const query = `
      SELECT 
        d.id as device_id,
        d.name as device_name,
        d.mac as device_mac,
        us.id as shift_id,
        us.schedule_type,
        us.date as shift_date
      FROM "Device" d
      LEFT JOIN "UserShift" us ON d.id = us.device_id 
        AND DATE(us.date) = $1 
        AND us.status = 'published'
      WHERE d.status = 'published'
      ORDER BY d.name, us.schedule_type
    `;

    const result = await pool.query(query, [date]);
    return result.rows;
  }

  /**
   * Get schedule statistics for a date range
   */
  static async getScheduleStatistics(startDate?: string, endDate?: string) {
    let query = `
      SELECT 
        DATE(date) as shift_date,
        schedule_type,
        COUNT(*) as count,
        COUNT(DISTINCT device_id) as unique_devices
      FROM "UserShift" 
      WHERE status = 'published'
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND DATE(date) >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND DATE(date) <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY DATE(date), schedule_type ORDER BY shift_date DESC, schedule_type`;

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Check if device has schedule for specific date
   */
  static async hasScheduleForDate(deviceId: string, date: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM "UserShift" 
      WHERE device_id = $1 
      AND DATE(date) = $2 
      AND status = 'published'
    `;

    const result = await pool.query(query, [deviceId, date]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get devices without schedule for specific date
   */
  static async getDevicesWithoutSchedule(date: string) {
    const query = `
      SELECT d.*
      FROM "Device" d
      WHERE d.status = 'published'
      AND d.id NOT IN (
        SELECT DISTINCT device_id 
        FROM "UserShift" 
        WHERE DATE(date) = $1 
        AND status = 'published'
      )
      ORDER BY d.name
    `;

    const result = await pool.query(query, [date]);
    return result.rows;
  }
}