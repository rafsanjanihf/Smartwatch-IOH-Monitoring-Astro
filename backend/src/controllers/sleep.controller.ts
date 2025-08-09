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

    // get day of week using moment
    const date = moment(startDate as string).format('YYYY-MM-DD');
    const dayOfMonth = parseInt(date.split('-')[2]);
    const month = parseInt(date.split('-')[1]);
    const year = parseInt(date.split('-')[0]);
    console.log(startDate, dayOfMonth, month, year);

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
