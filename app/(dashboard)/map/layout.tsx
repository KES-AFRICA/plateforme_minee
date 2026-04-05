// app/map/layout.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermission="view:map">
      {children}
    </ProtectedRoute>
  );
}