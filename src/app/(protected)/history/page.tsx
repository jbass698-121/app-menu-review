'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface HistoryItem {
  id: string
  dish_name: string
  restaurant_name: string
  restaurant_id: string
  would_order_again: boolean
  rating: number | null
  notes: string | null
  visited_at: string | null
  created_at: string
  city: string | null
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'yes' | 'skip'>('all')
  const [timeRange, setTimeRange] = useState<'30' | '180' | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('reviews')
      .select(`
        id,
        would_order_again,
        rating,
        notes,
        visited_at,
        created_at,
        menu_items!inner (
          name,
          restaurants!inner (
            id,
            name,
            city
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setItems(
        data.map((r: any) => ({
          id: r.id,
          dish_name: r.menu_items.name,
          restaurant_name: r.menu_items.restaurants.name,
          restaurant_id: r.menu_items.restaurants.id,
          would_order_again: r.would_order_again,
          rating: r.rating,
          notes: r.notes,
          visited_at: r.visited_at,
          created_at: r.created_at,
          city: r.menu_items.restaurants.city,
        }))
      )
    }
    setLoading(false)
  }

  const filtered = items.filter((item) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      if (
        !item.dish_name.toLowerCase().includes(q) &&
        !item.restaurant_name.toLowerCase().includes(q)
      )
        return false
    }

    // Yes/Skip filter
    if (filter === 'yes' && !item.would_order_again) return false
    if (filter === 'skip' && item.would_order_again) return false

    // Time range filter
    if (timeRange !== 'all') {
      const days = parseInt(timeRange)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      if (new Date(item.created_at) < cutoff) return false
    }

    return true
  })

  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Your food memories</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search dish or restaurant"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'yes', 'skip'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {f === 'all' ? 'All' : f === 'yes' ? 'YES again' : 'Skip'}
          </button>
        ))}
        <span className="w-px bg-border" />
        {([
          { value: '30', label: '30 days' },
          { value: '180', label: '6 months' },
          { value: 'all', label: 'All time' },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => setTimeRange(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              timeRange === t.value
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-muted-foreground text-sm">
            {items.length === 0 ? 'No reviews yet' : 'No matches found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/restaurants/${item.restaurant_id}`)}
              className="w-full text-left p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {item.dish_name}{' '}
                    <span className="text-muted-foreground font-normal">
                      @ {item.restaurant_name}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3 w-3',
                              i < item.rating!
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {item.visited_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.visited_at).toLocaleDateString()}
                      </span>
                    )}
                    {item.city && (
                      <span className="text-xs text-muted-foreground">{item.city}</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>
                  )}
                </div>
                <Badge
                  className={cn(
                    'flex-shrink-0 text-xs',
                    item.would_order_again
                      ? 'bg-green-500 text-white'
                      : 'bg-red-100 text-red-600'
                  )}
                >
                  {item.would_order_again ? (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> YES
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="h-3 w-3" /> SKIP
                    </span>
                  )}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
