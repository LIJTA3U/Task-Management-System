const pool = require('../config/db');
const { createNotification } = require('./notificationController');
const { logAction } = require('../utils/logger');

const allowedStatuses = ['new', 'in_progress', 'done'];
const allowedPriorities = ['low', 'medium', 'high'];

function isValidStatus(status) {
  return allowedStatuses.includes(status);
}

function isValidPriority(priority) {
  return allowedPriorities.includes(priority);
}

exports.createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description = '',
      status = 'new',
      priority = 'medium',
      due_date = null
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Название задачи обязательно' });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({ message: 'Недопустимый статус задачи' });
    }

    if (!isValidPriority(priority)) {
      return res.status(400).json({ message: 'Недопустимый приоритет задачи' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES ($1::int, $2::varchar(255), $3::text, $4::varchar(20), $5::varchar(20), $6::date)
       RETURNING *`,
      [userId, title.trim(), description, status, priority, due_date || null]
    );

    const task = result.rows[0];

    await Promise.allSettled([
      createNotification(
        userId,
        'task_created',
        `Создана задача: ${task.title}`
      ),
      logAction(`user=${userId} action=task_created task=${task.id}`)
    ]);

    res.status(201).json({
      message: 'Задача создана',
      task
    });
  } catch (error) {
    console.error('Create task error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при создании задачи' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      search = '',
      status = '',
      priority = '',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const sortMap = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      due_date: 'due_date',
      title: 'title',
      status: 'status',
      priority: 'priority'
    };

    const safeSortBy = sortMap[sort_by] || 'created_at';
    const safeSortOrder = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let query = `
      SELECT *
      FROM tasks
      WHERE user_id = $1::int
    `;

    const values = [userId];
    let index = 2;

    if (search.trim()) {
      query += ` AND (title ILIKE $${index} OR COALESCE(description, '') ILIKE $${index})`;
      values.push(`%${search.trim()}%`);
      index++;
    }

    if (status) {
      query += ` AND status = $${index}::varchar(20)`;
      values.push(status);
      index++;
    }

    if (priority) {
      query += ` AND priority = $${index}::varchar(20)`;
      values.push(priority);
      index++;
    }

    if (safeSortBy === 'priority') {
      query += ` ORDER BY CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END ${safeSortOrder}, created_at DESC`;
    } else {
      query += ` ORDER BY ${safeSortBy} ${safeSortOrder} NULLS LAST`;
    }

    const result = await pool.query(query, values);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении задач' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'new')::int AS new_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
        COUNT(*) FILTER (WHERE priority = 'low')::int AS low_priority_tasks,
        COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium_priority_tasks,
        COUNT(*) FILTER (WHERE priority = 'high')::int AS high_priority_tasks,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'done')::int AS overdue_tasks
       FROM tasks
       WHERE user_id = $1::int`,
      [userId]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении статистики' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      title,
      description = '',
      status,
      priority,
      due_date
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Название задачи обязательно' });
    }

    const safeStatus = status || 'new';
    const safePriority = priority || 'medium';
    const safeDueDate = due_date && String(due_date).trim() !== '' ? due_date : null;

    if (!isValidStatus(safeStatus)) {
      return res.status(400).json({ message: 'Недопустимый статус задачи' });
    }

    if (!isValidPriority(safePriority)) {
      return res.status(400).json({ message: 'Недопустимый приоритет задачи' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1::varchar(255),
           description = $2::text,
           status = $3::varchar(20),
           priority = $4::varchar(20),
           due_date = $5::date,
           updated_at = NOW(),
           completed_at = CASE
             WHEN $3::varchar(20) = 'done' THEN COALESCE(completed_at, NOW())
             ELSE NULL
           END
       WHERE id = $6::int AND user_id = $7::int
       RETURNING *`,
      [title.trim(), description, safeStatus, safePriority, safeDueDate, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    const task = result.rows[0];

    await Promise.allSettled([
      createNotification(
        userId,
        'task_updated',
        `Изменена задача: ${task.title}`
      ),
      logAction(`user=${userId} action=task_updated task=${task.id}`)
    ]);

    res.json({
      message: 'Задача обновлена',
      task
    });
  } catch (error) {
    console.error('Update task error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при обновлении задачи' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidStatus(status)) {
      return res.status(400).json({ message: 'Недопустимый статус задачи' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1::varchar(20),
           updated_at = NOW(),
           completed_at = CASE
             WHEN $1::varchar(20) = 'done' THEN COALESCE(completed_at, NOW())
             ELSE NULL
           END
       WHERE id = $2::int AND user_id = $3::int
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    const task = result.rows[0];

    await Promise.allSettled([
      createNotification(
        userId,
        'task_status_changed',
        `Изменён статус задачи: ${task.title}`
      ),
      logAction(`user=${userId} action=task_status_changed task=${task.id}`)
    ]);

    res.json({
      message: 'Статус задачи обновлён',
      task
    });
  } catch (error) {
    console.error('Update status error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при изменении статуса' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1::int AND user_id = $2::int
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    const deletedTask = result.rows[0];

    await Promise.allSettled([
      createNotification(
        userId,
        'task_deleted',
        `Удалена задача: ${deletedTask.title}`
      ),
      logAction(`user=${userId} action=task_deleted task=${deletedTask.id}`)
    ]);

    res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('Delete task error:', error.message);
    console.error(error);
    res.status(500).json({ message: 'Ошибка при удалении задачи' });
  }
};