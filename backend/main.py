"""FastAPI entrypoint for the complete Nimbus application."""

import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from chatbot import stream_weather_answer
from weather_service import get_weather


ROOT_DIRECTORY = Path(__file__).resolve().parents[1]
FRONTEND_OUT = ROOT_DIRECTORY / "frontend" / "out"

# Frontend and backend use the same root environment file.
load_dotenv(ROOT_DIRECTORY / ".env")

app = FastAPI(
    title="Nimbus Weather API",
    version="1.0.0",
)

# Keep weather responses for five minutes. This prevents every chat message
# from making current, forecast and air-quality API requests again.
WEATHER_CACHE: dict[
    str,
    tuple[float, dict[str, Any]],
] = {}

WEATHER_CACHE_SECONDS = 300


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=1000,
    )

    city: str = Field(
        default="Islamabad",
        min_length=1,
        max_length=100,
    )

    history: list[dict[str, str]] = Field(
        default_factory=list,
    )


async def get_cached_weather(
    city: str,
) -> dict[str, Any]:
    """Get weather from cache or OpenWeather."""

    normalized_city = city.strip()

    if not normalized_city:
        raise ValueError("A city name is required.")

    cache_key = normalized_city.lower()
    cached = WEATHER_CACHE.get(cache_key)

    if cached:
        saved_at, weather_data = cached
        cache_age = time.monotonic() - saved_at

        if cache_age < WEATHER_CACHE_SECONDS:
            return weather_data

        WEATHER_CACHE.pop(cache_key, None)

    weather_data = await get_weather(normalized_city)

    WEATHER_CACHE[cache_key] = (
        time.monotonic(),
        weather_data,
    )

    return weather_data


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
    }


@app.get("/api/weather")
async def weather(
    city: str = "Islamabad",
) -> dict[str, Any]:
    try:
        return await get_cached_weather(city)

    except httpx.HTTPStatusError as error:
        status = error.response.status_code

        if status == 401:
            detail = "OpenWeather rejected the API key."

        elif status == 404:
            detail = f"City '{city}' was not found."

        elif status == 429:
            detail = (
                "OpenWeather rate limit reached. "
                "Please wait and try again."
            )

        else:
            detail = (
                f"OpenWeather request failed with status {status}."
            )

        raise HTTPException(
            status_code=502,
            detail=detail,
        ) from error

    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=504,
            detail="OpenWeather took too long to respond.",
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@app.post("/api/chat/stream")
async def chat_stream(
    body: ChatRequest,
) -> StreamingResponse:
    # Convert Pydantic model once, avoiding attribute-access issues.
    request_data = body.model_dump()

    requested_city = str(
        request_data.get("city") or "Islamabad"
    ).strip()

    question = str(
        request_data.get("message") or ""
    ).strip()

    conversation_history = request_data.get(
        "history",
        [],
    )

    if not isinstance(conversation_history, list):
        conversation_history = []

    async def events():
        try:
            # Reuse cached dashboard weather.
            try:
                weather_data = await asyncio.wait_for(
                    get_cached_weather(requested_city),
                    timeout=2.5,
                )

                weather_context = json.dumps(
                    weather_data,
                    ensure_ascii=False,
                )

            except Exception as weather_error:
                weather_context = (
                    f"Selected city: {requested_city}. "
                    "Live weather data is temporarily unavailable. "
                    "Do not invent exact temperatures or conditions. "
                    f"Weather error: {weather_error}"
                )

            history_text = "\n".join(
                (
                    f"{item.get('role', 'user')}: "
                    f"{item.get('content', '')}"
                )
                for item in conversation_history[-6:]
                if isinstance(item, dict)
                and str(item.get("content", "")).strip()
            )

            async for token in stream_weather_answer(
                question=question,
                weather_context=weather_context,
                conversation_history=(
                    history_text
                    or "No previous conversation."
                ),
            ):
                yield (
                    json.dumps(
                        {
                            "token": token,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            yield (
                json.dumps(
                    {
                        "done": True,
                    }
                )
                + "\n"
            )

        except asyncio.CancelledError:
            raise

        except Exception as error:
            yield (
                json.dumps(
                    {
                        "error": str(error),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if not FRONTEND_OUT.exists():
    raise RuntimeError(
        f"Frontend build not found: {FRONTEND_OUT}. "
        "Run the frontend build before starting the server."
    )

app.mount(
    "/",
    StaticFiles(directory=FRONTEND_OUT, html=True),
    name="frontend",
)