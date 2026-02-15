'use client'

import { BottomNav } from './bottom-nav'
import { Toaster } from '@/components/ui/sonner'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <main className="mx-auto max-w-lg px-4">{children}</main>
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
