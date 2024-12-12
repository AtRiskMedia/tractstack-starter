import { tursoClient } from "../client";
import { xorEncrypt } from "../../../utils/common/xor";

interface UnlockParams {
  email?: string;
  codeword?: string;
  fingerprint?: string;
  encryptedEmail?: string;
  encryptedCode?: string;
}

interface UnlockResponse {
  firstname: string | null;
  contactPersona: string | null;
  email: string | null;
  shortBio: string | null;
  encryptedEmail: string | null;
  encryptedCode: string | null;
  beliefs?: string;
}

export async function unlockProfile(
  params: UnlockParams,
  publicAuthSecret: string
): Promise<UnlockResponse> {
  const client = await tursoClient.getClient();
  if (!client) {
    throw new Error("No database connection");
  }

  const { email, codeword, fingerprint, encryptedEmail, encryptedCode } = params;

  let queryArgs = [];
  let queryWhere = "";

  if (encryptedEmail && encryptedCode) {
    queryWhere = "encrypted_email = ? AND encrypted_code = ?";
    queryArgs = [encryptedEmail, encryptedCode];
  } else if (email) {
    queryWhere = "email = ?";
    queryArgs = [email];
  } else {
    throw new Error("Invalid request parameters");
  }

  const { rows } = await client.execute({
    sql: `SELECT 
      id, 
      first_name, 
      email, 
      password_hash,
      encrypted_code,
      contact_persona,
      short_bio,
      encrypted_email
    FROM leads 
    WHERE ${queryWhere}
    LIMIT 1`,
    args: queryArgs,
  });

  if (rows.length === 0) {
    throw new Error("Profile not found");
  }

  if (codeword) {
    const encrypted = xorEncrypt(codeword, publicAuthSecret);
    if (encrypted !== String(rows[0].password_hash)) {
      throw new Error("Invalid credentials");
    }
  }

  if (fingerprint) {
    await client.execute({
      sql: "UPDATE fingerprints SET lead_id = ? WHERE id = ? AND lead_id IS NULL",
      args: [rows[0].id, fingerprint],
    });
  }

  const { rows: beliefRows } = await client.execute({
    sql: `
    WITH latest_fingerprint AS (
      SELECT f.id as fingerprint_id
      FROM fingerprints f
      JOIN heldbeliefs b ON f.id = b.fingerprint_id
      WHERE f.lead_id = ?
      GROUP BY f.id
      ORDER BY MAX(b.updated_at) DESC
      LIMIT 1
    )
    SELECT c.object_name as slug, 
           c.object_id as id, 
           b.verb, 
           b.object
    FROM heldbeliefs b
    JOIN corpus c ON b.belief_id = c.id
    JOIN latest_fingerprint lf ON b.fingerprint_id = lf.fingerprint_id`,
    args: [rows[0].id],
  });

  return {
    firstname: rows[0].first_name ? String(rows[0].first_name) : null,
    contactPersona: rows[0].contact_persona ? String(rows[0].contact_persona) : null,
    email: rows[0].email ? String(rows[0].email) : null,
    shortBio: rows[0].short_bio ? String(rows[0].short_bio) : null,
    encryptedEmail: rows[0].encrypted_email ? String(rows[0].encrypted_email) : null,
    encryptedCode: rows[0].encrypted_code ? String(rows[0].encrypted_code) : null,
    beliefs: beliefRows.length > 0 ? JSON.stringify(beliefRows) : undefined,
  };
}
