"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { UserRole } from "@/lib/api/types";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Check permissions
  const hasRequiredPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((perm) => hasPermission(perm));

  // Check roles
  const hasRequiredRoles =
    requiredRoles.length === 0 || hasRole(requiredRoles);

  useEffect(() => {
    if (!isLoading && isAuthenticated && (!hasRequiredPermissions || !hasRequiredRoles)) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, hasRequiredPermissions, hasRequiredRoles, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasRequiredPermissions || !hasRequiredRoles) {
    return null;
  }

  return <>{children}</>;
}
