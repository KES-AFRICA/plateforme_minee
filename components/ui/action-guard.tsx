import { ReactNode, cloneElement, isValidElement } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { Permission } from "@/lib/auth/permissions";

type ActionGuardProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: "hide" | "disable";
  disabled?: boolean;
  context?: { assignedAgentId?: string };
};

export function ActionGuard({
  permission,
  children,
  fallback = null,
  mode = "hide",
  disabled = false,
  context = {},
}: ActionGuardProps) {
  const { can } = usePermissions();
  const isAllowed = can(permission, context);

  if (mode === "hide" && !isAllowed) return fallback;

  const shouldDisable = !isAllowed || disabled;

  if (isValidElement(children)) {
    return cloneElement(children as React.ReactElement<any>, {
      disabled: shouldDisable,
      ...(shouldDisable ? { "aria-disabled": true } : {}),
    });
  }

  return (
    <span style={shouldDisable ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
      {children}
    </span>
  );
}