# 1. Архитектура

## Стек технологий
- **Frontend**: React 18 + TypeScript, React Router, Material-UI, Recharts, Axios, SSE
- **Backend**: Fastify + Node.js + TypeScript, Google OAuth, JWT, SSE
- **База данных**: PostgreSQL 15
- **Очереди**: Redis
- **ML сервис**: Внешний API для анализа речи и текста
- **Развертывание**: Docker Compose + SSL + ngrok

## Архитектура
- Микросервисная архитектура с контейнеризацией
- Асинхронная обработка с Server-Sent Events (SSE)
- Фоновая обработка ML операций
- OAuth аутентификация через Google
- REST API с поддержкой загрузки аудиофайлов
- Bull Queue + Redis для управления очередями и retry-логики
- Circuit Breaker для защиты от сбоев

# 2. Развёртывание

## 2.1. ML Service
1. Создайте/обновите файл `.env` (пример есть в `.env.example`).

2. Выполните билд контейнера с сервисом и запустите его
```sh
docker compose build
docker compose up
```

3. Документация сервиса будет доступна по ссылке `http://{HOST}:{PORT}⁠/docs`

## 2.2. Backend + Frontend

Настройка переменных окружения

1. Создайте/обновите файл `.env` (пример есть в .env.example). Укажите соответствующий PITCH_ML_SERVICE_URL.

2. Запустите приложение

```sh
./scripts/dev-start.sh
```

3. Фронтенд будет доступен на 3005 порту.


## 2.3. При локальном развёртывании 

### 2.3.1. ML Service

См. п. 2.1.


### 2.3.2. Backend + frontend


#### Установка ngrok

1. Установи ngrok через homebrew:
   ```bash
   brew install ngrok
   ```

2. Зарегистрируйся на [ngrok.com](https://ngrok.com) и получи authtoken

3. Настрой authtoken:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```

4. Запусти туннель:
   ```bash
   ngrok http 3000 --host-header=localhost:3000
   ```
   
   Увидишь что-то вроде: `https://abc123.ngrok-free.app`

#### Настройка Google OAuth

1. Зайди в [Google Cloud Console](https://console.cloud.google.com)
2. Создай новый проект
3. Включи Google+ API
4. Перейди в **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Выбери **Web application**
6. Добавь **Authorized JavaScript origins**:
   - `https://localhost:3005`
   - `https://abc123.ngrok-free.app` (твой ngrok URL)
7. Добавь **Authorized redirect URIs**:
   - `https://abc123.ngrok-free.app/api/auth/google/callback`
8. Скопируй **Client ID** и **Client Secret** (понадобятся в .env)

#### Настройка SSL сертификатов

1. Сделай скрипт исполняемым и запусти:
   ```bash
   chmod +x setup-ssl.sh
   ./setup-ssl.sh
   ```

2. **Для тестирования с мобильного устройства:**
   - Подключись к той же Wi-Fi сети
   - Узнай свой локальный IP:
     ```bash
     ifconfig | grep 192
     ```
   - Запомни IP (это твой `{local_ip}`)

#### Настройка переменных окружения

Создай/обнови файл `.env` (пример есть в .env.example):

```bash
# Google OAuth
GOOGLE_CLIENT_ID={твой_client_id}
GOOGLE_CLIENT_SECRET={твой_client_secret}
GOOGLE_REDIRECT_URI=https://abc123.ngrok-free.app/api/auth/google/callback

# URLs
FRONTEND_URL=https://{local_ip}:3005
REACT_APP_API_URL=https://abc123.ngrok-free.app

# Security
JWT_SECRET=твой_32_символьный_секрет

# Database
POSTGRES_DB=pitchforge
POSTGRES_USER=pitchforge
POSTGRES_PASSWORD=твой_пароль

# ML Service
PITCH_ML_SERVICE_URL=http://{HOST}:{PORT}
```
#### Доступ к приложению

- **Локально (в т.ч. с телефона):** `https://{local_ip}:3005`
- **Backend API:** `https://abc123.ngrok-free.app/api`


