import { tursoClient } from "../client";
import { ulid } from "ulid";
import { xorEncrypt } from "../../../utils/common/xor";
import type { APIContext } from "@/types";

interface CreateProfileParams {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
  fingerprint: string;
}

interface CreateProfileResponse {
  encryptedEmail: string;
  encryptedCode: string;
}

export async function createProfile(
  params: CreateProfileParams,
  publicAuthSecret: string,
  context?: APIContext
): Promise<CreateProfileResponse> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    throw new Error("No database connection");
  }

  const { firstname, email, codeword, persona, bio, fingerprint } = params;

  const { rows: existing } = await client.execute({
    sql: "SELECT id FROM leads WHERE email = ?",
    args: [email],
  });

  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  const leadId = ulid();
  const encrypted = xorEncrypt(codeword, publicAuthSecret);
  const encryptedEmail = xorEncrypt(email, publicAuthSecret);

  await client.execute({
    sql: `INSERT INTO leads (id, first_name, email, password_hash, contact_persona, short_bio, 
          encrypted_email, encrypted_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [leadId, firstname, email, encrypted, persona, bio, encryptedEmail, encrypted],
  });

  await client.execute({
    sql: "UPDATE fingerprints SET lead_id = ? WHERE id = ?",
    args: [leadId, fingerprint],
  });

  return {
    encryptedEmail,
    encryptedCode: encrypted,
  };
}
