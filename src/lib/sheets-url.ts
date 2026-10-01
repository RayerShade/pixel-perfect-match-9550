/** Her tür Google Sheets bağlantısını xlsx indirme adresine çevirir. */
export function exportUrl(girdi: string): string | null {
  const u = girdi.trim().replace(/^\/\//, "https://");
  // "Web'de yayınla" bağlantısı: /spreadsheets/d/e/<id>/pubhtml
  const pub = u.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=xlsx`;
  // Her biçim: /spreadsheets/d/<id>, /spreadsheets/u/0/d/<id>, /file/d/<id>/view, /document/d/<id>
  const normal =
    u.match(/\/d\/([a-zA-Z0-9_-]{20,})/) ??
    u.match(/[?&]id=([a-zA-Z0-9_-]{20,})/) ??
    u.match(/docs\.google\.com\/[a-z]+\/([a-zA-Z0-9_-]{20,})/);
  if (normal) return `https://docs.google.com/spreadsheets/d/${normal[1]}/export?format=xlsx`;
  // Sadece kimlik yapıştırıldıysa
  if (/^[a-zA-Z0-9_-]{25,}$/.test(u)) return `https://docs.google.com/spreadsheets/d/${u}/export?format=xlsx`;
  return null;
}

