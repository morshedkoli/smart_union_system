"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  Shield,
  PackageCheck,
  Landmark,
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  CreditCard,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles?: string[]; // Which roles can see this item
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const t = useTranslations("navigation");
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();

  // Role-based navigation items
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Common dashboard for all roles
    items.push({ href: `/${locale}/dashboard`, icon: LayoutDashboard, label: t("dashboard") });

    if (user?.role === "SECRETARY") {
      // Secretary (full access) - all items
      items.push(
        { href: `/${locale}/dashboard/citizens`, icon: Users, label: t("citizens") },
        { href: `/${locale}/dashboard/certificates`, icon: FileText, label: t("certificates") },
        { href: `/${locale}/dashboard/certificates/templates`, icon: FileText, label: locale === "bn" ? "সার্টিফিকেট টেমপ্লেট" : "Certificate Templates" },
        { href: `/${locale}/dashboard/certificates/approvals`, icon: Shield, label: locale === "bn" ? "সনদ অনুমোদন" : "Certificate Approvals" },
        { href: `/${locale}/dashboard/search`, icon: Search, label: locale === "bn" ? "গ্লোবাল সার্চ" : "Global Search" },
        { href: `/${locale}/dashboard/relief`, icon: PackageCheck, label: locale === "bn" ? "ত্রাণ" : "Relief" },
        { href: `/${locale}/dashboard/finance`, icon: Landmark, label: locale === "bn" ? "ফাইন্যান্স" : "Finance" },
        { href: `/${locale}/dashboard/excel`, icon: FileSpreadsheet, label: locale === "bn" ? "এক্সেল" : "Excel" },
        { href: `/${locale}/dashboard/taxes`, icon: Wallet, label: t("taxes") },
        { href: `/${locale}/dashboard/reports`, icon: BarChart3, label: t("reports") },
        { href: `/${locale}/dashboard/users`, icon: Shield, label: t("users") },
        { href: `/${locale}/dashboard/settings`, icon: Settings, label: t("settings") }
      );
    } else if (user?.role === "ENTREPRENEUR") {
      // Entrepreneur - can add citizens, apply for certificates
      items.push(
        { href: `/${locale}/dashboard/citizens`, icon: Users, label: t("citizens") },
        { href: `/${locale}/dashboard/certificates`, icon: FileText, label: t("certificates") },
        { href: `/${locale}/dashboard/certificates/apply`, icon: Award, label: locale === "bn" ? "সনদের আবেদন" : "Apply Certificate" },
        { href: `/${locale}/dashboard/search`, icon: Search, label: locale === "bn" ? "সার্চ" : "Search" }
      );
    } else if (user?.role === "CITIZEN") {
      // Citizen - can view their own certificates, apply for certificates
      items.push(
        { href: `/${locale}/dashboard/my-certificates`, icon: Award, label: locale === "bn" ? "আমার সনদপত্র" : "My Certificates" },
        { href: `/${locale}/dashboard/apply-certificate`, icon: FileText, label: locale === "bn" ? "সনদের আবেদন" : "Apply Certificate" },
        { href: `/${locale}/dashboard/my-taxes`, icon: CreditCard, label: locale === "bn" ? "আমার কর" : "My Taxes" }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === `/${locale}/dashboard`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2"
          >
            <Building2 className="h-8 w-8 text-primary" />
            {!collapsed && (
              <span className="text-lg font-bold text-primary">
                Smart Union
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
