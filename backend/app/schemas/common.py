from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel

T = TypeVar('T')

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[list] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: Optional[str] = None

class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20

class PaginatedResponse(APIResponse[List[T]]):
    total: int
    page: int
    page_size: int
    total_pages: int
