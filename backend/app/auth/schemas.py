from __future__ import annotations

from pydantic import Field

from app.schemas.common import SchemaBase
from app.schemas.user import UserRead


class LoginRequest(SchemaBase):
    login: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(SchemaBase):
    refresh_token: str = Field(min_length=1)


class TokenRead(SchemaBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenRead(SchemaBase):
    access_token: str
    token_type: str = "bearer"


class AuthUserRead(UserRead):
    pass


class MeRead(UserRead):
    pass


class LogoutRead(SchemaBase):
    success: bool = True
    message: str = "Logged out successfully"