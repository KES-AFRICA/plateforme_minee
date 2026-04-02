"use client";

/**
 * ============================================================
 * TADEC — Composant : RoleGate
 * ============================================================
 * Affiche ses enfants uniquement si l'utilisateur a la/les
 * permission(s) requise(s). Remplace les ternaires verbeux.
 *
 * EXEMPLES D'USAGE :
 *
 * // Bouton visible uniquement par ceux qui peuvent valider
 * <RoleGate permission="action:validate_task">
 *   <Button>Valider</Button>
 * </RoleGate>
 *
 * // Plusieurs permissions (toutes requises)
 * <RoleGate permissions={["action:process_task", "view:processing"]}>
 *   <ProcessPanel />
 * </RoleGate>
 *
 * // Fallback si non autorisé
 * <RoleGate permission="manage:users" fallback={<p>Accès refusé</p>}>
 *   <UserManagement />
 * </RoleGate>
 *
 * // Par rôle
 * <RoleGate roles={["admin", "team_lead"]}>
 *   <AdminPanel />
 * </RoleGate>
 */

import { useAuth } from "@/lib/auth/context";
import { Permission } from "@/lib/auth/permissions";
import { UserRole } from "@/lib/api/types";

interface RoleGateProps {
  children: React.ReactNode;
  /** Permission unique requise */
  permission?: Permission | string;
  /** Plusieurs permissions (toutes requises) */
  permissions?: (Permission | string)[];
  /** Rôles autorisés (au moins un) */
  roles?: UserRole[];
  /** Contenu affiché si non autorisé (défaut : rien) */
  fallback?: React.ReactNode;
  /** Si true, requiert AU MOINS UNE des permissions (défaut: toutes) */
  any?: boolean;
}

export function RoleGate({
  children,
  permission,
  permissions = [],
  roles = [],
  fallback = null,
  any = false,
}: RoleGateProps) {
  const { hasPermission, hasRole } = useAuth();

  // Construire la liste de toutes les perms à vérifier
  const allPerms: string[] = [
    ...(permission ? [permission] : []),
    ...permissions,
  ];

  let authorized = true;

  // Vérification des permissions
  if (allPerms.length > 0) {
    if (any) {
      authorized = allPerms.some((p) => hasPermission(p));
    } else {
      authorized = allPerms.every((p) => hasPermission(p));
    }
  }

  // Vérification des rôles (en plus des permissions si les deux sont fournis)
  if (roles.length > 0) {
    const roleAuthorized = hasRole(roles);
    // Si des permissions ET des rôles sont fournis, les deux doivent être vrais
    authorized = allPerms.length > 0
      ? authorized && roleAuthorized
      : roleAuthorized;
  }

  return authorized ? <>{children}</> : <>{fallback}</>;
}

// ─── Variantes pratiques ──────────────────────────────────────────────────────

/** Visible uniquement pour les admins */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate roles={["admin"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/** Visible pour les chefs d'équipe et admins */
export function TeamLeadOrAdmin({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate roles={["admin", "team_lead"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/** Visible pour ceux qui peuvent traiter des tâches */
export function CanProcess({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate permission="action:process_task" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/** Visible pour ceux qui peuvent valider des tâches */
export function CanValidate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate permission="action:validate_task" fallback={fallback}>
      {children}
    </RoleGate>
  );
}