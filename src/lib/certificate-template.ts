export const SUPPORTED_CERTIFICATE_PLACEHOLDERS = [
  "name",
  "name_en",
  "name_bn",
  "father_name",
  "father_name_en",
  "father_name_bn",
  "mother_name",
  "mother_name_en",
  "mother_name_bn",
] as const;

export type SupportedCertificatePlaceholder =
  (typeof SUPPORTED_CERTIFICATE_PLACEHOLDERS)[number];

