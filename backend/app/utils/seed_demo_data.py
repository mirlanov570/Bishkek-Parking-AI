from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv

from app.core.config import BASE_DIR
from app.db.session import AsyncSessionLocal
from app.services.demo_data_service import demo_data_service


load_dotenv(BASE_DIR / ".env")


def get_bool_from_env(
    name: str,
    default: bool,
) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def get_int_from_env(
    name: str,
    default: int,
) -> int:
    value = os.getenv(name)

    if value is None or value.strip() == "":
        return default

    return int(value)


async def main() -> None:
    reset = get_bool_from_env("DEMO_RESET", False)
    days = get_int_from_env("DEMO_DAYS", 90)
    history_points_per_day = get_int_from_env("DEMO_HISTORY_POINTS_PER_DAY", 6)
    drivers_count = get_int_from_env("DEMO_DRIVERS_COUNT", 5)
    requests_count = get_int_from_env("DEMO_REQUESTS_COUNT", 80)
    predictions_count = get_int_from_env("DEMO_PREDICTIONS_COUNT", 60)

    async with AsyncSessionLocal() as db:
        result = await demo_data_service.seed_demo_data(
            db=db,
            reset=reset,
            days=days,
            history_points_per_day=history_points_per_day,
            drivers_count=drivers_count,
            requests_count=requests_count,
            predictions_count=predictions_count,
        )

    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())