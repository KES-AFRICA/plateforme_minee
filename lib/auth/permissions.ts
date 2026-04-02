/**
 * ============================================================
 * TADEC — RBAC : Source de vérité des permissions
 * ============================================================
 *
 * RÔLES :
 *  - admin            : Supervision / monitoring. Gestion users. PAS d'actions métier.
 *  - team_lead        : Toutes les fonctions sauf gestion users proprement dite.
 *  - validation_agent : Dashboard + Validation + Commercial + Notifications.
 *  - processing_agent : Dashboard + Traitements assignés + Notifications.
 *
 * CONVENTION DES PERMISSIONS :
 *  view:*      → peut voir la section
 *  manage:*    → CRUD complet
 *  action:*    → action métier spécifique
 *  export:*    → export de données
 */

import { UserRole } from "@/lib/api/types";

// ─── Définition exhaustive des permissions ────────────────────────────────────

export const PERMISSIONS = {
  // Navigation / vues
  VIEW_DASHBOARD:       "view:dashboard",
  VIEW_DISTRIBUTION:    "view:distribution",
  VIEW_PROCESSING:      "view:processing",
  VIEW_VALIDATION:      "view:validation",
  VIEW_COMMERCIAL:      "view:commercial",
  VIEW_USERS:           "view:users",
  VIEW_MAP:             "view:map",
  VIEW_NOTIFICATIONS:   "view:notifications",
  VIEW_SETTINGS:        "view:settings",

  // Actions métier — Traitement
  ACTION_PROCESS_TASK:  "action:process_task",      // Traiter une anomalie
  ACTION_ASSIGN_TASK:   "action:assign_task",        // Assigner/réassigner une tâche
  ACTION_COMPLETE_COLLECTION: "action:complete_collection", // Marquer collecte terminée

  // Actions métier — Validation
  ACTION_VALIDATE_TASK: "action:validate_task",      // Valider un départ
  ACTION_REJECT_TASK:   "action:reject_task",        // Rejeter un départ

  // Gestion utilisateurs (admin uniquement)
  MANAGE_USERS:         "manage:users",

  // Export
  EXPORT_DATA:          "export:data",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ─── Matrice rôle → permissions ───────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  /**
   * ADMIN
   * Vision complète en lecture. Gestion des utilisateurs.
   * Aucune action sur le processus métier (traitement, validation).
   */
  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.VIEW_PROCESSING,
    PERMISSIONS.VIEW_VALIDATION,
    PERMISSIONS.VIEW_COMMERCIAL,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.EXPORT_DATA,
  ],

  team_lead: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.VIEW_PROCESSING,
    PERMISSIONS.VIEW_VALIDATION,
    PERMISSIONS.VIEW_COMMERCIAL,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.ACTION_PROCESS_TASK,
    PERMISSIONS.ACTION_ASSIGN_TASK,
    PERMISSIONS.ACTION_COMPLETE_COLLECTION,
    PERMISSIONS.ACTION_VALIDATE_TASK,
    PERMISSIONS.ACTION_REJECT_TASK,
    PERMISSIONS.EXPORT_DATA,
  ],

  /**
   * AGENT DE VALIDATION
   * Dashboard + Validation Distribution + Commercial + Notifications.
   */
  validation_agent: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.VIEW_VALIDATION,
    PERMISSIONS.VIEW_PROCESSING,
    PERMISSIONS.VIEW_COMMERCIAL,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.ACTION_VALIDATE_TASK,
    PERMISSIONS.ACTION_REJECT_TASK,
    PERMISSIONS.ACTION_PROCESS_TASK
  ],

  /**
   * AGENT DE TRAITEMENT
   * Dashboard + Traitements assignés + Notifications.
   */
  processing_agent: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_DISTRIBUTION,
    PERMISSIONS.VIEW_PROCESSING,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.ACTION_PROCESS_TASK,
  ],
};

// ─── Helpers purs (utilisables hors React) ───────────────────────────────────

/**
 * Vérifie si un rôle possède une permission donnée.
 * Utilitaire pur — pas de hook, utilisable côté serveur aussi.
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Retourne toutes les permissions d'un rôle.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Vérifie si un rôle peut voir une route donnée.
 * Map route prefix → permission requise.
 */
const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  "/dashboard":                     PERMISSIONS.VIEW_DASHBOARD,
  "/distribution":                  PERMISSIONS.VIEW_DISTRIBUTION,
  "/distribution/processing":       PERMISSIONS.VIEW_PROCESSING,
  "/distribution/validation":       PERMISSIONS.VIEW_VALIDATION,
  "/commercial":                    PERMISSIONS.VIEW_COMMERCIAL,
  "/users":                         PERMISSIONS.VIEW_USERS,
  "/map":                           PERMISSIONS.VIEW_MAP,
  "/notifications":                 PERMISSIONS.VIEW_NOTIFICATIONS,
  "/settings":                      PERMISSIONS.VIEW_SETTINGS,
};

export function getRequiredPermissionForRoute(pathname: string): Permission | null {
  // On cherche le match le plus long (plus spécifique)
  const sorted = Object.keys(ROUTE_PERMISSION_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (pathname.startsWith(prefix)) {
      return ROUTE_PERMISSION_MAP[prefix];
    }
  }
  return null;
}

/**
 * Retourne la route de redirection par défaut selon le rôle.
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "admin":            return "/dashboard";
    case "team_lead":        return "/dashboard";
    case "validation_agent": return "/dashboard";
    case "processing_agent": return "/dashboard";
    default:                 return "/login";
  }
}