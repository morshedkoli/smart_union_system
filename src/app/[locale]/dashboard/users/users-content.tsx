"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import { Shield } from "lucide-react";

type Role = "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface UserRow {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  status: Status;
  lastLoginAt?: string;
  createdAt: string;
}

const roles: Role[] = ["SECRETARY", "ENTREPRENEUR", "CITIZEN"];

export function UsersContent({ locale }: { locale: string }) {
  const { user } = useAuth();
  const isBn = locale === "bn";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Dev@12345");
  const [role, setRole] = useState<Role>("ENTREPRENEUR");
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || (locale === "bn" ? "ব্যবহারকারী লোড ব্যর্থ" : "Failed to load users"));
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError(locale === "bn" ? "ব্যবহারকারী লোড ব্যর্থ" : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "SECRETARY") {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name, phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || (locale === "bn" ? "ব্যবহারকারী তৈরি ব্যর্থ" : "Failed to create user"));
        return;
      }

      setMessage(locale === "bn" ? "ব্যবহারকারী তৈরি হয়েছে" : "User created successfully");
      setEmail("");
      setName("");
      setPhone("");
      setPassword("Dev@12345");
      setRole("ENTREPRENEUR");
      await loadUsers();
    } catch {
      setError(locale === "bn" ? "ব্যবহারকারী তৈরি ব্যর্থ" : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  // Role check - only SECRETARY can access
  if (!user || user.role !== "SECRETARY") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {isBn ? "ব্যবহারকারী ব্যবস্থাপনা" : "User Management"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{isBn ? "অ্যাক্সেস অস্বীকৃত - শুধুমাত্র সচিবের জন্য" : "Access Denied - Secretary Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{locale === "bn" ? "ব্যবহারকারী ব্যবস্থাপনা" : "Users Management"}</h1>
          <p className="text-muted-foreground">
            {locale === "bn" ? "অ্যাডমিন/অপারেটর ইউজার লিস্ট ও নতুন ব্যবহারকারী তৈরি" : "List users and create new users"}
          </p>
        </div>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {message && <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "নতুন ব্যবহারকারী" : "Create User"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div className="space-y-1">
                <Label>{locale === "bn" ? "নাম" : "Name"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>{locale === "bn" ? "ফোন" : "Phone"}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{locale === "bn" ? "পাসওয়ার্ড" : "Password"}</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>{locale === "bn" ? "রোল" : "Role"}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (locale === "bn" ? "তৈরি হচ্ছে..." : "Creating...") : locale === "bn" ? "ব্যবহারকারী তৈরি" : "Create User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-3">
              <CardTitle>{locale === "bn" ? "ব্যবহারকারীর তালিকা" : "Users List"}</CardTitle>
              <Input
                className="max-w-sm"
                placeholder={locale === "bn" ? "নাম/ইমেইল দিয়ে খুঁজুন" : "Search by name/email"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button variant="outline" onClick={loadUsers} disabled={loading}>
                {locale === "bn" ? "রিফ্রেশ" : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "bn" ? "নাম" : "Name"}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{locale === "bn" ? "রোল" : "Role"}</TableHead>
                  <TableHead>{locale === "bn" ? "স্ট্যাটাস" : "Status"}</TableHead>
                  <TableHead>{locale === "bn" ? "সর্বশেষ লগইন" : "Last Login"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {locale === "bn" ? "লোড হচ্ছে..." : "Loading..."}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {locale === "bn" ? "কোনো ব্যবহারকারী নেই" : "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "destructive" : "secondary"}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

