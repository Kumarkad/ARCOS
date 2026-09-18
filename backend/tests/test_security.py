import pytest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_access_token_lifecycle():
    data = {"sub": "123e4567-e89b-12d3-a456-426614174000", "email": "test@example.com"}
    token = create_access_token(data)
    assert isinstance(token, str)
    
    payload = decode_token(token)
    assert payload["sub"] == data["sub"]
    assert payload["email"] == data["email"]
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload

def test_refresh_token_lifecycle():
    data = {"sub": "123e4567-e89b-12d3-a456-426614174000", "email": "test@example.com"}
    token = create_refresh_token(data)
    assert isinstance(token, str)
    
    payload = decode_token(token)
    assert payload["sub"] == data["sub"]
    assert payload["type"] == "refresh"
    assert "jti" in payload
    assert "exp" in payload

def test_invalid_token():
    with pytest.raises(AuthenticationError):
        decode_token("invalid.token.structure")
