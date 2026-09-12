export interface User {
  id: string;
  email: string;
  full_name: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  tokens: TokenResponse;
  user: User;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
