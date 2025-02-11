export function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  // Convert to base64 for safe storage/transmission
  return Buffer.from(result).toString("base64");
}

export function xorDecrypt(encryptedBase64: string, key: string): string {
  // Convert from base64 back to encrypted string
  const encrypted = Buffer.from(encryptedBase64, "base64").toString();
  let result = "";
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}
