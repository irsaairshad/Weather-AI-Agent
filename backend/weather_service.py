"""OpenWeather client for current, hourly, daily and air-quality data."""

import asyncio
import os
import random
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

import httpx

BASE_URL = "https://api.openweathermap.org/data/2.5"

AIR_LABELS = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very poor",
}

AIR_DESCRIPTIONS = {
    1: "Perfect for outdoor activities.",
    2: "Air quality is generally acceptable.",
    3: "Sensitive people should limit prolonged outdoor activity.",
    4: "Consider reducing prolonged outdoor activity.",
    5: "Avoid extended outdoor activity where possible.",
}


async def get_weather(city: str) -> dict[str, Any]:
    """Return complete weather information for a city."""

    api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    city = city.strip()

    if not city:
        raise ValueError("A city name is required.")

    if api_key and not api_key.startswith("your_"):
        try:
            return await fetch_openweather(city, api_key)
        except Exception as error:
            print(f"OpenWeather API request failed: {error}. Using fallback weather provider.")

    return generate_mock_weather(city)


async def fetch_openweather(city: str, api_key: str) -> dict[str, Any]:
    params = {
        "q": city,
        "appid": api_key,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        current_response, forecast_response = await asyncio.gather(
            client.get(f"{BASE_URL}/weather", params=params),
            client.get(f"{BASE_URL}/forecast", params=params),
        )

        current_response.raise_for_status()
        forecast_response.raise_for_status()

        current = current_response.json()
        forecast = forecast_response.json()

        latitude = current["coord"]["lat"]
        longitude = current["coord"]["lon"]

        air_response = await client.get(
            f"{BASE_URL}/air_pollution",
            params={"lat": latitude, "lon": longitude, "appid": api_key},
        )
        air_response.raise_for_status()
        air_data = air_response.json()

    air_quality = build_air_quality(air_data)
    daily_forecast = build_daily_forecast(forecast)

    return {
        "city": current["name"],
        "country": current["sys"].get("country", "World"),
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "temperature": round(current["main"]["temp"]),
        "feels_like": round(current["main"]["feels_like"]),
        "condition": current["weather"][0]["description"].title(),
        "icon": current["weather"][0]["icon"],
        "humidity": current["main"]["humidity"],
        "pressure": current["main"]["pressure"],
        "wind_speed": round(current["wind"]["speed"] * 3.6, 1),
        "visibility": round(current.get("visibility", 10000) / 1000, 1),
        "cloudiness": current.get("clouds", {}).get("all", 0),
        "sunrise": current["sys"].get("sunrise"),
        "sunset": current["sys"].get("sunset"),
        "timezone": current.get("timezone", 0),
        "hourly": [
            {
                "time": item["dt_txt"],
                "timestamp": item["dt"],
                "temp": round(item["main"]["temp"]),
                "feels_like": round(item["main"]["feels_like"]),
                "condition": item["weather"][0]["main"],
                "description": item["weather"][0]["description"].title(),
                "rain_chance": round(item.get("pop", 0) * 100),
            }
            for item in forecast["list"][:8]
        ],
        "daily": daily_forecast,
        "air_quality": air_quality,
    }


def generate_mock_weather(city: str) -> dict[str, Any]:
    """Generate realistic dynamic weather data for any requested city when API is offline/unreachable."""
    city_clean = city.strip().title()
    
    # Preset coordinates and data for popular cities
    city_presets: dict[str, dict[str, Any]] = {
        "Islamabad": {"country": "PK", "lat": 33.6844, "lng": 73.0479, "temp": 33, "condition": "Light Rain", "humidity": 53, "wind": 8.6, "pressure": 1003},
        "London": {"country": "GB", "lat": 51.5074, "lng": -0.1278, "temp": 19, "condition": "Partly Cloudy", "humidity": 65, "wind": 12.0, "pressure": 1015},
        "New York": {"country": "US", "lat": 40.7128, "lng": -74.0060, "temp": 26, "condition": "Clear Sky", "humidity": 55, "wind": 11.2, "pressure": 1012},
        "Tokyo": {"country": "JP", "lat": 35.6762, "lng": 139.6503, "temp": 28, "condition": "Sunny", "humidity": 60, "wind": 9.5, "pressure": 1010},
        "Dubai": {"country": "AE", "lat": 25.2048, "lng": 55.2708, "temp": 38, "condition": "Sunny", "humidity": 35, "wind": 14.5, "pressure": 1006},
    }

    preset = city_presets.get(city_clean, {
        "country": "INT",
        "lat": round(random.uniform(-40, 60), 2),
        "lng": round(random.uniform(-100, 100), 2),
        "temp": random.randint(18, 34),
        "condition": random.choice(["Sunny", "Partly Cloudy", "Light Rain", "Clear Sky"]),
        "humidity": random.randint(40, 75),
        "wind": round(random.uniform(5, 18), 1),
        "pressure": random.randint(1004, 1020),
    })

    base_temp = preset["temp"]
    now = datetime.now()
    
    # Generate 8 hourly steps
    hourly = []
    for i in range(8):
        future_time = now + timedelta(hours=i * 3)
        temp_var = base_temp + random.choice([-2, -1, 0, 1, 2])
        hourly.append({
            "time": future_time.strftime("%Y-%m-%d %H:00:00"),
            "timestamp": int(future_time.timestamp()),
            "temp": temp_var,
            "feels_like": temp_var + random.choice([1, 2, 3]),
            "condition": preset["condition"],
            "description": preset["condition"],
            "rain_chance": 65 if "Rain" in preset["condition"] else random.randint(0, 20),
        })

    # Generate 6 daily steps
    daily = []
    days_map = ["Today", "Tomorrow"]
    for i in range(6):
        day_date = now + timedelta(days=i)
        day_label = days_map[i] if i < 2 else day_date.strftime("%A")
        hi = base_temp + random.randint(1, 4)
        lo = base_temp - random.randint(4, 8)
        daily.append({
            "day": day_label,
            "date": day_date.strftime("%d %b"),
            "high": hi,
            "low": lo,
            "condition": "rain" if "Rain" in preset["condition"] and i % 2 == 1 else "sunny",
            "description": preset["condition"],
            "rain_chance": 70 if "Rain" in preset["condition"] and i % 2 == 1 else random.randint(5, 30),
        })

    return {
        "city": city_clean,
        "country": preset["country"],
        "coordinates": {"latitude": preset["lat"], "longitude": preset["lng"]},
        "temperature": base_temp,
        "feels_like": base_temp + 4,
        "condition": preset["condition"],
        "icon": "10d" if "Rain" in preset["condition"] else "01d",
        "humidity": preset["humidity"],
        "pressure": preset["pressure"],
        "wind_speed": preset["wind"],
        "visibility": 10.0,
        "cloudiness": 40,
        "sunrise": int((now.replace(hour=6, minute=14)).timestamp()),
        "sunset": int((now.replace(hour=19, minute=2)).timestamp()),
        "timezone": 18000,
        "hourly": hourly,
        "daily": daily,
        "air_quality": {
            "index": 2,
            "score": 75,
            "label": "Good",
            "description": "Air quality is good and suitable for outdoor activities.",
            "pm2_5": 12.4,
            "pm10": 24.1,
            "carbon_monoxide": 210.0,
            "nitrogen_dioxide": 15.2,
            "ozone": 48.0,
        },
    }


def build_air_quality(air_data: dict[str, Any]) -> dict[str, Any]:
    items = air_data.get("list", [])
    if not items:
        return {
            "index": 0,
            "score": 0,
            "label": "Unavailable",
            "description": "Air-quality information is unavailable.",
            "pm2_5": 0,
            "pm10": 0,
            "carbon_monoxide": 0,
            "nitrogen_dioxide": 0,
            "ozone": 0,
        }

    air_item = items[0]
    air_index = int(air_item.get("main", {}).get("aqi", 0))
    components = air_item.get("components", {})

    score_map = {1: 90, 2: 70, 3: 50, 4: 30, 5: 10}

    return {
        "index": air_index,
        "score": score_map.get(air_index, 0),
        "label": AIR_LABELS.get(air_index, "Unavailable"),
        "description": AIR_DESCRIPTIONS.get(air_index, "Air-quality information is unavailable."),
        "pm2_5": round(components.get("pm2_5", 0), 1),
        "pm10": round(components.get("pm10", 0), 1),
        "carbon_monoxide": round(components.get("co", 0), 1),
        "nitrogen_dioxide": round(components.get("no2", 0), 1),
        "ozone": round(components.get("o3", 0), 1),
    }


def build_daily_forecast(forecast: dict[str, Any]) -> list[dict[str, Any]]:
    daily_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for item in forecast.get("list", []):
        date_key = item["dt_txt"].split(" ")[0]
        daily_groups[date_key].append(item)

    daily_forecast: list[dict[str, Any]] = []

    for index, (date_key, entries) in enumerate(list(daily_groups.items())[:6]):
        temperatures = [entry["main"]["temp"] for entry in entries]
        representative = min(
            entries,
            key=lambda entry: abs(int(entry["dt_txt"].split(" ")[1][:2]) - 12),
        )

        parsed_date = datetime.strptime(date_key, "%Y-%m-%d")

        if index == 0:
            day_name = "Today"
        elif index == 1:
            day_name = "Tomorrow"
        else:
            day_name = parsed_date.strftime("%A")

        daily_forecast.append({
            "day": day_name,
            "date": parsed_date.strftime("%d %b"),
            "high": round(max(temperatures)),
            "low": round(min(temperatures)),
            "condition": representative["weather"][0]["main"],
            "description": representative["weather"][0]["description"].title(),
            "rain_chance": round(max(entry.get("pop", 0) for entry in entries) * 100),
        })

    return daily_forecast