import { Request, Response } from 'express';
import { pool } from '../index';
import { SleepReport } from '../interfaces/types';
import moment from 'moment';

export const getSleepData = async (req: Request, res: Response) => {
  try {
    let { date, deviceIds } = req.query;
    const deviceIdsArray = deviceIds ? (deviceIds as string).split(',') : [];

    // Set default value if not provided
    if (!date) {
      date = moment().format('YYYY-MM-DD').split('-');
    } else {
      date = moment(date as string)
        .format('YYYY-MM-DD')
        .split('-');
    }
    // date = moment('2025-02-13').utc().format('YYYY-MM-DD').split('-');

    const query = `
      SELECT
        id,
        "startDateUtc",
        "endDateUtc",
        "sleepTotalTime",
        "sleepQuality",
        device_id
      FROM "SleepReport"
      WHERE "recordDay" = $1
      AND "recordMonth" = $2
      AND "recordYear" = $3
      AND device_id = ANY($4)
      AND type = 1
      ORDER BY "startDateUtc" DESC
      LIMIT 500
    `;

    console.log(query, date);
    const result = await pool.query(query, [date[2], date[1], date[0], deviceIdsArray]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data tidur' });
  }
};

export const getSleepByDeviceId = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    // Fix timezone issue: handle date string directly without moment conversion
    let date: string;
    if (startDate && typeof startDate === 'string') {
      // If startDate is already in YYYY-MM-DD format, use it directly
      if (startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = startDate;
      } else {
        // Otherwise, parse it with moment but keep local timezone
        date = moment(startDate).format('YYYY-MM-DD');
      }
    } else {
      date = moment().format('YYYY-MM-DD');
    }
    
    const dayOfMonth = parseInt(date.split('-')[2]);
    const month = parseInt(date.split('-')[1]);
    const year = parseInt(date.split('-')[0]);
    console.log('getSleepByDeviceId - Original startDate:', startDate, 'Processed date:', date, 'Day:', dayOfMonth, 'Month:', month, 'Year:', year);

    let query = 'SELECT * FROM "SleepReport" WHERE device_id = $1 AND type = 1';
    const queryParams: any[] = [deviceId];

    if (dayOfMonth && month) {
      query += ' AND "recordDay" = $2 AND "recordMonth" = $3 AND "recordYear" = $4';
      queryParams.push(dayOfMonth, month, year);
    }

    query += ' ORDER BY "type" ASC';

    console.log(query, queryParams);
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data tidur' });
  }
};

export const getSleepQualityStats = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    let { startDate, endDate } = req.query;

    // Set default values if not provided
    if (!endDate) {
      endDate = moment().utc().format('YYYY-MM-DD');
    }
    if (!startDate) {
      startDate = moment(endDate as string)
        .utc()
        .subtract(3, 'days')
        .format('YYYY-MM-DD');
    }

    let query = `
      SELECT
        AVG("sleepQuality") as avg_quality,
        AVG("sleepTotalTime") as avg_duration,
        COUNT(*) as total_records
      FROM "SleepReport"
      WHERE device_id = $1
      AND type = 1
      AND status = 'published'
      AND "startDateUtc" >= $2
      AND "endDateUtc" <= $3
    `;

    const queryParams: any[] = [deviceId, startDate, endDate];
    const result = await pool.query(query, queryParams);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Kesalahan saat mengambil statistik tidur' });
  }
};

export const getSleepStatsByDate = async (req: Request, res: Response) => {
  try {
    const { deviceId, date, tz } = req.query;
    
    if (!deviceId || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceId and date are required' 
      });
    }

    // Parse date
    const targetDate = moment(date as string).format('YYYY-MM-DD').split('-');
    const dayOfMonth = parseInt(targetDate[2]);
    const month = parseInt(targetDate[1]);
    const year = parseInt(targetDate[0]);

    // Query untuk mendapatkan data sleep logs dari Health table
    const healthQuery = `
      SELECT 
        start_time_utc,
        end_time_utc,
        string_val,
        int_val
      FROM "Health"
      WHERE device_id = $1
      AND data_type = 'sleep_motion'
      AND status = 'published'
      AND DATE(start_time_utc) = $2
      ORDER BY start_time_utc ASC
    `;

    const healthResult = await pool.query(healthQuery, [deviceId, date]);
    
    // Query untuk mendapatkan total sleep time dari SleepReport
    const sleepReportQuery = `
      SELECT 
        "sleepTotalTime",
        "sleepQuality",
        "maxHeartRate",
        "minHeartRate",
        "maxBloodOxygen",
        "minBloodOxygen"
      FROM "SleepReport"
      WHERE device_id = $1
      AND "recordDay" = $2
      AND "recordMonth" = $3
      AND "recordYear" = $4
      AND type = 1
      LIMIT 1
    `;

    const sleepReportResult = await pool.query(sleepReportQuery, [deviceId, dayOfMonth, month, year]);
    
    // Process sleep logs
    const sleepLogs = healthResult.rows.map(row => {
      const startTime = moment(row.start_time_utc).format('DD/MM/YYYY HH:mm:ss');
      const endTime = moment(row.end_time_utc).format('DD/MM/YYYY HH:mm:ss');
      const duration = moment(row.end_time_utc).diff(moment(row.start_time_utc), 'seconds');
      
      // Map int_val to quality
      let quality = 'light sleep';
      switch (row.int_val) {
        case 1:
          quality = 'awake';
          break;
        case 2:
          quality = 'eye movement';
          break;
        case 3:
          quality = 'light sleep';
          break;
        case 4:
          quality = 'deep sleep';
          break;
      }
      
      return {
        startTime,
        endTime,
        duration,
        quality
      };
    });

    // Get sleep report data or set defaults
    const sleepReport = sleepReportResult.rows[0] || {
      sleepTotalTime: 0,
      sleepQuality: 0,
      maxHeartRate: 0,
      minHeartRate: 0,
      maxBloodOxygen: 0,
      minBloodOxygen: 0
    };

    const responseData = {
      deviceId,
      date,
      sleepTime: sleepReport.sleepTotalTime || 0,
      sleepQuality: sleepReport.sleepQuality || 0,
      heartRate: {
        min: sleepReport.minHeartRate || 0,
        max: sleepReport.maxHeartRate || 0
      },
      bloodOxygen: {
        min: sleepReport.minBloodOxygen || 0,
        max: sleepReport.maxBloodOxygen || 0
      },
      sleepLogs
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error in getSleepStatsByDate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kesalahan saat mengambil data tidur' 
    });
  }
};
