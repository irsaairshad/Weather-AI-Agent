"""Build and run Nimbus as one server on port 8000."""

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = ROOT / ".venv"


def load_root_env() -> dict[str, str]:
    environment = os.environ.copy()
    env_file = ROOT / ".env"

    if not env_file.exists():
        raise SystemExit("The root .env file is missing.")

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)

        environment[key.strip()] = (
            value.strip().strip('"').strip("'")
        )

    return environment


def get_venv_python() -> Path:
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"

    return VENV / "bin" / "python"


def prepare_python() -> Path:
    python = get_venv_python()

    if not python.exists():
        print("Creating Python environment...")
        subprocess.run(
            [sys.executable, "-m", "venv", str(VENV)],
            check=True,
        )

    print("Checking Python dependencies...")

    subprocess.run(
        [
            str(python),
            "-m",
            "pip",
            "install",
            "-r",
            str(BACKEND / "requirements.txt"),
        ],
        check=True,
    )

    return python


def build_frontend(environment: dict[str, str]) -> None:
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")

    if not npm:
        raise SystemExit(
            "Node.js/npm is missing. Install Node.js 18 or newer."
        )

    if not (FRONTEND / "node_modules").exists():
        print("Installing frontend dependencies...")

        subprocess.run(
            [npm, "install"],
            cwd=FRONTEND,
            env=environment,
            check=True,
        )

    print("Building frontend...")

    subprocess.run(
        [npm, "run", "build"],
        cwd=FRONTEND,
        env=environment,
        check=True,
    )


def main() -> None:
    environment = load_root_env()
    python = prepare_python()
    build_frontend(environment)

    print("")
    print("Nimbus Weather AI is running")
    print("Application: http://localhost:8000")
    print("API docs:   http://localhost:8000/docs")
    print("Press Ctrl+C to stop.")
    print("")

    subprocess.run(
        [
            str(python),
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=BACKEND,
        env=environment,
        check=True,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nNimbus stopped.")