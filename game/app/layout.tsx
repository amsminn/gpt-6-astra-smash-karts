import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(
    'https://smash-karts-arena-chaewan.amsminn.chatgpt.site',
  ),
  title: 'Smash Karts Arena — 3D 카트 배틀',
  description:
    '친구들과 즐기는 3분 카트 배틀. 무기를 줍고 아레나를 질주하세요.',
  openGraph: {
    title: 'Smash Karts Arena',
    description: '작은 카트. 거대한 한 방. 친구들과 즐기는 3D 카트 배틀.',
    images: [
      { url: '/og.png', alt: 'Smash Karts Arena — Drive. Fire. Repeat.' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smash Karts Arena',
    description: '친구들과 즐기는 3D 카트 배틀.',
    images: ['/og.png'],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
