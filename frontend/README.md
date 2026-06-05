# Bishkek Parking AI — Frontend

Frontend часть дипломного проекта **Bishkek Parking AI**.

Проект представляет собой web-интерфейс для интеллектуальной системы мониторинга, анализа, прогнозирования и рекомендации парковок города Бишкек. Frontend работает отдельно от backend и подключается к локальному FastAPI API.

## Стек

- React
- Vite
- JavaScript
- React Router
- Axios
- Leaflet
- React Leaflet
- OpenStreetMap
- Chart.js
- React Chart.js 2
- CSS

В проекте не используются Docker, Next.js, TypeScript, Redux, Google Maps API и UI-библиотеки вроде MUI/Ant Design.

## Требования

- Node.js 18 или новее
- npm
- Запущенный backend на FastAPI
- PostgreSQL должен быть настроен на стороне backend

Backend запускается отдельно:

```powershell
cd C:\Users\astana\Desktop\parking_ai\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload