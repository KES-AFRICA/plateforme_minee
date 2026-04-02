// app/commercial/layout.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermission="view:commercial">
      {children}
    </ProtectedRoute>
  );
}