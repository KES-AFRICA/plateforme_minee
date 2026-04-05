// app/users/layout.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermission="manage:users">
      {children}
    </ProtectedRoute>
  );
}