// app/distribution/validation/layout.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ValidationLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermission="view:validation">
      {children}
    </ProtectedRoute>
  );
}