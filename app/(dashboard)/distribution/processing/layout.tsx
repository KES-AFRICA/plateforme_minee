// app/distribution/processing/layout.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ProcessingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermission="view:processing">
      {children}
    </ProtectedRoute>
  );
}