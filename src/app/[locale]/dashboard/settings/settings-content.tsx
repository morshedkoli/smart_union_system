"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UnionSettings {
  unionName: string;
  logo: string;
  signature: string;
}

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;

export function SettingsContent({ locale }: { locale: string }) {
  const isBn = locale === "bn";

  const [form, setForm] = useState<UnionSettings>({
    unionName: "",
    logo: "",
    signature: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const labels = useMemo(
    () => ({
      title: isBn ? "সেটিংস প্যানেল" : "Settings Panel",
      subtitle: isBn
        ? "অ্যাডমিন ইউনিয়নের নাম, লোগো এবং স্বাক্ষর আপডেট করতে পারবেন"
        : "Admin can update union name, logo, and signature",
      unionName: isBn ? "ইউনিয়নের নাম" : "Union Name",
      unionNamePlaceholder: isBn ? "যেমন: স্মার্ট ইউনিয়ন পরিষদ" : "e.g. Smart Union Parishad",
      logo: isBn ? "লোগো" : "Logo",
      signature: isBn ? "স্বাক্ষর" : "Signature",
      imageUrl: isBn ? "ইমেজ URL" : "Image URL",
      uploadImage: isBn ? "ইমেজ আপলোড" : "Upload Image",
      save: isBn ? "সংরক্ষণ করুন" : "Save Settings",
      saving: isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...",
      loadFailed: isBn ? "সেটিংস লোড করা যায়নি" : "Failed to load settings",
      updateFailed: isBn ? "সেটিংস আপডেট করা যায়নি" : "Failed to update settings",
      updateSuccess: isBn ? "সেটিংস সফলভাবে আপডেট হয়েছে" : "Settings updated successfully",
      fileTooLarge: isBn ? "ফাইল ২ এমবি এর মধ্যে হতে হবে" : "File size must be within 2MB",
      invalidFileType: isBn ? "শুধুমাত্র ইমেজ ফাইল গ্রহণযোগ্য" : "Only image files are allowed",
      preview: isBn ? "প্রিভিউ" : "Preview",
      uploadHint: isBn ? "PNG/JPG, সর্বোচ্চ ২ এমবি" : "PNG/JPG, up to 2MB",
    }),
    [isBn]
  );

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/settings/union-profile", {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || labels.loadFailed);
          return;
        }
        setForm({
          unionName: data.data?.unionName || "",
          logo: data.data?.logo || "",
          signature: data.data?.signature || "",
        });
      } catch {
        setError(labels.loadFailed);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [labels.loadFailed]);

  const setField = (field: keyof UnionSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload =
    (field: "logo" | "signature") => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setMessage("");
      setError("");

      if (!file.type.startsWith("image/")) {
        setError(labels.invalidFileType);
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(labels.fileTooLarge);
        return;
      }

      try {
        const base64 = await toBase64(file);
        setField(field, base64);
      } catch {
        setError(labels.updateFailed);
      } finally {
        e.target.value = "";
      }
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/union-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || labels.updateFailed);
        return;
      }
      setMessage(labels.updateSuccess);
    } catch {
      setError(labels.updateFailed);
    } finally {
      setSaving(false);
    }
  };

  const Preview = ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className: string;
  }) => {
    if (!src) {
      return <div className="text-xs text-muted-foreground">-</div>;
    }
    const isDataImage = src.startsWith("data:image/");
    const isUrlImage = src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/");
    if (!isDataImage && !isUrlImage) {
      return <div className="text-xs text-muted-foreground">{isBn ? "অবৈধ ইমেজ সোর্স" : "Invalid image source"}</div>;
    }

    return (
      <div className={`overflow-hidden rounded-md border bg-white ${className}`}>
        <img src={src} alt={alt} className="h-full w-full object-contain p-2" />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            {labels.title}
          </h1>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.title}</CardTitle>
            <CardDescription>
              {isBn
                ? "ডকুমেন্ট হেডার/ফুটারে ব্যবহৃত ইউনিয়ন তথ্য আপডেট করুন"
                : "Update union info used in document header/footer"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isBn ? "লোড হচ্ছে..." : "Loading..."}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="unionName">{labels.unionName}</Label>
                  <Input
                    id="unionName"
                    value={form.unionName}
                    onChange={(e) => setField("unionName", e.target.value)}
                    placeholder={labels.unionNamePlaceholder}
                    required
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">{labels.logo} ({labels.imageUrl})</Label>
                      <Input
                        id="logoUrl"
                        value={form.logo}
                        onChange={(e) => setField("logo", e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoFile">{labels.logo} ({labels.uploadImage})</Label>
                      <Input id="logoFile" type="file" accept="image/*" onChange={handleImageUpload("logo")} />
                      <p className="text-xs text-muted-foreground">{labels.uploadHint}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>{labels.preview} - {labels.logo}</Label>
                      <Preview src={form.logo} alt="Union logo" className="h-28 w-full" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signatureUrl">{labels.signature} ({labels.imageUrl})</Label>
                      <Input
                        id="signatureUrl"
                        value={form.signature}
                        onChange={(e) => setField("signature", e.target.value)}
                        placeholder="https://example.com/signature.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signatureFile">{labels.signature} ({labels.uploadImage})</Label>
                      <Input
                        id="signatureFile"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload("signature")}
                      />
                      <p className="text-xs text-muted-foreground">{labels.uploadHint}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>{labels.preview} - {labels.signature}</Label>
                      <Preview src={form.signature} alt="Union signature" className="h-28 w-full" />
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {message}
                  </div>
                ) : null}

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {labels.saving}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {labels.save}
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

