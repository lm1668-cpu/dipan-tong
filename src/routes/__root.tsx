import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { useAppStore } from "@/lib/site/store";
import appCss from "../styles.css?url";

const APP_NAME = "地盤通";

function StoreHydrator() {
  useEffect(() => {
    let live = true;
    void Promise.resolve(useAppStore.persist.rehydrate()).finally(() => {
      if (live) useAppStore.setState({ _hydrated: true });
    });
    return () => {
      live = false;
    };
  }, []);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "地盤通：香港室內設計同工程公司嘅工地管理。日誌、執漏、人手、材料，一個位跟到尾。" },
      { name: "theme-color", content: "#0E1C3A" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700;900&display=swap" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="zh-Hant" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <StoreHydrator />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster position="top-center" />
        <Scripts />
      </body>
    </html>
  ),
});
