import { Request, Response } from 'express';
import { pool } from '../index';
import { Health, SleepReport, SleepMotion, BloodOxygenPeriod, HeartRatePeriod } from '../interfaces/types';
import moment from 'moment';
import { calculateSleepQuality } from '../services/sleep.service';

export const getHealthData = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM "Health" WHERE status = $1 limit 1000', ['published']);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Kesalahan saat mengambil data kesehatan' });
  }
};

export const getHealthByDeviceId = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT * FROM "Health"
      WHERE device_id = $1
      AND status = 'published'
    `;
    const queryParams: any[] = [deviceId];

    if (start_date && end_date) {
      query += ` AND start_time_utc BETWEEN $2 AND $3`;
      queryParams.push(new Date(start_date as string).toISOString(), new Date(end_date as string).toISOString());
    }

    console.log('Executing query:', query);
    console.log('Query params:', queryParams);

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error in getHealthByDeviceId:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data kesehatan' });
  }
};

// get health by device report
export const getHealthByDeviceReport = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query;

    const startDate = moment(date as string)
    .set('hour', 0)
    .set('minute', 0)
    .set('second', 0)
    .utc();
  const endDate = moment(date as string)
    .set('hour', 23)
    .set('minute', 59)
    .set('second', 59)
    .utc();

    let query = `
      SELECT * FROM "Health"
      WHERE device_id = $1
      AND start_time_utc >= $2
      AND end_time_utc <= $3
      AND status = 'published'
    `;

    const result = await pool.query(query, [deviceId, startDate, endDate]);
    console.log(query, [deviceId, startDate, endDate]);
    // grouping by data_type
    const groupedData = result.rows.reduce((acc: any, curr: any) => {
      acc[curr.data_type] = acc[curr.data_type] || [];
      acc[curr.data_type].push(curr);
      return acc;
    }, {});

    let sleepTesting = groupedData['sleep_motion'];
    sleepTesting.sort((a: any, b: any) => a.start_time_utc - b.start_time_utc);

    // Formatting the data to SleepReport
    const sleepReports: SleepReport[] = [];
    const sleepMotion: SleepMotion[] = [];
    const bloodOxygenPeriod: BloodOxygenPeriod[] = [];
    const heartRatePeriod: HeartRatePeriod[] = [];

    // sleep motion
    if (groupedData['sleep_motion']) {
      groupedData['sleep_motion'].forEach((item: any) => {
        sleepMotion.push({
          // string_val < 8 = 1
          // string_val 8 to 9  = 2
          // string_val 9 to 10 = 3
          // string_val > 10 = 4
          value: item.string_val < 8 ? 1 : item.string_val < 9 ? 2 : item.string_val < 10 ? 3 : 4,
          // value: item.string_val || 0,
          endTime: parseInt(item.end_time_millis) || 0,
          startTime: parseInt(item.start_time_millis) || 0,
        });
      });
    }

    // blood oxygen period
    if (groupedData['blood_oxygen']) {
      groupedData['blood_oxygen'].forEach((item: any) => {
        bloodOxygenPeriod.push({
          value: parseInt(item.string_val) || 0,
          time: parseInt(item.end_time_millis) || 0,
        });
      });
    }

    // heart rate period
    if (groupedData['heart_rate']) {
      groupedData['heart_rate'].forEach((item: any) => {
        heartRatePeriod.push({
          value: parseInt(item.string_val) || 0,
          time: parseInt(item.end_time_millis) || 0,
        });
      });
    }

    // Calculate heart rate stats
    const heartRates = heartRatePeriod.map((hr) => hr.value).filter((val) => val > 0);
    const maxHeartRate = heartRates.length ? Math.max(...heartRates) : 0;
    const minHeartRate = heartRates.length ? Math.min(...heartRates) : 0;
    const avgHeartRate = heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : 0;

    // Calculate blood oxygen stats
    const bloodOxygens = bloodOxygenPeriod.map((bo) => bo.value).filter((val) => val > 0);
    const maxBloodOxygen = bloodOxygens.length ? Math.max(...bloodOxygens) : 0;
    const minBloodOxygen = bloodOxygens.length ? Math.min(...bloodOxygens) : 0;
    const avgBloodOxygen = bloodOxygens.length
      ? Math.round(bloodOxygens.reduce((a, b) => a + b, 0) / bloodOxygens.length)
      : 0;

    // Calculate sleep stages if available
    let clearTotalTime = 0;
    let fastEyeTotalTime = 0;
    let simpleSleepTotalTime = 0;
    let deepSleepTotalTime = 0;
    let sleepQuality = 0;

    // Calculate sleep stages from sleepMotion
    if (sleepMotion.length > 0) {
      sleepMotion.forEach((motion) => {
        const duration = (motion.endTime - motion.startTime) / 1000; // Convert to seconds
        switch (motion.value) {
          case 1: // Light Movement (Awake)
            clearTotalTime += duration;
            break;
          case 2: // Medium Movement (REM/Fast eye)
            fastEyeTotalTime += duration;
            break;
          case 3: // Low Movement (Light sleep)
            simpleSleepTotalTime += duration;
            break;
          case 4: // No Movement (Deep sleep)
            deepSleepTotalTime += duration;
            break;
        }
      });
    }

    // Calculate Sleep Quality using the helper function
    sleepQuality = calculateSleepQuality(clearTotalTime, fastEyeTotalTime, simpleSleepTotalTime, deepSleepTotalTime);

    // sort sleepMotion
    sleepMotion.sort((a, b) => a.startTime - b.startTime);

    const recordDate = moment(endDate);

    sleepReports.push({
      id: `${deviceId}_${recordDate.format('YYYYMMDD')}`,
      status: 'published',
      type: 1,
      date_created: new Date(),
      date_updated: new Date(),
      startReal: recordDate.valueOf().toString(),
      endReal: moment(endDate).valueOf().toString(),
      sleepQuality: sleepQuality / 100 || 0,
      sleepTotalTime: clearTotalTime + fastEyeTotalTime + simpleSleepTotalTime + deepSleepTotalTime,
      device_id: deviceId,
      startDateUtc: recordDate.toDate(),
      endDateUtc: moment(endDate).toDate(),
      recordDay: recordDate.date(),
      recordMonth: recordDate.month() + 1,
      recordYear: recordDate.year(),
      clearTotalTime: Math.round(clearTotalTime),
      fastEyeTotalTime: Math.round(fastEyeTotalTime),
      simpleSleepTotalTime: Math.round(simpleSleepTotalTime),
      deepSleepTotalTime: Math.round(deepSleepTotalTime),
      maxHeartRate,
      minHeartRate,
      avgHeartRate,
      maxBloodOxygen,
      minBloodOxygen,
      avgBloodOxygen,
      sleepMotion,
      bloodOxygenPeriod,
      heartRatePeriod,
    });

    // return res.json(sleepReports);

    // store to SleepRepo with upsert
    const resultStore = await pool.query(
      `INSERT INTO "SleepReport" (
        "id", "status", "date_created", "date_updated", "type",
        "startReal", "endReal", "startSetting", "endSetting",
        "recordYear", "recordMonth", "recordWeek", "recordDay",
        "dataSourceName", "sleepQuality", "sleepTotalTime",
        "clearTotalTime", "fastEyeTotalTime", "simpleSleepTotalTime",
        "deepSleepTotalTime", "maxHeartRate", "minHeartRate",
        "avgHeartRate", "maxBloodOxygen", "minBloodOxygen",
        "avgBloodOxygen", "maxBreatheRate", "minBreatheRate",
        "avgBreatheRate", "device_id", "sleepMotion",
        "bloodOxygenPeriod", "breatheRatePeriod", "heartRatePeriod"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34)
      ON CONFLICT ("id") DO UPDATE SET
        "status" = EXCLUDED."status",
        "date_created" = EXCLUDED."date_created",
        "date_updated" = EXCLUDED."date_updated",
        "type" = EXCLUDED."type",
        "startReal" = EXCLUDED."startReal",
        "endReal" = EXCLUDED."endReal",
        "startSetting" = EXCLUDED."startSetting",
        "endSetting" = EXCLUDED."endSetting",
        "recordYear" = EXCLUDED."recordYear",
        "recordMonth" = EXCLUDED."recordMonth",
        "recordWeek" = EXCLUDED."recordWeek",
        "recordDay" = EXCLUDED."recordDay",
        "dataSourceName" = EXCLUDED."dataSourceName",
        "sleepQuality" = EXCLUDED."sleepQuality",
        "sleepTotalTime" = EXCLUDED."sleepTotalTime",
        "clearTotalTime" = EXCLUDED."clearTotalTime",
        "fastEyeTotalTime" = EXCLUDED."fastEyeTotalTime",
        "simpleSleepTotalTime" = EXCLUDED."simpleSleepTotalTime",
        "deepSleepTotalTime" = EXCLUDED."deepSleepTotalTime",
        "maxHeartRate" = EXCLUDED."maxHeartRate",
        "minHeartRate" = EXCLUDED."minHeartRate",
        "avgHeartRate" = EXCLUDED."avgHeartRate",
        "maxBloodOxygen" = EXCLUDED."maxBloodOxygen",
        "minBloodOxygen" = EXCLUDED."minBloodOxygen",
        "avgBloodOxygen" = EXCLUDED."avgBloodOxygen",
        "device_id" = EXCLUDED."device_id",
        "sleepMotion" = EXCLUDED."sleepMotion",
        "bloodOxygenPeriod" = EXCLUDED."bloodOxygenPeriod",
        "breatheRatePeriod" = EXCLUDED."breatheRatePeriod",
        "heartRatePeriod" = EXCLUDED."heartRatePeriod"
      RETURNING *`,
      [
        sleepReports[0].id,
        sleepReports[0].status,
        sleepReports[0].date_created,
        sleepReports[0].date_updated,
        sleepReports[0].type,
        sleepReports[0].startReal,
        sleepReports[0].endReal,
        null, // startSetting
        null, // endSetting
        sleepReports[0].recordYear,
        sleepReports[0].recordMonth,
        null, // recordWeek
        sleepReports[0].recordDay,
        null, // dataSourceName
        sleepReports[0].sleepQuality,
        sleepReports[0].sleepTotalTime,
        sleepReports[0].clearTotalTime,
        sleepReports[0].fastEyeTotalTime,
        sleepReports[0].simpleSleepTotalTime,
        sleepReports[0].deepSleepTotalTime,
        sleepReports[0].maxHeartRate,
        sleepReports[0].minHeartRate,
        sleepReports[0].avgHeartRate,
        sleepReports[0].maxBloodOxygen,
        sleepReports[0].minBloodOxygen,
        sleepReports[0].avgBloodOxygen,
        null, // maxBreatheRate
        null, // minBreatheRate
        null, // avgBreatheRate
        sleepReports[0].device_id,
        JSON.stringify(sleepReports[0].sleepMotion),
        JSON.stringify(sleepReports[0].bloodOxygenPeriod),
        null, // breatheRatePeriod
        JSON.stringify(sleepReports[0].heartRatePeriod),
      ],
    );
    res.json(resultStore.rows);
  } catch (error) {
    console.error('Error in getHealthByDeviceReport:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data kesehatan' });
  }
};

export const getSleepQualityStats = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    let { date } = req.query;

    if (!date) {
      date = moment().utc().format('YYYY-MM-DD');
    }

    let startDate = moment(date as string)
      .startOf('day')
      .subtract(3, 'days')
      .utc();
    let endDate = moment(date as string)
      .endOf('day')
      .utc();

    let query = `
      SELECT
        AVG("string_val") as avg_duration,
        COUNT(*) as total_records
      FROM "Health"
      WHERE device_id = $1
      AND status = 'published'
      AND "data_type" = 'sleep_motion'
      AND "start_time_utc" >= $2
      AND "end_time_utc" <= $3
    `;

    const queryParams: any[] = [deviceId, startDate, endDate];
    const result = await pool.query(query, queryParams);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Kesalahan saat mengambil statistik tidur' });
  }
};
