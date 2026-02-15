'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Download, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setEmail(user.email || '')
  }

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
    router.refresh()
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/export')
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('No reviews to export')
          return
        }
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'menu-reviews-export.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Failed to export data')
    }
  }

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{email}</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
            disabled={loading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loading ? 'Signing out...' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export my data (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">Menu Review</p>
          <p className="text-xs text-muted-foreground">
            Your personal food memory companion. Remember what you loved
            and what to skip at every restaurant.
          </p>
          <Separator />
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
