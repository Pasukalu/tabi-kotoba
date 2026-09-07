import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('@/components/app-shell'), {
  ssr: false,
  loading: () => (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      旅ことばを読み込んでいます…
    </main>
  ),
});

export default function Page() {
  return <AppShell />;
}
