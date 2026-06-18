jest.mock('../config/db', () => ({
  query: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  logAction: jest.fn().mockResolvedValue()
}));

jest.mock('../controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue()
}));

const pool = require('../config/db');
const { createTask, getStats } = require('../controllers/taskController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('taskController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createTask returns 201 on success', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        user_id: 1,
        title: 'Тестовая задача',
        description: '',
        status: 'new',
        priority: 'medium'
      }]
    });

    const req = {
      body: {
        user_id: 1,
        title: 'Тестовая задача',
        description: '',
        status: 'new',
        priority: 'medium'
      }
    };

    const res = mockRes();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('createTask returns 400 when title is missing', async () => {
    const req = {
      body: {
        user_id: 1,
        title: '',
        description: '',
        status: 'new',
        priority: 'medium'
      }
    };

    const res = mockRes();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('getStats returns statistics', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        total_tasks: 5,
        new_tasks: 2,
        in_progress_tasks: 1,
        done_tasks: 2,
        low_priority_tasks: 1,
        medium_priority_tasks: 2,
        high_priority_tasks: 2,
        overdue_tasks: 1
      }]
    });

    const req = {
      query: {
        user_id: 1
      }
    };

    const res = mockRes();

    await getStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      stats: expect.objectContaining({
        total_tasks: 5,
        overdue_tasks: 1
      })
    });
  });
});