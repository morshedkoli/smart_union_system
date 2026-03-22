export interface User {
  id: string;
  email: string;
  name: string;
  nameEn?: string;
  nameBn?: string;
  phone?: string;
  role: Role;
  status: Status;
  citizenId?: string; // For CITIZEN role users
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";
export type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}
