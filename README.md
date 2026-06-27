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

###Wymagania:

- Docker
- Docker Compose

### Start

```bash
docker compose up --build
```

### Dostęp

#### WEB

```bash
http://localhost:5173
```

#### MOBILE

```bash
http://<IP_komputera>:5173
```
