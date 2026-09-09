import type { Metadata } from "next";
import "@fontsource/league-gothic/400.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Will Worrell — Software Engineer",
  description:
    "Will Worrell is a software engineer with strong product sense, building thoughtful, reliable products.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
