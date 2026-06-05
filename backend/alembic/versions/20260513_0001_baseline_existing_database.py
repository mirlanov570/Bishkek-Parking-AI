"""baseline existing database

Revision ID: 20260513_0001
Revises: 
Create Date: 2026-05-13 00:01:00.000000
"""

from typing import Sequence, Union


revision: str = "20260513_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Baseline для уже существующей БД из dump.

    ВАЖНО:
    Здесь специально нет CREATE TABLE.
    Таблицы, enum, индексы, constraints, sequences и triggers уже созданы dump-файлом.
    """
    pass


def downgrade() -> None:
    """
    Baseline нельзя откатывать автоматически, потому что схема пришла из dump.
    """
    pass