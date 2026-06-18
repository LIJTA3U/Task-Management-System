const pool = require('../config/db');

async function createNotification(userId, type, message) {
  if (!userId || !type || !message) return null;

  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, message)
     VALUES ($1::int, $2::varchar(50), $3::text)
     RETURNING *`,
    [userId, type, message]
  );

  return result.rows[0];
}

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit || 10);

    const result = await pool.query(
      `SELECT id, user_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1::int
       ORDER BY created_at DESC
       LIMIT $2::int`,
      [userId, limit]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении уведомлений' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1::int AND user_id = $2::int
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление отмечено как прочитанное', notification: result.rows[0] });
  } catch (error) {
    console.error('Mark notification read error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при обновлении уведомления' });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead
};