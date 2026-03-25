"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { User, UserRole } from "@/lib/api/types";
import { authService } from "@/lib/api/services/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions
const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    "view:dashboard",
    "view:processing",
    "view:validation",
    "view:users",
    "view:map",
    "view:performance",
    "manage:users",
    "manage:tasks",
    "validate:tasks",
    "process:tasks",
    "export:data",
    "admin:settings",
  ],
  team_lead: [
    "view:dashboard",
    "view:processing",
    "view:validation",
    "view:users",
    "view:map",
    "view:performance",
    "manage:tasks",
    "validate:tasks",
    "process:tasks",
    "export:data",
  ],
  validation_agent: [
    "view:dashboard",
    "view:validation",
    "view:performance",
    "validate:tasks",
  ],
  processing_agent: [
    "view:dashboard",
    "view:processing",
    "view:performance",
    "process:tasks",
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem("minee-user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch {
        localStorage.removeItem("minee-user");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.data) {
        const { user: userData } = response.data;
        setUser(userData);
        localStorage.setItem("minee-user", JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, error: "Invalid credentials" };
    } catch {
      return { success: false, error: "Login failed" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("minee-user");
    authService.logout();
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      const permissions = rolePermissions[user.role] || [];
      return permissions.includes(permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(user.role);
    },
    [user]
  );

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission,
      hasRole,
    }),
    [user, isLoading, login, logout, hasPermission, hasRole]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
