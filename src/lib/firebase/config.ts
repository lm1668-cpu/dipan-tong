export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export function getFirebaseConfig(): FirebaseWebConfig {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
    appId: env.VITE_FIREBASE_APP_ID?.trim() ?? "",
  };
}

export function isFirebaseConfigured(config: FirebaseWebConfig = getFirebaseConfig()): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.appId,
  );
}

export function validateFirebaseConfig(config: FirebaseWebConfig): string[] {
  const missing: string[] = [];
  if (!config.apiKey.trim()) missing.push("apiKey");
  if (!config.authDomain.trim()) missing.push("authDomain");
  if (!config.projectId.trim()) missing.push("projectId");
  if (!config.storageBucket.trim()) missing.push("storageBucket");
  if (!config.messagingSenderId.trim()) missing.push("messagingSenderId");
  if (!config.appId.trim()) missing.push("appId");
  return missing;
}

export function formatEnvFile(config: FirebaseWebConfig): string {
  return [
    "# 地盤通 Firebase 設定（放入本機 .env.local 或 GitHub Actions Secrets，切勿直接 Commit 真實密鑰）",
    `VITE_FIREBASE_API_KEY=${config.apiKey.trim()}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${config.authDomain.trim()}`,
    `VITE_FIREBASE_PROJECT_ID=${config.projectId.trim()}`,
    `VITE_FIREBASE_STORAGE_BUCKET=${config.storageBucket.trim()}`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId.trim()}`,
    `VITE_FIREBASE_APP_ID=${config.appId.trim()}`,
    "VITE_DEMO_MODE=false",
  ].join("\n");
}
