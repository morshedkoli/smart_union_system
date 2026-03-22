"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save, User2, Eye, EyeOff } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";

interface ProfileForm {
  name: string;
  nameEn?: string;
  nameBn?: string;
  phone?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfileContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const { user, refreshUser } = useAuth();
  const isBn = locale === "bn";

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    nameEn: "",
    nameBn: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        nameEn: user.nameEn || "",
        nameBn: user.nameBn || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const labels = useMemo(
    () => ({
      title: isBn ? "প্রোফাইল সেটিংস" : "Profile Settings",
      subtitle: isBn ? "আপনার প্রোফাইল তথ্য এবং পাসওয়ার্ড পরিবর্তন করুন" : "Manage your profile information and change password",
      personalInfo: isBn ? "ব্যক্তিগত তথ্য" : "Personal Information",
      personalInfoDesc: isBn ? "আপনার নাম এবং যোগাযোগের তথ্য আপডেট করুন" : "Update your name and contact information",
      email: isBn ? "ইমেইল" : "Email",
      name: isBn ? "নাম" : "Name",
      nameEn: isBn ? "ইংরেজি নাম" : "English Name",
      nameBn: isBn ? "বাংলা নাম" : "Bengali Name",
      phone: isBn ? "ফোন নম্বর" : "Phone Number",
      phoneOptional: isBn ? "ফোন নম্বর (ঐচ্ছিক)" : "Phone Number (Optional)",
      role: isBn ? "ভূমিকা" : "Role",
      status: isBn ? "স্ট্যাটাস" : "Status",
      lastLogin: isBn ? "শেষ লগইন" : "Last Login",
      changePassword: isBn ? "পাসওয়ার্ড পরিবর্তন" : "Change Password",
      changePasswordDesc: isBn ? "নিরাপত্তার জন্য নিয়মিত পাসওয়ার্ড পরিবর্তন করুন" : "Update your password regularly for security",
      currentPassword: isBn ? "বর্তমান পাসওয়ার্ড" : "Current Password",
      newPassword: isBn ? "নতুন পাসওয়ার্ড" : "New Password",
      confirmPassword: isBn ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm New Password",
      passwordMinLength: isBn ? "কমপক্ষে ৮ অক্ষরের হতে হবে" : "Must be at least 8 characters",
      saveProfile: isBn ? "প্রোফাইল সংরক্ষণ" : "Save Profile",
      updatePassword: isBn ? "পাসওয়ার্ড আপডেট" : "Update Password",
      saving: isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...",
      updating: isBn ? "আপডেট হচ্ছে..." : "Updating...",
      profileUpdateFailed: isBn ? "প্রোফাইল আপডেট করা যায়নি" : "Failed to update profile",
      passwordUpdateFailed: isBn ? "পাসওয়ার্ড আপডেট করা যায়নি" : "Failed to update password",
      profileUpdateSuccess: isBn ? "প্রোফাইল সফলভাবে আপডেট হয়েছে" : "Profile updated successfully",
      passwordUpdateSuccess: isBn ? "পাসওয়ার্ড সফলভাবে আপডেট হয়েছে" : "Password updated successfully",
      passwordMismatch: isBn ? "পাসওয়ার্ড মিল নেই" : "Passwords do not match",
    }),
    [isBn]
  );

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setProfileError(data.message || labels.profileUpdateFailed);
        return;
      }

      setProfileMessage(labels.profileUpdateSuccess);
      // Refresh user data in auth context
      await refreshUser();
    } catch {
      setProfileError(labels.profileUpdateFailed);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(labels.passwordMismatch);
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      const res = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordError(data.message || labels.passwordUpdateFailed);
        return;
      }

      setPasswordMessage(labels.passwordUpdateSuccess);
      // Clear password form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      setPasswordError(labels.passwordUpdateFailed);
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateProfileField = (field: keyof ProfileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const updatePasswordField = (field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User2 className="h-6 w-6" />
            {labels.title}
          </h1>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <div className="grid gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{labels.personalInfo}</CardTitle>
              <CardDescription>
                {labels.personalInfoDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Read-only fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{labels.email}</Label>
                    <Input value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.role}</Label>
                    <Input value={user?.role || ""} disabled />
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-2">
                  <Label htmlFor="name">{labels.name}</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => updateProfileField("name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">{labels.nameEn}</Label>
                    <Input
                      id="nameEn"
                      value={profileForm.nameEn}
                      onChange={(e) => updateProfileField("nameEn", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameBn">{labels.nameBn}</Label>
                    <Input
                      id="nameBn"
                      value={profileForm.nameBn}
                      onChange={(e) => updateProfileField("nameBn", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{labels.phoneOptional}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => updateProfileField("phone", e.target.value)}
                    placeholder="+880..."
                  />
                </div>

                {profileError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}

                {profileMessage && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {profileMessage}
                  </div>
                )}

                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {labels.saving}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {labels.saveProfile}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>{labels.changePassword}</CardTitle>
              <CardDescription>
                {labels.changePasswordDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{labels.currentPassword}</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{labels.newPassword}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => updatePasswordField("newPassword", e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{labels.passwordMinLength}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{labels.confirmPassword}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {passwordMessage}
                  </div>
                )}

                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {labels.updating}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {labels.updatePassword}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}