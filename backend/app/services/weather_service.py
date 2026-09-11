from __future__ import annotations

from datetime import datetime

import httpx

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def description_for(code: int) -> str:
    if code == 0:
        return "Klar"
    if code in {1, 2}:
        return "Leicht bewölkt"
    if code == 3:
        return "Bewölkt"
    if code in {45, 48}:
        return "Nebel"
    if code in {51, 53, 55, 56, 57}:
        return "Nieselregen"
    if code in {61, 63, 65, 66, 67, 80, 81, 82}:
        return "Regen"
    if code in {71, 73, 75, 77, 85, 86}:
        return "Schnee"
    if code in {95, 96, 99}:
        return "Gewitter"
    return "Wechselhaft"


async def read_weather() -> dict[str, object]:
    params = {
        "latitude": 52.5200,
        "longitude": 13.4050,
        "timezone": "Europe/Berlin",
        "forecast_days": 2,
        "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        "hourly": "temperature_2m,precipitation_probability,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    }
    async with httpx.AsyncClient(timeout=6.0, follow_redirects=False) as client:
        response = await client.get(FORECAST_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    current = payload["current"]
    hourly = payload["hourly"]
    daily = payload["daily"]
    current_time = datetime.fromisoformat(current["time"])
    upcoming_indexes = [index for index, value in enumerate(hourly["time"]) if datetime.fromisoformat(value) >= current_time][:6]
    current_index = upcoming_indexes[0] if upcoming_indexes else 0
    current_code = int(current["weather_code"])
    tomorrow_code = int(daily["weather_code"][1])

    return {
        "location": {"name": "Berlin", "postal_code": "10115", "country": "Deutschland"},
        "current": {
            "temperature": current["temperature_2m"],
            "apparent_temperature": current["apparent_temperature"],
            "wind_speed": current["wind_speed_10m"],
            "weather_code": current_code,
            "description": description_for(current_code),
            "precipitation_probability": hourly["precipitation_probability"][current_index],
        },
        "next_hours": [
            {
                "time": hourly["time"][index],
                "temperature": hourly["temperature_2m"][index],
                "precipitation_probability": hourly["precipitation_probability"][index],
                "weather_code": int(hourly["weather_code"][index]),
                "description": description_for(int(hourly["weather_code"][index])),
            }
            for index in upcoming_indexes
        ],
        "tomorrow": {
            "date": daily["time"][1],
            "temperature_max": daily["temperature_2m_max"][1],
            "temperature_min": daily["temperature_2m_min"][1],
            "precipitation_probability": daily["precipitation_probability_max"][1],
            "weather_code": tomorrow_code,
            "description": description_for(tomorrow_code),
        },
        "last_updated": current["time"],
    }
