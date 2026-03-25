import { ApiResponse, LoginRequest, LoginResponse, User } from "../types";
import { mockApiResponse, mockApiError } from "../client";
import { mockUsers } from "../mock-data";

// Mock credentials for demo
const MOCK_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  "admin@minee.cm": { password: "admin123", userId: "1" },
  "marie.ekotto@minee.cm": { password: "team123", userId: "2" },
  "paul.mvondo@minee.cm": { password: "valid123", userId: "3" },
  "agnes.fotso@minee.cm": { password: "process123", userId: "4" },
  "olivier.nkono@minee.cm": { password: "process123", userId: "5" },
};

class AuthService {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const { email, password } = credentials;

    // Simulate authentication
    const mockCred = MOCK_CREDENTIALS[email.toLowerCase()];

    if (!mockCred || mockCred.password !== password) {
      return mockApiError("Invalid email or password", 500);
    }

    const user = mockUsers.find((u) => u.id === mockCred.userId);

    if (!user) {
      return mockApiError("User not found", 500);
    }

    if (!user.isActive) {
      return mockApiError("Account is inactive", 500);
    }

    return mockApiResponse<LoginResponse>({
      user,
      token: `mock-jwt-token-${user.id}-${Date.now()}`,
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    // Clear any stored tokens
    return mockApiResponse(undefined);
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    // In a real app, this would validate the token and return user info
    const storedUser = typeof window !== "undefined" 
      ? localStorage.getItem("minee-user") 
      : null;

    if (!storedUser) {
      return mockApiError("Not authenticated");
    }

    try {
      const user = JSON.parse(storedUser);
      return mockApiResponse(user);
    } catch {
      return mockApiError("Invalid session");
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    // Simulate token refresh
    return mockApiResponse({
      token: `mock-jwt-token-refreshed-${Date.now()}`,
    });
  }
}

export const authService = new AuthService();
