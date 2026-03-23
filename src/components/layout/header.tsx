"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Bell, Search, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderProps {
  sidebarCollapsed: boolean;
}

interface NotificationAlert {
  id: string;
  title: string;
  titleBn?: string | null;
  message: string;
  messageBn?: string | null;
  type: string;
  category: string;
  createdAt: string;
  link?: string | null;
  readAt?: string | null;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [alerts, setAlerts] = React.useState<NotificationAlert[]>([]);

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setNotificationCount(data.unreadCount || 0);
        setAlerts((data.alerts || []) as NotificationAlert[]);
      } else {
        setNotificationCount(0);
        setAlerts([]);
      }
    } catch {
      setNotificationCount(0);
      setAlerts([]);
    }
  }, []);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/${locale}/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openAlert = async (alert: NotificationAlert) => {
    if (!alert.readAt) {
      try {
        const res = await fetch(`/api/notifications/${alert.id}/read`, {
          method: "PATCH",
        });

        if (res.ok) {
          const readAt = new Date().toISOString();
          setAlerts((currentAlerts) =>
            currentAlerts.map((currentAlert) =>
              currentAlert.id === alert.id
                ? { ...currentAlert, readAt }
                : currentAlert
            )
          );
          setNotificationCount((currentCount) => Math.max(0, currentCount - 1));
        }
      } catch {
        // Keep navigation working even if the badge update fails.
      }
    }

    if (!alert.link) {
      return;
    }

    const localPath = alert.link.startsWith("/") ? alert.link : `/${alert.link}`;
    router.push(`/${locale}${localPath}`);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleProfileClick = () => {
    router.push(`/${locale}/dashboard/profile`);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64"
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative w-64 lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : null}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 max-h-[28rem] overflow-auto" align="end">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>{locale === "bn" ? "নোটিফিকেশন" : "Notifications"}</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={loadNotifications}>
                {locale === "bn" ? "রিফ্রেশ" : "Refresh"}
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {alerts.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  {locale === "bn" ? "কোনো নোটিফিকেশন নেই" : "No notifications"}
                </div>
              ) : (
                alerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-1 py-3",
                      !alert.readAt && "bg-muted/40"
                    )}
                    onSelect={async (e) => {
                      e.preventDefault();
                      await openAlert(alert);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className={cn("text-sm", !alert.readAt && "font-medium")}>
                        {locale === "bn" ? alert.titleBn || alert.title : alert.title}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          alert.readAt
                            ? "bg-muted text-muted-foreground"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {alert.readAt
                          ? locale === "bn"
                            ? "পঠিত"
                            : "READ"
                          : locale === "bn"
                            ? "অপঠিত"
                            : "UNREAD"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {locale === "bn" ? alert.messageBn || alert.message : alert.message}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatars/user.png" alt={user?.name || "User"} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>{t("navigation.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("auth.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
