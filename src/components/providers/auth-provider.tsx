"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, AuthState, LoginRequest, RegisterRequest } from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.user) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: LoginRequest) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success && result.user) {
        setState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        router.push(`/${locale}/dashboard`);
      }

      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        router.push(`/${locale}/login`);
      }

      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      router.push(`/${locale}/login`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
