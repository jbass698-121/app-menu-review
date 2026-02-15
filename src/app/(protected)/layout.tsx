import { AppLayout } from '@/components/app-layout'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Temporarily remove server-side auth check; rely on client-side auth
  return <AppLayout>{children}</AppLayout>
}
