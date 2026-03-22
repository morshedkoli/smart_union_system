// Sanitize HTML content to prevent XSS
// Note: For production, install isomorphic-dompurify: npm install isomorphic-dompurify
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  
  // Basic HTML sanitization without external dependency
  // In production, use DOMPurify for better security
  const allowedTags = [
    "p", "br", "strong", "b", "em", "i", "u",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "span", "div",
    "table", "thead", "tbody", "tr", "td", "th"
  ];
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']\s*(javascript|data):/gi, "");
  
  return sanitized;
}

// Sanitize plain text - remove HTML tags completely
export function sanitizeText(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/<[^>]*>/g, "").trim();
}

// Sanitize email
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

// Sanitize phone number - keep only digits and + sign
export function sanitizePhone(phone: string): string {
  if (typeof phone !== "string") return "";
  return phone.replace(/[^\d+]/g, "").trim();
}

// Sanitize NID - keep only digits
export function sanitizeNid(nid: string): string {
  if (typeof nid !== "string") return "";
  return nid.replace(/\D/g, "").trim();
}

// Prevent NoSQL injection - sanitize object keys
export function sanitizeObjectKeys<T extends Record<string, unknown>>(
  obj: T
): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys starting with $ (NoSQL injection prevention)
    if (key.startsWith("$")) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObjectKeys(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// Sanitize string to prevent injection attacks
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";
  
  return str
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .replace(/\$\{/g, "") // Remove ${ to prevent template injection
    .replace(/\/\*/g, "") // Remove /* to prevent comment injection
    .trim();
}

// Sanitize all string values in an object recursively
export function deepSanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize) as unknown as T;
  }
  
  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip keys starting with $ (NoSQL injection)
      if (key.startsWith("$")) {
        continue;
      }
      sanitized[key] = deepSanitize(value);
    }
    return sanitized as T;
  }
  
  return obj;
}

// Sanitize search query
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== "string") return "";
  
  return query
    .replace(/[<>'"]/g, "") // Remove HTML special chars
    .replace(/[;]/g, "") // Remove semicolons
    .trim()
    .substring(0, 100); // Limit length
}

// Validate and sanitize URL
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
