document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    const userInfo = document.getElementById('userInfo');
    const taskForm = document.getElementById('taskForm');
    const taskIdInput = document.getElementById('taskId');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const statusInput = document.getElementById('status');
    const priorityInput = document.getElementById('priority');
    const dueDateInput = document.getElementById('due_date');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const taskFormTitle = document.getElementById('taskFormTitle');

    const tasksContainer = document.getElementById('tasksContainer');
    const statsContainer = document.getElementById('statsContainer');
    const notificationsContainer = document.getElementById('notificationsContainer');

    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userInfo) {
        userInfo.textContent = `Вы вошли как: ${user.name} (${user.email})`;
    }

    let filters = {
        search: '',
        status: '',
        priority: '',
        sort_by: 'created_at',
        sort_order: 'desc'
    };

    const statusText = {
        new: 'Новая',
        in_progress: 'В работе',
        done: 'Выполнена'
    };

    const priorityText = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий'
    };

    async function loadTasks() {
    try {
        const params = new URLSearchParams({
            search: filters.search,
            status: filters.status,
            priority: filters.priority,
            sort_by: filters.sort_by,
            sort_order: filters.sort_order
        });

        const response = await fetch(`${API_BASE}/tasks?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            tasksContainer.innerHTML = `<p class="message error">${data.message || 'Ошибка загрузки задач'}</p>`;
            return;
        }

        renderTasks(data.tasks || []);
    } catch (error) {
        console.error('Load tasks error:', error);
        tasksContainer.innerHTML = '<p class="message error">Ошибка загрузки задач</p>';
    }
}

    async function loadStats() {
        try {
            const response = await fetch(`${API_BASE}/tasks/stats?user_id=${user.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                statsContainer.innerHTML = `<p class="message error">${data.message || 'Ошибка загрузки статистики'}</p>`;
                return;
            }

            renderStats(data.stats || {});
        } catch (error) {
            console.error('Load stats error:', error);
            statsContainer.innerHTML = '<p class="message error">Ошибка загрузки статистики</p>';
        }
    }

    async function loadNotifications() {
        try {
            const response = await fetch(`${API_BASE}/notifications?limit=10`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                notificationsContainer.innerHTML = `<p class="message error">${data.message || 'Ошибка загрузки уведомлений'}</p>`;
                return;
            }

            renderNotifications(data.notifications || []);
        } catch (error) {
            console.error('Load notifications error:', error);
            notificationsContainer.innerHTML = '<p class="message error">Ошибка загрузки уведомлений</p>';
        }
    }

    function renderStats(stats) {
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><span>Всего</span><strong>${stats.total_tasks || 0}</strong></div>
                <div class="stat-card"><span>Новые</span><strong>${stats.new_tasks || 0}</strong></div>
                <div class="stat-card"><span>В работе</span><strong>${stats.in_progress_tasks || 0}</strong></div>
                <div class="stat-card"><span>Выполнены</span><strong>${stats.done_tasks || 0}</strong></div>
                <div class="stat-card"><span>Просрочены</span><strong>${stats.overdue_tasks || 0}</strong></div>
                <div class="stat-card"><span>Высокий приоритет</span><strong>${stats.high_priority_tasks || 0}</strong></div>
            </div>
        `;
    }

    async function markNotificationRead(id) {
        try {
            const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Ошибка обновления уведомления');
                return;
            }

            loadNotifications();
        } catch (error) {
            console.error('Mark notification read error:', error);
            alert('Ошибка сети при обновлении уведомления');
        }
    }

function renderNotifications(notifications) {
    const typeLabels = {
        task_created: 'Создание задачи',
        task_updated: 'Изменение задачи',
        task_deleted: 'Удаление задачи',
        task_status_changed: 'Смена статуса',
    };

    if (!notifications.length) {
        notificationsContainer.innerHTML = '<p class="message">Уведомлений пока нет.</p>';
        return;
    }

    notificationsContainer.innerHTML = notifications.map(notification => {
        const label = typeLabels[notification.type] || notification.type;

        return `
            <div class="notification-card ${notification.is_read ? 'notification-read' : 'notification-unread'}">
                <div class="notification-top">
                    <strong>${label}</strong>
                    <span>${new Date(notification.created_at).toLocaleString('ru-RU')}</span>
                </div>
                <p>${notification.message}</p>
                ${
                    notification.is_read
                        ? '<span class="notification-status">Прочитано</span>'
                        : `<button class="btn btn-small" data-read-id="${notification.id}">Отметить прочитанным</button>`
                }
            </div>
        `;
    }).join('');

    document.querySelectorAll('[data-read-id]').forEach(btn => {
        btn.addEventListener('click', () => markNotificationRead(btn.dataset.readId));
    });
}

    function renderTasks(tasks) {
        if (!tasks.length) {
            tasksContainer.innerHTML = '<p class="message">Задач пока нет.</p>';
            return;
        }

        tasksContainer.innerHTML = tasks.map(task => `
            <div class="task-card">
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <span class="task-badge status-${task.status}">${statusText[task.status] || task.status}</span>
                </div>

                <p>${task.description || 'Без описания'}</p>

                <div class="task-meta">
                    <span>Приоритет: ${priorityText[task.priority] || task.priority}</span>
                    <span>Срок: ${task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'не указан'}</span>
                    <span>Создано: ${new Date(task.created_at).toLocaleString('ru-RU')}</span>
                </div>

                <div class="task-actions">
                    <button class="btn btn-small" data-action="edit" data-id="${task.id}">Редактировать</button>
                    <button class="btn btn-small btn-danger" data-action="delete" data-id="${task.id}">Удалить</button>
                </div>

                <div class="task-status-row">
                    <select class="task-status-select" data-status-id="${task.id}">
                        <option value="new" ${task.status === 'new' ? 'selected' : ''}>Новая</option>
                        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                        <option value="done" ${task.status === 'done' ? 'selected' : ''}>Выполнена</option>
                    </select>
                    <button class="btn btn-small" data-action="status" data-id="${task.id}">Сменить статус</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => startEditTask(btn.dataset.id, tasks));
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteTask(btn.dataset.id));
        });

        document.querySelectorAll('[data-action="status"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const select = document.querySelector(`[data-status-id="${id}"]`);
                updateStatus(id, select.value);
            });
        });
    }

    async function refreshAll() {
        await Promise.all([
            loadTasks(),
            loadStats(),
            loadNotifications()
        ]);
    }

    async function deleteTask(id) {
        const confirmDelete = confirm('Удалить задачу?');
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_BASE}/tasks/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Ошибка удаления задачи');
                return;
            }

            alert(result.message || 'Задача удалена');
            refreshAll();
        } catch (error) {
            console.error('Delete task error:', error);
            alert('Ошибка сети при удалении задачи');
        }
    }

    async function updateStatus(id, status) {
        try {
            const response = await fetch(`${API_BASE}/tasks/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status
                })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Ошибка изменения статуса');
                return;
            }

            alert(result.message || 'Статус обновлён');
            refreshAll();
        } catch (error) {
            console.error('Status update error:', error);
            alert('Ошибка сети при изменении статуса');
        }
    }

    function startEditTask(id, tasks) {
        const task = tasks.find(item => String(item.id) === String(id));
        if (!task) return;

        taskIdInput.value = task.id;
        titleInput.value = task.title;
        descriptionInput.value = task.description || '';
        statusInput.value = task.status;
        priorityInput.value = task.priority;
        dueDateInput.value = task.due_date ? task.due_date.split('T')[0] : '';

        saveTaskBtn.textContent = 'Сохранить изменения';
        taskFormTitle.textContent = 'Редактировать задачу';
        cancelEditBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetEditMode() {
        taskForm.reset();
        taskIdInput.value = '';
        saveTaskBtn.textContent = 'Создать задачу';
        taskFormTitle.textContent = 'Создать задачу';
        cancelEditBtn.classList.add('hidden');
        statusInput.value = 'new';
        priorityInput.value = 'medium';
    }

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(taskForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const isEditMode = Boolean(taskIdInput.value);
            const url = isEditMode
                ? `${API_BASE}/tasks/${taskIdInput.value}`
                : `${API_BASE}/tasks`;
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Ошибка сохранения задачи');
                return;
            }

            alert(result.message || 'Задача сохранена');
            resetEditMode();
            refreshAll();
        } catch (error) {
            console.error('Save task error:', error);
            alert('Ошибка сети при сохранении задачи');
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        resetEditMode();
    });

    applyFiltersBtn.addEventListener('click', () => {
        filters = {
            search: searchInput.value.trim(),
            status: statusFilter.value,
            priority: priorityFilter.value,
            sort_by: sortBy.value,
            sort_order: sortOrder.value
        };
        loadTasks();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        priorityFilter.value = '';
        sortBy.value = 'created_at';
        sortOrder.value = 'desc';

        filters = {
            search: '',
            status: '',
            priority: '',
            sort_by: 'created_at',
            sort_order: 'desc'
        };

        loadTasks();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    refreshAll();
});