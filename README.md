# Task Management System

Веб-приложение для управления задачами с системой аутентификации пользователей, уведомлениями, статистикой и Docker-развёртыванием.

## Возможности

* Регистрация и авторизация пользователей
* JWT-аутентификация
* Создание, редактирование и удаление задач
* Изменение статуса задач
* Поиск задач
* Фильтрация по статусу и приоритету
* Сортировка задач
* Система уведомлений
* Статистика по задачам
* Работа с PostgreSQL
* Контейнеризация с Docker и Docker Compose
* Защита от SQL-инъекций с помощью параметризованных запросов

## Используемые технологии

### Backend

* Node.js
* Express.js
* PostgreSQL
* JWT
* bcryptjs

### Frontend

* HTML5
* CSS3
* JavaScript (ES6)

### DevOps

* Docker
* Docker Compose

## Структура проекта

```text
backend/
frontend/
docs/
docker-compose.yml
README.md
```

## Запуск проекта через Docker

### Требования

* Docker Desktop
* Docker Compose

### Запуск

Клонировать репозиторий:

```bash
git clone <repository_url>
cd Task-Management-System
```

Запустить контейнеры:

```bash
docker compose up --build
```

После запуска приложение будет доступно по адресу:

Frontend:

```text
http://localhost:8080
```

Backend API:

```text
http://localhost:3000
```

PostgreSQL:

```text
localhost:5432
```

## Переменные окружения

Пример файла `.env`:

```env
DB_HOST=db
DB_PORT=5432
DB_NAME=task_management_system
DB_USER=postgres
DB_PASSWORD=root

JWT_SECRET=your_secret_key_here

PORT=3000
```

## Основные API-маршруты

### Аутентификация

* POST `/api/auth/register`
* POST `/api/auth/login`

### Задачи

* GET `/api/tasks`
* POST `/api/tasks`
* PUT `/api/tasks/:id`
* DELETE `/api/tasks/:id`
* PATCH `/api/tasks/:id/status`

### Уведомления

* GET `/api/notifications`
* PATCH `/api/notifications/:id/read`

## Производительность

Нагрузочное тестирование выполнялось с использованием `autocannon`.

Пример команды:

```bash
npx autocannon -c 10 -d 15 http://localhost:3000/api/tasks/stats
```

## Безопасность

В проекте реализованы:

* JWT-аутентификация
* Хеширование паролей через bcryptjs
* Параметризованные SQL-запросы
* Разделение данных пользователей
* Проверка токенов доступа