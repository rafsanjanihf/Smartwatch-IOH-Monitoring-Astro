import { Request, Response } from 'express';
import { pool } from '../index';
import { UserDevice } from '../interfaces/types';

export const getUserDevices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT ud.*, d.name as device_name
      FROM "UserDevice" ud
      LEFT JOIN "Device" d ON ud.device_id = d.id
      WHERE ud.status = $1
    `,
      ['published'],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Kesalahan saat mengambil data user device' });
  }
};

export const getUserDeviceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT ud.*, d.name as device_name
      FROM "UserDevice" ud
      LEFT JOIN "Device" d ON ud.device_id = d.id
      WHERE ud.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User device tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Kesalahan saat mengambil data user device' });
  }
};
