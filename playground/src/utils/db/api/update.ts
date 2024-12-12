import { tursoClient } from "../client";
import { xorEncrypt } from "../../../utils/common/xor";

interface UpdateProfileParams {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
  fingerprint: string;
}

interface UpdateProfileResponse {
  encryptedEmail: string;
  encryptedCode: string;
}

export async function updateProfile(
  params: UpdateProfileParams,
  publicAuthSecret: string
): Promise<UpdateProfileResponse> {
  const client = await tursoClient.getClient();
  if (!client) {
    throw new Error("No database connection");
  }

  const { firstname, email, codeword, persona, bio, fingerprint } = params;

  // Verify codeword matches before allowing update
  const { rows } = await client.execute({
    sql: `SELECT l.id, l.password_hash 
          FROM leads l 
          JOIN fingerprints f ON l.id = f.lead_id 
          WHERE f.id = ?`,
    args: [fingerprint],
  });

  if (rows.length === 0) {
    throw new Error("Profile not found");
  }

  const encrypted = xorEncrypt(codeword, publicAuthSecret);
  if (encrypted !== rows[0].password_hash) {
    throw new Error("Invalid credentials");
  }

  await client.execute({
    sql: `UPDATE leads 
          SET first_name = ?, email = ?, contact_persona = ?, short_bio = ?, changed = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [firstname, email, persona, bio, rows[0].id],
  });

  return {
    encryptedEmail: xorEncrypt(email, publicAuthSecret),
    encryptedCode: encrypted,
  };
}
