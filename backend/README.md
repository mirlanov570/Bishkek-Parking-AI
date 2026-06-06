# Bishkek Parking AI — Backend

Backend часть дипломного проекта **Bishkek Parking AI**.

Проект представляет собой серверную часть интеллектуальной веб-системы для мониторинга, анализа, прогнозирования и рекомендации парковок в городе Бишкек.

Backend работает с уже существующей PostgreSQL базой данных, восстановленной из dump. Новая структура БД с нуля не создаётся.

---

## 1. Основные функции backend

Backend выполняет следующие задачи:

- JWT авторизация пользователей;
- роли `admin` и `driver`;
- управление пользователями и ролями;
- управление парковками;
- управление зонами парковок;
- обновление загруженности парковок;
- хранение истории загруженности;
- parking request flow — запрос водителя “Ищу место”;
- генерация рекомендаций парковок;
- улучшенная формула рекомендаций;
- хранение уведомлений;
- хранение прогнозов;
- хранение метрик ML-модели;
- analytics dashboard;
- генерация demo data;
- обучение LinearRegression модели;
- прогнозирование загруженности парковок;
- локальная загрузка файлов;
- единый формат ошибок;
- логирование в `logs/app.log`;
- Swagger документация.

---

## 2. Стек

Backend:

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0 async style
- asyncpg
- Alembic
- Pydantic v2
- JWT
- python-jose
- passlib[bcrypt]
- python-dotenv
- uvicorn
- pandas
- numpy
- scikit-learn

Локальный запуск:

- Windows
- VS Code
- PowerShell
- локальная PostgreSQL
- без Docker

---

## 3. Основной запуск

Backend запускается из папки `backend`:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

После запуска:

```text
Backend: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
Health:  http://127.0.0.1:8000/health
```

---

## 4. Структура проекта

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── admin.py
│   │           ├── analytics.py
│   │           ├── files.py
│   │           ├── model_metrics.py
│   │           ├── notifications.py
│   │           ├── parking_requests.py
│   │           ├── parking_zones.py
│   │           ├── parkings.py
│   │           ├── predictions.py
│   │           ├── recommendations.py
│   │           ├── roles.py
│   │           ├── users.py
│   │           └── utils.py
│   │
│   ├── auth/
│   │   ├── dependencies.py
│   │   ├── router.py
│   │   └── schemas.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   ├── logging.py
│   │   └── security.py
│   │
│   ├── db/
│   │   ├── base.py
│   │   └── session.py
│   │
│   ├── models/
│   │   ├── enums.py
│   │   ├── model_metric.py
│   │   ├── notification.py
│   │   ├── parking.py
│   │   ├── parking_request.py
│   │   ├── parking_status_history.py
│   │   ├── parking_zone.py
│   │   ├── prediction.py
│   │   ├── recommendation.py
│   │   ├── role.py
│   │   └── user.py
│   │
│   ├── repositories/
│   │   ├── analytics_repository.py
│   │   ├── base.py
│   │   ├── demo_data_repository.py
│   │   ├── ml_prediction_repository.py
│   │   ├── model_metric_repository.py
│   │   ├── notification_repository.py
│   │   ├── parking_repository.py
│   │   ├── parking_request_repository.py
│   │   ├── parking_status_history_repository.py
│   │   ├── parking_zone_repository.py
│   │   ├── prediction_repository.py
│   │   ├── recommendation_repository.py
│   │   ├── recommendation_scoring_repository.py
│   │   ├── role_repository.py
│   │   └── user_repository.py
│   │
│   ├── schemas/
│   │   ├── analytics.py
│   │   ├── auth.py
│   │   ├── common.py
│   │   ├── demo.py
│   │   ├── file.py
│   │   ├── model_metric.py
│   │   ├── notification.py
│   │   ├── parking.py
│   │   ├── parking_request.py
│   │   ├── parking_status_history.py
│   │   ├── parking_zone.py
│   │   ├── prediction.py
│   │   ├── recommendation.py
│   │   ├── role.py
│   │   └── user.py
│   │
│   ├── services/
│   │   ├── analytics_service.py
│   │   ├── demo_data_service.py
│   │   ├── exceptions.py
│   │   ├── file_service.py
│   │   ├── ml_prediction_service.py
│   │   ├── model_metric_service.py
│   │   ├── notification_service.py
│   │   ├── parking_request_service.py
│   │   ├── parking_service.py
│   │   ├── parking_status_history_service.py
│   │   ├── parking_zone_service.py
│   │   ├── prediction_service.py
│   │   ├── recommendation_service.py
│   │   ├── role_service.py
│   │   └── user_service.py
│   │
│   └── utils/
│       ├── seed_admin.py
│       └── seed_demo_data.py
│
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 20260513_0001_baseline_existing_database.py
│
├── logs/
├── ml_models/
├── uploads/
├── alembic.ini
├── requirements.txt
├── .env
├── .env.example
└── README.md
```

---

## 5. Установка на Windows PowerShell

Перейти в папку backend:

```powershell
cd C:\path\to\project\backend
```

Создать virtual environment:

```powershell
python -m venv .venv
```

Активировать:

```powershell
.\.venv\Scripts\Activate.ps1
```

Если PowerShell блокирует активацию:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

После этого снова:

```powershell
.\.venv\Scripts\Activate.ps1
```

Обновить pip:

```powershell
python -m pip install --upgrade pip
```

Установить зависимости:

```powershell
pip install -r requirements.txt
```

Проверить зависимости:

```powershell
python -c "import fastapi, sqlalchemy, asyncpg, alembic, jose, passlib, pandas, numpy, sklearn; print('packages ok')"
```

---

## 6. `.env`

Если файла `.env` нет:

```powershell
Copy-Item .env.example .env
```

Пример `.env`:

```env
APP_NAME=Bishkek Parking AI
APP_ENV=local
DEBUG=True
API_V1_PREFIX=/api/v1

HOST=127.0.0.1
PORT=8000

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bishkek_parking_ai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123

DATABASE_URL=postgresql+asyncpg://postgres:123@localhost:5432/bishkek_parking_ai
SYNC_DATABASE_URL=postgresql://postgres:123@localhost:5432/bishkek_parking_ai

SECRET_KEY=change_this_secret_key_for_local_development
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

BACKEND_CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:8001,http://localhost:8001

UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
ALLOWED_UPLOAD_EXTENSIONS=.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx

LOG_DIR=logs
LOG_FILE=app.log
LOG_LEVEL=INFO
LOG_MAX_BYTES=5242880
LOG_BACKUP_COUNT=5

SEED_ADMIN_FULL_NAME=Администратор
SEED_ADMIN_EMAIL=administrator@example.com
SEED_ADMIN_PHONE=+996555123456
SEED_ADMIN_LOGIN=administrator
SEED_ADMIN_PASSWORD=admin123
SEED_ADMIN_LANGUAGE=ru
```

Если пароль PostgreSQL другой, изменить:

```env
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/bishkek_parking_ai
SYNC_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bishkek_parking_ai
```

---

## 7. PostgreSQL и восстановление dump

База данных уже реализована как PostgreSQL dump.

Если база ещё не восстановлена:

```powershell
psql -U postgres -f "C:\path\to\dump-bishkek_parking_ai-202605130833.sql"
```

Если база уже существует и нужно пересоздать её:

```powershell
dropdb -U postgres bishkek_parking_ai
psql -U postgres -f "C:\path\to\dump-bishkek_parking_ai-202605130833.sql"
```

Проверить таблицы:

```powershell
psql -U postgres -d bishkek_parking_ai -c "\dt public.*"
```

Ожидаемые таблицы:

```text
roles
users
parkings
parking_zones
parking_status_history
parking_requests
predictions
recommendations
notifications
model_metrics
```

Проверить views:

```powershell
psql -U postgres -d bishkek_parking_ai -c "\dv public.*"
```

---

## 8. Alembic baseline

Так как база уже создана из dump, первая миграция является baseline.

Проверить историю:

```powershell
alembic history
```

Проверить текущую версию:

```powershell
alembic current
```

Если версия не проставлена:

```powershell
alembic stamp head
```

Проверить таблицу Alembic:

```powershell
psql -U postgres -d bishkek_parking_ai -c "SELECT * FROM alembic_version;"
```

---

## 9. Создание admin пользователя

В dump есть роли, но admin пользователя может не быть.

Создать admin:

```powershell
python -m app.utils.seed_admin
```

Ожидаемо:

```text
Admin user created successfully.
login: administrator
email: administrator@example.com
password: admin123
```

Если пользователь уже существует:

```text
Admin user already exists.
```

Проверить:

```powershell
psql -U postgres -d bishkek_parking_ai -c "SELECT id, full_name, email, login, role_id, is_active, is_deleted FROM users;"
```

---

## 10. Запуск backend

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Открыть Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## 11. Health checks

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method GET
```

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health/db" -Method GET
```

---

## 12. JWT авторизация

Login endpoint работает как OAuth2 form endpoint.

Login:

```powershell
$response = Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "username=administrator&password=admin123"

$accessToken = $response.access_token
$refreshToken = $response.refresh_token
```

Проверить текущего пользователя:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/auth/me" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Refresh:

```powershell
$refreshBody = @{
    refresh_token = $refreshToken
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/auth/refresh" `
    -Method POST `
    -ContentType "application/json" `
    -Body $refreshBody
```

Logout:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/auth/logout" `
    -Method POST `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

---

## 13. Swagger авторизация

Открыть:

```text
http://127.0.0.1:8000/docs
```

Нажать **Authorize**.

Ввести:

```text
username: administrator
password: admin123
```

Поля `client_id` и `client_secret` оставить пустыми.

---

## 14. Основные endpoint’ы

### System

```text
GET /health
GET /health/db
GET /docs
GET /api/v1/ping
```

### Auth

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

### Users and roles

```text
GET    /api/v1/users
GET    /api/v1/users/{user_id}
POST   /api/v1/users
PATCH  /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}

GET   /api/v1/roles
GET   /api/v1/roles/{role_id}
POST  /api/v1/roles
PATCH /api/v1/roles/{role_id}
```

### Parkings

```text
GET    /api/v1/parkings
GET    /api/v1/parkings/{parking_id}
POST   /api/v1/parkings
PATCH  /api/v1/parkings/{parking_id}
PATCH  /api/v1/parkings/{parking_id}/status
DELETE /api/v1/parkings/{parking_id}
GET    /api/v1/parkings/{parking_id}/history
```

### Parking zones

```text
GET    /api/v1/parkings/{parking_id}/zones
POST   /api/v1/parkings/{parking_id}/zones
GET    /api/v1/zones/{zone_id}
PATCH  /api/v1/zones/{zone_id}
PATCH  /api/v1/zones/{zone_id}/status
DELETE /api/v1/zones/{zone_id}
```

### Parking requests

```text
POST  /api/v1/parking-requests
GET   /api/v1/parking-requests/my
GET   /api/v1/parking-requests
GET   /api/v1/parking-requests/by-parking/{parking_id}
GET   /api/v1/parking-requests/{request_id}
PATCH /api/v1/parking-requests/{request_id}/status
POST  /api/v1/parking-requests/{request_id}/cancel
POST  /api/v1/parking-requests/{request_id}/recommend
```

### Recommendations

```text
POST /api/v1/recommendations
GET  /api/v1/recommendations/my
GET  /api/v1/recommendations/{recommendation_id}
```

### Notifications

```text
GET   /api/v1/notifications
POST  /api/v1/notifications
PATCH /api/v1/notifications/{notification_id}/read
```

### Predictions

```text
GET    /api/v1/predictions
GET    /api/v1/predictions/{prediction_id}
POST   /api/v1/predictions
PATCH  /api/v1/predictions/{prediction_id}
DELETE /api/v1/predictions/{prediction_id}

POST   /api/v1/predictions/train
POST   /api/v1/predictions/predict
```

### Model metrics

```text
GET    /api/v1/model-metrics
GET    /api/v1/model-metrics/latest
GET    /api/v1/model-metrics/{metric_id}
POST   /api/v1/model-metrics
PATCH  /api/v1/model-metrics/{metric_id}
DELETE /api/v1/model-metrics/{metric_id}
```

### Analytics

```text
GET /api/v1/analytics/dashboard
GET /api/v1/analytics/popular-parkings
GET /api/v1/analytics/peak-hours
GET /api/v1/analytics/daily-load
GET /api/v1/analytics/weekdays-vs-weekends
GET /api/v1/analytics/parking-load/{parking_id}
```

### Admin

```text
POST /api/v1/admin/seed-demo-data
```

### Files

```text
POST /api/v1/files/upload
GET  /uploads/{filename}
```

---

## 15. Demo data generator

Demo data generator создаёт:

- 10 demo парковок Бишкека;
- зоны парковок;
- demo driver пользователей;
- историю загруженности;
- parking requests;
- recommendations;
- notifications;
- predictions;
- model metrics.

CLI запуск:

```powershell
python -m app.utils.seed_demo_data
```

С очисткой старых demo data:

```powershell
$env:DEMO_RESET="true"
python -m app.utils.seed_demo_data
Remove-Item Env:\DEMO_RESET
```

Через API:

```powershell
$seedBody = @{
    reset = $true
    days = 90
    history_points_per_day = 6
    drivers_count = 5
    requests_count = 80
    predictions_count = 60
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/admin/seed-demo-data" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $seedBody
```

Demo driver login:

```text
login: demo_driver_1
password: demo123
```

---

## 16. Analytics

Dashboard:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/dashboard" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Popular parkings:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/popular-parkings?limit=10&offset=0" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Peak hours:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/peak-hours" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Daily load:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/daily-load?limit=30&offset=0" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Weekdays vs weekends:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/weekdays-vs-weekends" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Parking load trend:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/analytics/parking-load/1?limit=100&offset=0" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

---

## 17. LinearRegression prediction module

Модуль обучает модель по таблице:

```text
parking_status_history
```

Используемые признаки:

```text
parking_id
hour
day_of_week
month
is_weekend
total_places
previous_load_percentage
average_load_same_hour
```

Целевое значение:

```text
occupied_places
```

Обучить общую модель:

```powershell
$trainBody = @{
    parking_id = $null
    test_size = 0.2
    min_rows = 30
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/v1/predictions/train" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $trainBody
```

Обучить модель для одной парковки:

```powershell
$trainBody = @{
    parking_id = 1
    test_size = 0.2
    min_rows = 30
} | ConvertTo-Json

Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/predictions/train" `
    -Uri "$BASE_URL/api/v1/predictions/train" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $trainBody
```

Модели сохраняются в:

```text
ml_models/
```

Сделать прогноз:

```powershell
$predictBody = @{
    parking_id = 1
    prediction_datetime = "2026-05-13T18:00:00+06:00"
} | ConvertTo-Json

Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/predictions/predict" `
    -Uri "$BASE_URL/api/v1/predictions/predict" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $predictBody
```

Результат сохраняется в:

```text
predictions
```

Метрики обучения сохраняются в:

```text
model_metrics
```

---

## 18. Improved recommendation formula

Рекомендация выбирает парковку по score. Чем меньше score, тем лучше парковка.

Формула:

```text
score =
distance_score * 0.25
+ current_load_score * 0.25
+ predicted_load_score * 0.25
+ free_places_penalty * 0.15
+ popularity_score * 0.10
```

Учитывается:

- расстояние до парковки;
- текущая загруженность;
- прогнозируемая загруженность;
- ожидаемое количество свободных мест;
- популярность парковки за период.

Создать рекомендацию напрямую:

```powershell
$recommendationBody = @{
    requested_parking_id = 1
    user_latitude = 42.870000
    user_longitude = 74.610000
    use_prediction = $true
    popularity_days = 30
} | ConvertTo-Json

Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/recommendations" `
    -Uri "$BASE_URL/api/v1/recommendations" `

    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $recommendationBody
```

Создать рекомендацию по parking request:

```powershell
$recommendBody = @{
    user_latitude = 42.870000
    user_longitude = 74.610000
    use_prediction = $true
    popularity_days = 30
} | ConvertTo-Json

Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/parking-requests/$($parkingRequest.id)/recommend" `
    -Uri "$BASE_URL/api/v1/parking-requests/$($parkingRequest.id)/recommend" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $recommendBody
```

В ответе будут:

```text
distance_km
current_load_percentage
predicted_load_percentage
expected_free_places
score
reason
```

---

## 19. Parking request flow

Так как в БД нет таблиц `bookings`, `reservations` и `parking_spots`, система реализует не бронь конкретного места, а запрос:

```text
“Ищу место”
```

Создать запрос:

```powershell
$requestBody = @{
    parking_id = 1
    user_latitude = 42.870000
    user_longitude = 74.610000
} | ConvertTo-Json

$parkingRequest = Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/parking-requests" `
    -Uri "$BASE_URL/api/v1/parking-requests" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $requestBody
```

Получить мои запросы:

```powershell
Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/parking-requests/my" `
    -Uri "$BASE_URL/api/v1/parking-requests/my" `
    -Method GET `
    -Headers @{
        Authorization = "Bearer $accessToken"
    }
```

Отменить запрос:

```powershell
$cancelBody = @{
    reason = "Пользователь отменил запрос"
} | ConvertTo-Json

Invoke-RestMethod `
    #-Uri "http://127.0.0.1:8000/api/v1/parking-requests/$($parkingRequest.id)/cancel" `
    -Uri "$BASE_URL/api/v1/parking-requests/$($parkingRequest.id)/cancel" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -Body $cancelBody
```

---

## 20. Локальная загрузка файлов

Файлы сохраняются в:

```text
uploads/
```

Загрузить файл:

```powershell
#curl.exe -X POST "http://127.0.0.1:8000/api/v1/files/upload" `
curl.exe -X POST "$BASE_URL/api/v1/files/upload" `
  -H "Authorization: Bearer $accessToken" `
  -F "file=@test-upload.pdf"
```

Открыть файл:

```text
#http://127.0.0.1:8000/uploads/<filename>
/uploads/my-file.pdf
```

Путь файла не сохраняется в БД, потому что в dump нет таблицы или поля для файлов.

---

## 21. Единый формат ошибок

Формат:

```json
{
  "detail": "Описание ошибки",
  "code": "ERROR_CODE"
}
```

Пример:

```json
{
  "detail": "Parking has no free places",
  "code": "PARKING_HAS_NO_FREE_PLACES"
}
```

Обрабатываются:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

---

## 22. Логирование

Логи пишутся в:

```text
logs/app.log
```

Проверить:

```powershell
Get-Content .\logs\app.log -Tail 50
```

Логируются:

- startup;
- shutdown;
- ошибки;
- traceback;
- login events;
- parking request events;
- ML training events;
- ML prediction events;
- recommendation events.

Не логируются:

- password;
- access token;
- refresh token.

Проверка:

```powershell
Select-String -Path .\logs\app.log -Pattern "admin123"
```

Ожидаемо: ничего не найдено.

---

## 23. Подключение будущего Django frontend

Backend base URL:

```text
#http://127.0.0.1:8000

```

API prefix:

```text
/api/v1
```

Пример:

```text
#http://127.0.0.1:8000/api/v1/parkings
-Uri "$BASE_URL/api/v1/parkings" `
```

В `.env` добавить адрес Django frontend:

```env
BACKEND_CORS_ORIGINS=http://127.0.0.1:8001,http://localhost:8001
```

Авторизация frontend:

1. Django отправляет login:

```text
POST http://127.0.0.1:8000/api/v1/auth/login
```

Content-Type:

```text
application/x-www-form-urlencoded
```

Body:

```text
username=administrator&password=admin123
```

2. Backend возвращает JWT tokens.

3. Django отправляет закрытые запросы с header:

```text
Authorization: Bearer <access_token>
```

---

## 24. Сценарий демонстрации для дипломной защиты

### Шаг 1. Показать структуру проекта

Открыть проект в VS Code и показать слои:

```text
api
services
repositories
models
schemas
core
db
auth
```

Кратко объяснить:

```text
api — FastAPI endpoints
services — бизнес-логика
repositories — SQL-запросы
models — SQLAlchemy models
schemas — Pydantic schemas
core — config, security, errors, logging
db — SQLAlchemy session
```

---

### Шаг 2. Проверить БД

```powershell
psql -U postgres -d bishkek_parking_ai -c "\dt public.*"
```

Показать таблицы:

```text
parkings
parking_zones
parking_status_history
parking_requests
predictions
recommendations
notifications
model_metrics
users
roles
```

---

### Шаг 3. Проверить Alembic

```powershell
alembic current
```

Пояснить:

```text
База уже была создана из dump, поэтому Alembic используется с baseline.
```

---

### Шаг 4. Создать admin

```powershell
python -m app.utils.seed_admin
```

---

### Шаг 5. Сгенерировать demo data

```powershell
$env:DEMO_RESET="true"
python -m app.utils.seed_demo_data
Remove-Item Env:\DEMO_RESET
```

Пояснить:

```text
Создаются demo парковки Бишкека, история загруженности, пользователи, запросы, прогнозы и метрики.
```

---

### Шаг 6. Запустить backend

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Открыть:

```text
http://127.0.0.1:8000/docs
```

---

### Шаг 7. Проверить health

```text
GET /health
GET /health/db
```

---

### Шаг 8. Авторизоваться в Swagger

Нажать **Authorize**:

```text
username: administrator
password: admin123
```

---

### Шаг 9. Показать parkings

Проверить:

```text
GET /api/v1/parkings
```

Показать:

```text
total_places
occupied_places
free_places
load_percentage
load_level
load_color
```

---

### Шаг 10. Обновить загруженность

Проверить:

```text
PATCH /api/v1/parkings/{parking_id}/status
```

Пример body:

```json
{
  "occupied_places": 85
}
```

Показать, что:

```text
free_places
load_percentage
load_level
load_color
```

пересчитались автоматически.

---

### Шаг 11. Показать историю загруженности

```text
GET /api/v1/parkings/{parking_id}/history
```

Пояснить:

```text
История нужна для аналитики и ML-прогноза.
```

---

### Шаг 12. Показать analytics dashboard

```text
GET /api/v1/analytics/dashboard
GET /api/v1/analytics/popular-parkings
GET /api/v1/analytics/peak-hours
GET /api/v1/analytics/daily-load
GET /api/v1/analytics/weekdays-vs-weekends
```

Пояснить:

```text
Backend готов отдавать данные для dashboard и графиков frontend.
```

---

### Шаг 13. Обучить LinearRegression модель

```text
POST /api/v1/predictions/train
```

Body:

```json
{
  "parking_id": null,
  "test_size": 0.2,
  "min_rows": 30
}
```

Показать:

```text
MAE
MSE
R2
model_file
features
```

Пояснить:

```text
Модель обучается на parking_status_history и сохраняется локально в ml_models.
```

---

### Шаг 14. Сделать прогноз

```text
POST /api/v1/predictions/predict
```

Body:

```json
{
  "parking_id": 1,
  "prediction_datetime": "2026-05-13T18:00:00+06:00"
}
```

Показать:

```text
predicted_occupied_places
predicted_free_places
predicted_load_percentage
predicted_load_level
predicted_color
```

---

### Шаг 15. Показать parking request flow

Создать запрос:

```text
POST /api/v1/parking-requests
```

Body:

```json
{
  "parking_id": 1,
  "user_latitude": 42.87,
  "user_longitude": 74.61
}
```

Показать статус:

```text
created
```

---

### Шаг 16. Показать улучшенную рекомендацию

```text
POST /api/v1/parking-requests/{request_id}/recommend
```

Body:

```json
{
  "user_latitude": 42.87,
  "user_longitude": 74.61,
  "use_prediction": true,
  "popularity_days": 30
}
```

Показать:

```text
recommended_parking_id
distance_km
current_load_percentage
predicted_load_percentage
expected_free_places
score
reason
```

Пояснить формулу:

```text
score =
distance_score * 0.25
+ current_load_score * 0.25
+ predicted_load_score * 0.25
+ free_places_penalty * 0.15
+ popularity_score * 0.10
```

---

### Шаг 17. Показать notifications

```text
GET /api/v1/notifications
PATCH /api/v1/notifications/{notification_id}/read
```

---

### Шаг 18. Показать upload файлов

```text
POST /api/v1/files/upload
```

Пояснить:

```text
Файлы хранятся локально в uploads.
```

---

### Шаг 19. Показать ошибки

Например, вызвать endpoint без токена:

```text
GET /api/v1/auth/me
```

Показать формат:

```json
{
  "detail": "Not authenticated",
  "code": "UNAUTHORIZED"
}
```

---

### Шаг 20. Показать логи

```powershell
Get-Content .\logs\app.log -Tail 50
```

Показать:

```text
startup
login success
parking request created
ML training completed
ML prediction created
recommendation created
```

Пояснить:

```text
Пароли и токены не логируются.
```

---

## 25. Ограничения текущей версии

В текущем dump нет:

```text
payments
parking_spots
bookings
reservations
files table
parking images table
refresh token table
```

Поэтому:

- оплата не реализована;
- бронирование конкретного парковочного места не реализовано;
- вместо бронирования используется `parking_requests`;
- файлы сохраняются локально, но путь не записывается в БД;
- logout stateless;
- refresh tokens не хранятся в БД.

---

## 26. Статус проекта

Backend готов для локальной демонстрации дипломного проекта.

Реализовано:

```text
FastAPI app
PostgreSQL connection
Alembic baseline
SQLAlchemy models
Pydantic schemas
JWT authorization
repositories layer
services layer
API endpoints
parking request flow
analytics endpoints
demo data generator
LinearRegression prediction module
improved recommendation formula
notifications
predictions
model metrics
local file upload
global error handling
logging
Swagger documentation
Django frontend compatibility
```