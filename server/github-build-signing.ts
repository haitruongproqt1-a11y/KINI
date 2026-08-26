import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import * as db from "./db";

const githubJwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const repository = "haitruongproqt1-a11y/KINI";
const workflowRef = "haitruongproqt1-a11y/KINI/.github/workflows/build-release.yml@refs/heads/main";

export const githubBuildOidcAudience = "kini-android-release";

export function assertTrustedGithubBuild(payload: JWTPayload) {
  if (payload.repository !== repository || payload.workflow_ref !== workflowRef || payload.ref !== "refs/heads/main" || payload.event_name !== "workflow_dispatch") {
    throw new Error("Yêu cầu cấp khóa không thuộc workflow build KINI được cho phép.");
  }
}

export async function getSigningPayloadFromGithubToken(token: string) {
  const { payload } = await jwtVerify(token, githubJwks, {
    issuer: "https://token.actions.githubusercontent.com",
    audience: githubBuildOidcAudience,
  });
  assertTrustedGithubBuild(payload);
  const signing = await db.getAndroidReleaseSigning();
  if (!signing) throw new Error("Khóa ký APK chưa sẵn sàng.");
  return {
    keystoreBase64: signing.keystoreBase64,
    storePassword: signing.storePassword,
    keyAlias: signing.keyAlias,
    keyPassword: signing.keyPassword,
  };
}
