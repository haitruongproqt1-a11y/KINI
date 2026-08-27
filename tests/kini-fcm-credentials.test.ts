import { importPKCS8, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

describe("Firebase service account", () => {
  it("lấy được OAuth access token cho FCM HTTP v1", async () => {
    const rawCredentials = process.env.FCM_SERVICE_ACCOUNT_JSON;
    expect(Boolean(rawCredentials), "Thiếu FCM_SERVICE_ACCOUNT_JSON").toBe(true);

    const credentials = JSON.parse(rawCredentials!) as FirebaseServiceAccount;
    expect(credentials.project_id).toBe("kini-app");
    expect(Boolean(credentials.client_email?.includes("@")), "Thiếu client_email Firebase hợp lệ").toBe(true);
    expect(Boolean(credentials.private_key?.includes("BEGIN PRIVATE KEY")), "private_key phải giữ định dạng PEM gốc").toBe(true);

    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(credentials.private_key!, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credentials.client_email!)
      .setSubject(credentials.client_email!)
      .setAudience(credentials.token_uri ?? "https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const response = await fetch(credentials.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const responseText = await response.text();
    expect(response.ok, "Không thể lấy access token Firebase").toBe(true);
    const data = JSON.parse(responseText) as { access_token?: string };
    expect(data.access_token).toBeTruthy();
  }, 20_000);
});
