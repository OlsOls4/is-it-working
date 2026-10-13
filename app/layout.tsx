import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import { ModeProvider } from "@/components/ModeProvider";


export const metadata: Metadata = {
  title: "Is It Working? — skincare verdicts from your weekly selfie",
  description: "Track the skincare you start, check in with a weekly selfie analysed by YouCam Skin AI, and get a keep / wait / drop verdict for every product.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f0e6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <ModeProvider>
          <div className="shell">
            <TopBar />
            <main>{children}</main>
          </div>
          <TabBar />
        </ModeProvider>
      </body>
    </html>
  );
}
