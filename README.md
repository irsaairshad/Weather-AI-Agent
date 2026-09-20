# Nimbus Weather AI

A responsive weather dashboard and streaming AI weather assistant inspired by the supplied Horizon/OpenWeather references.

## Project structure

- `frontend/` — Next.js + React dashboard
- `backend/main.py` — FastAPI application and weather endpoints
- `backend/weather_service.py` — OpenWeather API integration
- `backend/chatbot.py` — LangChain + Gemini streaming assistant
- `.env` — the single environment configuration file for both apps

## Run locally — one command

Requirements: Python 3.10+ and Node.js 18+.

1. Put your real OpenWeather and Gemini keys in the **single root `.env`**.
2. From this root folder, run:

   ```bash
   python run.py
   ```

   If your system names Python `python3`, use `python3 run.py`.

3. Open `http://localhost:3000`.

The launcher installs missing dependencies on its first run and starts both the
React frontend and Python backend. Press `Ctrl+C` once to stop both services.

### VS Code

Open the **root `nimbus-weather-ai` folder**, not the `frontend` or `backend`
folder alone. Run `python run.py` once so `.venv` receives its packages. The
included workspace settings then point Pylance at that environment. If VS Code
was already open, run **Developer: Reload Window** from the Command Palette.

Without API keys, the frontend stays usable with polished demo data. The backend returns clear configuration errors until keys are supplied.
