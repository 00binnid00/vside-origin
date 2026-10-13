import "./globals.css";
import Providers from "./providers";
import AppShell from "./app-shell";

import { GlobalInvitationToast } from "@/components/notifications/GlobalInvitationToast";
import { DesignDraftToast } from "@/components/notifications/DesignDraftToast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          <GlobalInvitationToast />
          <DesignDraftToast />
        </Providers>
      </body>
    </html>
  );
}