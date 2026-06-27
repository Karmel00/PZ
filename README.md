# NoteSync

## Opis projektu

NoteSync to aplikacja do tworzenia i synchronizacji notatek między aplikacją webową (PWA) oraz aplikacją mobilną (Android).

## Główne funkcjonalności

- Rejestracja użytkownika
- Logowanie JWT
- Tworzenie notatek
- Edycja notatek
- Usuwanie notatek
- Tagi notatek
- Synchronizacja danych między urządzeniami
- Powiadomienia mobilne

## Technologie

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT Authentication

### PWA
- React + Vite
- Service Worker
- IndexedDB

### Mobile
- React Native (Expo)
- AsyncStorage
- Expo Notifications

### Infra
- Docker
- Docker Compose

## Uruchomienie projektu

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### PWA

```bash
cd pwa
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Testy

Backend:

```bash
http://localhost:5173
```

#### MOBILE

```bash
http://<IP_komputera>:5173
```

Mobile:

```bash
npm test
```