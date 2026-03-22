"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Lock, User, Mail, Shield } from "lucide-react";

interface DevAccount {
  role: string;
  name: string;
  email: string;
  password: string;
}

export default function DevQuickLoginPage() {
  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/dev-quick-login")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAccounts(data.accounts);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const copyToClipboard = async (text: string, type: "email" | "password", email: string) => {
    await navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } else {
      setCopiedPassword(email);
      setTimeout(() => setCopiedPassword(null), 2000);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "ADMIN":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "OPERATOR":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "VIEWER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Available</CardTitle>
            <CardDescription>This feature is only available in development mode.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">🔧 Development Quick Login</h1>
        <p className="text-muted-foreground">
          Test accounts for all user roles - Use these credentials to test different permission levels
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up development accounts...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.email} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getRoleBadgeColor(account.role)}>{account.role.replace("_", " ")}</Badge>
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{account.name}</CardTitle>
                <CardDescription>Quick login credentials for testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                      {account.email}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(account.email, "email", account.email)}
                    >
                      {copiedEmail === account.email ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Lock className="h-4 w-4 mr-2" />
                    Password
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                      {account.password}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(account.password, "password", account.email)}
                    >
                      {copiedPassword === account.email ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => {
                    window.location.href = `/login?email=${encodeURIComponent(account.email)}`;
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Login as {account.role.replace("_", " ")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Section */}
      <Card className="mt-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-yellow-800 dark:text-yellow-200">⚠️ Development Only</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            <li>• These accounts are automatically created in development mode</li>
            <li>• All accounts use the same password for quick testing</li>
            <li>• This page is not accessible in production</li>
            <li>• Visit <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">/login</code> to test login</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
