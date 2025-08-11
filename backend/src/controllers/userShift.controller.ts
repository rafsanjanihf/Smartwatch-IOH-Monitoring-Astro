import { Request, Response } from 'express';
import { pool } from '../index';
import { UserShift } from '../interfaces/types';
import { v4 as uuidv4 } from 'uuid';

export const getUserShifts = async (req: Request, res: Response) => {
  try {
    const { date, schedule_type, device_id } = req.query;

    let query = `SELECT us.id, us.date_created, us.date_updated, us.device_id, us.schedule_type, 
                        TO_CHAR(us.date, 'YYYY-MM-DD') as date, d.name as device_name 
                 FROM "UserShift" us 
                 LEFT JOIN "Device" d ON us.device_id = d.id 
                 WHERE 1=1`;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter berdasarkan tanggal
    if (date) {
      query += ` AND DATE(us.date) = $${paramIndex}`;
      queryParams.push(date);
      paramIndex++;
    }

    // Filter berdasarkan schedule_type
    if (schedule_type) {
      query += ` AND us.schedule_type = $${paramIndex}`;
      queryParams.push(schedule_type);
      paramIndex++;
    }

    // Filter berdasarkan device_id
    if (device_id) {
      query += ` AND us.device_id = $${paramIndex}`;
      queryParams.push(device_id);
      paramIndex++;
    }

    query += ` ORDER BY us.date DESC, us.date_created DESC`;

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting user shifts:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data schedule' });
  }
};

export const getUserShiftsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Parameter tanggal diperlukan' });
    }

    const query = `
      SELECT us.id, us.date_created, us.date_updated, us.device_id, us.schedule_type,
             TO_CHAR(us.date, 'YYYY-MM-DD') as date, d.name as device_name, d.mac as device_mac
      FROM "UserShift" us 
      LEFT JOIN "Device" d ON us.device_id = d.id 
      WHERE DATE(us.date) = $1
      ORDER BY us.schedule_type, d.name
    `;

    const result = await pool.query(query, [date]);
    
    // Group by schedule_type untuk memudahkan filtering di frontend
    const groupedData = {
      fullday: result.rows.filter(row => row.schedule_type === 'fullday'),
      day: result.rows.filter(row => row.schedule_type === 'day'),
      night: result.rows.filter(row => row.schedule_type === 'night'),
      off: result.rows.filter(row => row.schedule_type === 'off')
    };

    res.json({
      date: date,
      total: result.rows.length,
      schedules: groupedData,
      all: result.rows
    });
  } catch (error) {
    console.error('Error getting user shifts by date:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data schedule berdasarkan tanggal' });
  }
};

export const getUserShiftById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT us.id, us.date_created, us.date_updated, us.device_id, us.schedule_type,
             TO_CHAR(us.date, 'YYYY-MM-DD') as date, d.name as device_name, d.mac as device_mac
      FROM "UserShift" us 
      LEFT JOIN "Device" d ON us.device_id = d.id 
      WHERE us.id = $1
    `;
    
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user shift by id:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil data schedule' });
  }
};

export const createUserShift = async (req: Request, res: Response) => {
  try {
    const { device_id, date, schedule_type } = req.body;

    if (!device_id || !date || !schedule_type) {
      return res.status(400).json({ error: 'device_id, date, dan schedule_type diperlukan' });
    }

    // Validasi schedule_type
    const validScheduleTypes = ['fullday', 'day', 'night', 'off'];
    if (!validScheduleTypes.includes(schedule_type)) {
      return res.status(400).json({ error: 'schedule_type harus salah satu dari: fullday, day, night, off' });
    }

    // Cek apakah sudah ada schedule untuk device dan tanggal yang sama
    const existingQuery = `
      SELECT id FROM "UserShift" 
      WHERE device_id = $1 AND DATE(date) = $2
    `;
    const existingResult = await pool.query(existingQuery, [device_id, date]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Schedule untuk device dan tanggal ini sudah ada. Gunakan update untuk mengubah.' });
    }

    // Generate UUID untuk id
    const id = uuidv4();

    const query = `
      INSERT INTO "UserShift" (id, device_id, date, schedule_type, date_created, date_updated)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, date_created, date_updated, device_id, schedule_type, TO_CHAR(date, 'YYYY-MM-DD') as date
    `;

    const result = await pool.query(query, [id, device_id, date, schedule_type]);
    
    res.status(201).json({
      message: 'Schedule berhasil dibuat',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user shift:', error);
    res.status(500).json({ error: 'Kesalahan saat membuat schedule' });
  }
};

export const updateUserShift = async (req: Request, res: Response) => {
  try {
    const { device_id, date, schedule_type } = req.body;

    if (!device_id || !date || !schedule_type) {
      return res.status(400).json({ error: 'device_id, date, dan schedule_type diperlukan' });
    }

    // Validasi schedule_type
    const validScheduleTypes = ['fullday', 'day', 'night', 'off'];
    if (!validScheduleTypes.includes(schedule_type)) {
      return res.status(400).json({ error: 'schedule_type harus salah satu dari: fullday, day, night, off' });
    }

    // Cek apakah schedule sudah ada
    const existingQuery = `
      SELECT id FROM "UserShift" 
      WHERE device_id = $1 AND DATE(date) = $2
    `;
    const existingResult = await pool.query(existingQuery, [device_id, date]);

    if (existingResult.rows.length === 0) {
      // Jika belum ada, buat baru
      const id = uuidv4();
      
      const insertQuery = `
        INSERT INTO "UserShift" (id, device_id, date, schedule_type, date_created, date_updated)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, date_created, date_updated, device_id, schedule_type, TO_CHAR(date, 'YYYY-MM-DD') as date
      `;
      const insertResult = await pool.query(insertQuery, [id, device_id, date, schedule_type]);
      
      return res.status(201).json({
        message: 'Schedule berhasil dibuat',
        data: insertResult.rows[0]
      });
    } else {
      // Jika sudah ada, update
      const updateQuery = `
        UPDATE "UserShift" 
        SET schedule_type = $3, date_updated = NOW()
        WHERE device_id = $1 AND DATE(date) = $2
        RETURNING id, date_created, date_updated, device_id, schedule_type, TO_CHAR(date, 'YYYY-MM-DD') as date
      `;
      const updateResult = await pool.query(updateQuery, [device_id, date, schedule_type]);
      
      return res.status(200).json({
        message: 'Schedule berhasil diupdate',
        data: updateResult.rows[0]
      });
    }
  } catch (error) {
    console.error('Error updating user shift:', error);
    res.status(500).json({ error: 'Kesalahan saat mengupdate schedule' });
  }
};

export const deleteUserShift = async (req: Request, res: Response) => {
  try {
    const { device_id, date } = req.body;

    if (!device_id || !date) {
      return res.status(400).json({ error: 'device_id dan date diperlukan' });
    }

    const query = `
      DELETE FROM "UserShift" 
      WHERE device_id = $1 AND DATE(date) = $2
      RETURNING id, date_created, date_updated, device_id, schedule_type, TO_CHAR(date, 'YYYY-MM-DD') as date
    `;

    const result = await pool.query(query, [device_id, date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule tidak ditemukan' });
    }

    res.json({
      message: 'Schedule berhasil dihapus',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting user shift:', error);
    res.status(500).json({ error: 'Kesalahan saat menghapus schedule' });
  }
};

export const getScheduleStats = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT 
        schedule_type,
        COUNT(*) as count,
        COUNT(DISTINCT device_id) as unique_devices
      FROM "UserShift" 
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    
    if (date) {
      query += ` AND DATE(date) = $1`;
      queryParams.push(date);
    }

    query += ` GROUP BY schedule_type ORDER BY schedule_type`;

    const result = await pool.query(query, queryParams);
    
    // Format data untuk statistik
    const stats = {
      fullday: 0,
      day: 0,
      night: 0,
      off: 0,
      total: 0
    };

    result.rows.forEach(row => {
      stats[row.schedule_type as keyof typeof stats] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    res.json({
      date: date || 'all',
      statistics: stats,
      details: result.rows
    });
  } catch (error) {
    console.error('Error getting schedule stats:', error);
    res.status(500).json({ error: 'Kesalahan saat mengambil statistik schedule' });
  }
};