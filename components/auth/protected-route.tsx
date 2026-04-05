"use client";

/**
 * ============================================================
 * TADEC — ProtectedRoute (v2 — RBAC centralisé)
 * ============================================================
 * Garde les routes protégées. Deux niveaux de protection :
 *  1. Authentification (redirect → /login si non connecté)
 *  2. Permission/rôle (redirect → /dashboard si accès refusé)
 *
 * USAGE dans un layout :
 *
 *   // Protection par permission
 *   <ProtectedRoute requiredPermission="view:users">
 *     {children}
 *   </ProtectedRoute>
 *
 *   // Protection par rôle
 *   <ProtectedRoute requiredRoles={["admin"]}>
 *     {children}
 *   </ProtectedRoute>
 *
 *   // Auto-détection depuis l'URL (recommandé pour les layouts de routes)
 *   <ProtectedRoute autoDetect>
 *     {children}
 *   </ProtectedRoute>
 */

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { UserRole } from "@/lib/api/types";
import { Permission, getRequiredPermissionForRoute } from "@/lib/auth/permissions";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Permission explicite requise */
  requiredPermission?: Permission | string;
  /** (legacy) Liste de permissions — toutes requises */
  requiredPermissions?: string[];
  /** Rôles autorisés (au moins un) */
  requiredRoles?: UserRole[];
  /**
   * Si true, détecte automatiquement la permission requise
   * depuis l'URL via ROUTE_PERMISSION_MAP.
   */
  autoDetect?: boolean;
  /** Route de redirection si accès refusé (défaut: /dashboard) */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions = [],
  requiredRoles = [],
  autoDetect = false,
  redirectTo = "/dashboard",
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();

  // Résolution de la permission à vérifier
  const resolvedPermission: string | null = (() => {
    if (requiredPermission) return requiredPermission;
    if (autoDetect) return getRequiredPermissionForRoute(pathname);
    return null;
  })();

  // Calcul de l'autorisation
  const isAuthorized = (() => {
    if (!isAuthenticated) return false;

    const permOk =
      !resolvedPermission && requiredPermissions.length === 0
        ? true
        : resolvedPermission
        ? hasPermission(resolvedPermission)
        : requiredPermissions.every((p) => hasPermission(p));

    const roleOk =
      requiredRoles.length === 0 || hasRole(requiredRoles);

    return permOk && roleOk;
  })();

  // ── Redirections ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAuthorized) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, isAuthorized, router, redirectTo]);

  // ── Rendu ─────────────────────────────────────────────────────────────────
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

  if (!isAuthenticated || !isAuthorized) {
    // Evite un flash de contenu pendant la redirection
    return null;
  }

  return <>{children}</>;
}