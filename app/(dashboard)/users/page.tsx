"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userService } from "@/lib/api/services/users";
import { User, UserRole } from "@/lib/api/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  Search,
} from "lucide-react";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrateur",
  team_lead: "Chef d'équipe",
  validation_agent: "Agent de validation",
  processing_agent: "Agent de traitement",
};

const roleBadgeVariants: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "destructive",
  team_lead: "default",
  validation_agent: "secondary",
  processing_agent: "outline",
};

export default function UsersPage() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    role: "processing_agent" as UserRole,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await userService.getUsers({}, { pageSize: 100 });
        if (response.data) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error(t("errors.networkError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [t]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMM yyyy", {
      locale: language === "fr" ? fr : enUS,
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      role: "processing_agent",
    });
  };

  const handleCreate = async () => {
    setIsProcessing(true);
    try {
      const response = await userService.createUser(formData);
      if (response.data) {
        setUsers((prev) => [...prev, response.data!]);
        toast.success(t("common.success"));
        setIsCreateOpen(false);
        resetForm();
      } else {
        toast.error(response.error || t("errors.serverError"));
      }
    } catch {
      toast.error(t("errors.networkError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;

    setIsProcessing(true);
    try {
      const response = await userService.updateUser(editUser.id, formData);
      if (response.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editUser.id ? response.data! : u))
        );
        toast.success(t("common.success"));
        setEditUser(null);
        resetForm();
      } else {
        toast.error(response.error || t("errors.serverError"));
      }
    } catch {
      toast.error(t("errors.networkError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    setIsProcessing(true);
    try {
      await userService.deleteUser(deleteUser.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === deleteUser.id ? { ...u, isActive: false } : u
        )
      );
      toast.success(t("common.success"));
      setDeleteUser(null);
    } catch {
      toast.error(t("errors.networkError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await userService.toggleUserStatus(user.id);
      if (response.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? response.data! : u))
        );
        toast.success(t("common.success"));
      }
    } catch {
      toast.error(t("errors.networkError"));
    }
  };

  const openEditDialog = (user: User) => {
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      department: user.department || "",
      role: user.role,
    });
    setEditUser(user);
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    avgOccupancy: Math.round(
      users.reduce((acc, u) => acc + u.occupancyRate, 0) / Math.max(users.length, 1)
    ),
  };

  const canManageUsers = hasPermission("manage:users");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground">
            {stats.total} utilisateurs, {stats.active} actifs
          </p>
        </div>

        {canManageUsers && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("users.addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("users.addUser")}</DialogTitle>
                <DialogDescription>
                  Créer un nouveau compte utilisateur
                </DialogDescription>
              </DialogHeader>
              <UserForm
                formData={formData}
                setFormData={setFormData}
                t={t}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={isProcessing}>
                  {t("common.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common.role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {Object.entries(roleLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>{t("users.department")}</TableHead>
              <TableHead>{t("users.occupancyRate")}</TableHead>
              <TableHead>{t("users.lastLogin")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              {canManageUsers && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-2 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariants[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.department || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={user.occupancyRate} className="w-16 h-2" />
                      <span className="text-sm">{user.occupancyRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.lastLogin)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? t("users.active") : t("users.inactive")}
                    </Badge>
                  </TableCell>
                  {canManageUsers && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            <Power className="mr-2 h-4 w-4" />
                            {user.isActive ? "Désactiver" : "Activer"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editUser")}</DialogTitle>
            <DialogDescription>
              Modifier les informations de l&apos;utilisateur
            </DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} setFormData={setFormData} t={t} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={isProcessing}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface UserFormProps {
  formData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    department: string;
    role: UserRole;
  };
  setFormData: React.Dispatch<React.SetStateAction<UserFormProps["formData"]>>;
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string;
}

function UserForm({ formData, setFormData, t }: UserFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("users.firstName")}</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("users.lastName")}</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("common.email")}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t("users.phone")}</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{t("users.department")}</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, department: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{t("common.role")}</Label>
        <Select
          value={formData.role}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, role: value as UserRole }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
