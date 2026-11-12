import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { TopProgressBar } from '@/components/layout/TopProgressBar';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Agentation } from "agentation";

import { AntdRegistry } from '@ant-design/nextjs-registry';

export const metadata: Metadata = {
  title: 'Precision Farm Management OS',
  description: 'Production-ready Next.js App Router farm dashboard with telemetry, IoT sensors, and smart irrigation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('farmhub_theme') || localStorage.getItem('agripulse_theme');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                  document.documentElement.setAttribute('data-theme', savedTheme);
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(savedTheme);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-app text-text-main antialiased selection:bg-emerald-500 selection:text-slate-950">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <AntdRegistry>
          <ThemeProvider>
            <LanguageProvider>
              <Agentation />
              <AppShell>{children}</AppShell>
            </LanguageProvider>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
