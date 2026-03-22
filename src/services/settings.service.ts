import { prisma } from "@/lib/db";

const UNION_NAME_KEY = "union_name";
const UNION_LOGO_KEY = "union_logo";
const UNION_SIGNATURE_KEY = "union_signature";

export class SettingsService {
  static async getUnionProfile(): Promise<{
    unionName: string;
    logo: string;
    signature: string;
  }> {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [UNION_NAME_KEY, UNION_LOGO_KEY, UNION_SIGNATURE_KEY],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const map = new Map(settings.map((item) => [item.key, item.value]));
    return {
      unionName: map.get(UNION_NAME_KEY) || "",
      logo: map.get(UNION_LOGO_KEY) || "",
      signature: map.get(UNION_SIGNATURE_KEY) || "",
    };
  }

  static async upsertUnionProfile(data: {
    unionName: string;
    logo: string;
    signature: string;
  }): Promise<void> {
    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: UNION_NAME_KEY },
        update: { value: data.unionName, type: "string", description: "Union name for official documents" },
        create: {
          key: UNION_NAME_KEY,
          value: data.unionName,
          type: "string",
          description: "Union name for official documents",
        },
      }),
      prisma.setting.upsert({
        where: { key: UNION_LOGO_KEY },
        update: { value: data.logo, type: "string", description: "Union logo (URL or base64)" },
        create: {
          key: UNION_LOGO_KEY,
          value: data.logo,
          type: "string",
          description: "Union logo (URL or base64)",
        },
      }),
      prisma.setting.upsert({
        where: { key: UNION_SIGNATURE_KEY },
        update: { value: data.signature, type: "string", description: "Authorized signature image (URL or base64)" },
        create: {
          key: UNION_SIGNATURE_KEY,
          value: data.signature,
          type: "string",
          description: "Authorized signature image (URL or base64)",
        },
      }),
    ]);
  }
}

