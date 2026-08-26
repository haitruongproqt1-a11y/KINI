import { readFile } from "node:fs/promises";

import { upsertAndroidReleaseSigning } from "../server/db";

async function main() {
  const [keystorePath, configPath] = process.argv.slice(2);
  if (!keystorePath || !configPath) throw new Error("Usage: tsx scripts/provision-android-signing.ts <keystore> <config.json>");
  const [keystore, configRaw] = await Promise.all([readFile(keystorePath), readFile(configPath, "utf8")]);
  const config = JSON.parse(configRaw) as { storePassword?: string; keyAlias?: string; keyPassword?: string };
  if (!config.storePassword || !config.keyAlias || !config.keyPassword) throw new Error("Thiếu thông tin khóa ký Android.");
  await upsertAndroidReleaseSigning({
    keyId: "default",
    keystoreBase64: keystore.toString("base64"),
    storePassword: config.storePassword,
    keyAlias: config.keyAlias,
    keyPassword: config.keyPassword,
  });
  console.log("Android release signing key is ready for the trusted KINI GitHub workflow.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
