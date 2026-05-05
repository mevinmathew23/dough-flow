import json
import logging

from openai import AsyncOpenAI

from api.config import settings

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 120.0  # single batch can take longer than individual calls


async def llm_classify_categories(
    descriptions: list[str],
    category_names: list[str],
) -> list[str | None]:
    """Classify transaction descriptions in a single batched LLM call (Ollama).

    Sends all descriptions in one prompt and parses the JSON array response.
    Falls back to all-None if LLM is disabled or unavailable.
    """
    if not settings.llm_enabled or not descriptions or not category_names:
        return [None] * len(descriptions)

    client = AsyncOpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)
    valid = {c.lower(): c for c in category_names}
    numbered = "\n".join(f"{i + 1}. {desc}" for i, desc in enumerate(descriptions))

    prompt = (
        f"Classify each bank transaction into exactly one category from the list below, "
        f"or null if none fit.\n\n"
        f"Categories: {category_names}\n\n"
        f"Hints:\n"
        f"- 'Subscriptions': streaming (Netflix, Spotify, Hulu, Disney+, Apple TV+, YouTube Premium), "
        f"software/cloud (Adobe, Microsoft 365, iCloud, Google One), recurring memberships (Amazon Prime). "
        f"Any '.com/bill' or '/subscribe' charge is likely a subscription.\n"
        f"- 'Dining Out': restaurants, cafes, fast food, food delivery (Uber Eats, DoorDash, Grubhub).\n"
        f"- 'Personal Care': pharmacies (Walgreens, CVS), beauty (Ulta, Sephora), hair salons, wellness.\n\n"
        f"Transactions:\n{numbered}\n\n"
        f"Return a JSON object with a 'classifications' array containing one entry per transaction "
        f"in the same order. Each entry must be an exact category name from the list above, or null.\n"
        f'Example format: {{"classifications": ["Dining Out", null, "Transportation"]}}'
    )

    try:
        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a financial transaction classifier. Always respond with valid JSON. "
                        "Use 'Subscriptions' for streaming services (Spotify, Netflix, Hulu, Disney+, "
                        "Apple TV+, YouTube) and recurring software/cloud charges (Adobe, iCloud, "
                        "Microsoft 365, Amazon Prime)."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            timeout=_REQUEST_TIMEOUT,
        )
        content = response.choices[0].message.content or ""
        data = json.loads(content)
        raw: list[object] = data.get("classifications", [])

        result: list[str | None] = []
        for item in raw:
            if isinstance(item, str) and item.lower() in valid:
                result.append(valid[item.lower()])
            else:
                result.append(None)

        # Pad to input length in case the model returned fewer items
        while len(result) < len(descriptions):
            result.append(None)
        return result[: len(descriptions)]

    except Exception as exc:
        logger.warning("LLM batch classification failed: %s", exc)
        return [None] * len(descriptions)
