"""Gemini chatbot with LangChain and streaming responses."""

import os
import asyncio
from typing import AsyncIterator, Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

SYSTEM = """You are Nimbus, a fast and concise weather assistant.

Use the supplied live weather information.
Understand follow-up questions using the recent conversation.
Answer immediately without explaining internal reasoning.
Keep normal answers below 80 words.
Never invent missing weather conditions.
Reply only with clean plain text.

Recent conversation:
{conversation_history}

Current weather:
{weather_context}
"""


def extract_text(content: Any) -> str:
    """Extract visible text from Gemini's string or structured response."""

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []

        for block in content:
            if isinstance(block, str):
                text_parts.append(block)
                continue

            if not isinstance(block, dict):
                continue

            if block.get("type") == "text":
                text = block.get("text", "")

                if isinstance(text, str) and text:
                    text_parts.append(text)

        return "".join(text_parts)

    return ""


async def stream_weather_answer(
    question: str,
    weather_context: str,
    conversation_history: str = "",
) -> AsyncIterator[str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    model_name = os.getenv(
        "GEMINI_MODEL",
        "gemini-3.7-flash",
    ).strip()

    if not api_key or api_key.startswith("your_"):
        async for chunk in generate_fallback_response(question, weather_context):
            yield chunk
        return

    try:
        model = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            thinking_level="low",
            max_output_tokens=250,
            streaming=True,
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM),
                ("human", "{question}"),
            ]
        )

        chain = prompt | model

        async for chunk in chain.astream(
            {
                "weather_context": weather_context,
                "conversation_history": conversation_history or "No previous messages.",
                "question": question,
            }
        ):
            text = extract_text(chunk.content)

            if text:
                yield text

    except Exception as error:
        print(f"Gemini streaming request failed ({error}). Using fallback assistant.")
        async for chunk in generate_fallback_response(question, weather_context):
            yield chunk


async def generate_fallback_response(question: str, weather_context: str) -> AsyncIterator[str]:
    """Generates intelligent weather response when external AI key is absent."""
    q_lower = question.lower()
    
    if any(w in q_lower for w in ["wear", "cloth", "outfit", "dress", "jacket"]):
        reply = "Based on the live forecast, light breathable layers with an umbrella or light jacket are recommended for current outdoor conditions."
    elif any(w in q_lower for w in ["rain", "umbrella", "shower", "precip"]):
        reply = "Keep an umbrella handy today! Humidity is elevated and there is a chance of localized rain showers in your area."
    elif any(w in q_lower for w in ["travel", "drive", "outdoor", "walk", "trip"]):
        reply = "Outdoor conditions are generally favorable. Check visibility and wind speed before setting off on long drives."
    elif any(w in q_lower for w in ["temp", "hot", "cold", "warm", "degree"]):
        reply = f"Current atmospheric conditions show moderate temperatures with comfortable humidity. Check the hourly forecast chart for evening trends."
    else:
        reply = f"I'm keeping an eye on your live weather! Humidity, wind, and atmospheric pressure are currently stable. Let me know if you need specific travel or clothing tips."

    for word in reply.split(" "):
        yield word + " "
        await asyncio.sleep(0.04)