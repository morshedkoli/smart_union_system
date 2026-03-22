export const SUPPORTED_CERTIFICATE_PLACEHOLDERS = ["name", "father_name"] as const;

export type SupportedCertificatePlaceholder =
  (typeof SUPPORTED_CERTIFICATE_PLACEHOLDERS)[number];

