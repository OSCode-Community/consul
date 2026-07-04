import type { Metadata } from 'next';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'OSCode Image Uploader',
  description: 'Drag & drop images to add the OSCode watermark and get a shareable URL.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
