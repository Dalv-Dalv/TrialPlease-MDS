# Project Changelog: Django Integration

This document tracks all the additions and modifications made to integrate the new Django backend with the React frontend.

## 1. Backend Initialization (`Django_Backend/`)
* **Created Django Project:** Initialized a new Django project named `backend` and an application named `api`.
* **Installed Dependencies:** Added `djangorestframework` for API capabilities and `django-cors-headers` to allow communication from the Vite frontend.
* **Database & Superuser:** Ran the initial SQLite migrations and created a test superuser account (`admin` / `password123`).
* **Settings Configuration (`settings.py`):** 
  * Added `rest_framework`, `rest_framework.authtoken`, `corsheaders`, and `api` to `INSTALLED_APPS`.
  * Added `CorsMiddleware` to the `MIDDLEWARE` stack.
  * Configured `CORS_ALLOWED_ORIGINS` to allow requests from `http://localhost:5173`.
  * Configured Django REST Framework to use `TokenAuthentication` by default.
* **Routing (`urls.py`):** Exposed the `/api/login/` endpoint by directly routing it to DRF's built-in `obtain_auth_token` view.
* **Requirements:** Generated a `requirements.txt` file using `pip freeze` to track Python dependencies for other developers.

## 2. Frontend Updates (`R3F_Frontend/`)
* **`src/store/authContext.ts`:** 
  * Updated the `User` object to expect a `username` and an authentication `token`. 
  * Updated the `login` function signature to accept a `username` and `password` and made it asynchronous.
* **`src/store/auth.tsx`:** 
  * Replaced the "mock" login logic with an actual HTTP POST `fetch` request to `http://localhost:8000/api/login/`.
  * Configured it to save the secure `token` returned by Django into the application state and `localStorage`.
* **`src/pages/auth/login/Login.tsx`:** 
  * Changed the email input field to a `username` field.
  * Updated the submit handler to securely pass the username and password to the asynchronous `login` function.
  * Added a `try/catch` block and UI state to display red error text if the Django backend rejects the login credentials.

## 3. Configuration & Documentation (Root Directory)
* **`.gitignore`:** Created a comprehensive Git ignore file to prevent pushing the Python virtual environment (`venv/`), cache files (`__pycache__/`), and node modules (`node_modules/`). *Note: `db.sqlite3` was intentionally kept out of the gitignore so the test admin account can be shared via GitHub.*
* **`SETUP.md`:** Created a dedicated markdown file containing step-by-step terminal instructions for cloning the repo, starting the Django backend, starting the React frontend, and logging in.
