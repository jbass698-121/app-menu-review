'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Camera, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MenuItemReviewCard } from '@/components/menu-item-review-card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Restaurant, MenuItem, Review } from '@/lib/database.types'
import { MockMenuOcrService } from '@/services/menu-ocr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface MenuItemWithReview extends MenuItem {
  latest_review?: Review
}

export default function RestaurantDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [items, setItems] = useState<MenuItemWithReview[]>([])
  const [filter, setFilter] = useState<'all' | 'yes' | 'skip'>('all')
  const [loading, setLoading] = useState(true)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResults, setOcrResults] = useState<Array<{ name: string; price?: number; category?: string; checked: boolean }>>([])
  const [showOcrDialog, setShowOcrDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (rest) setRestaurant(rest)

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', id)
      .order('name')

    if (menuItems) {
      const itemsWithReviews: MenuItemWithReview[] = []
      for (const mi of menuItems) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('menu_item_id', mi.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        itemsWithReviews.push({
          ...mi,
          latest_review: reviews?.[0] || undefined,
        })
      }
      setItems(itemsWithReviews)
    }
    setLoading(false)
  }

  const reviewedItems = items.filter((i) => i.latest_review)
  const filteredItems = reviewedItems.filter((i) => {
    if (filter === 'yes') return i.latest_review?.would_order_again === true
    if (filter === 'skip') return i.latest_review?.would_order_again === false
    return true
  })

  // Sort: YES AGAIN first, then SKIP, then by date
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.latest_review?.would_order_again && !b.latest_review?.would_order_again) return -1
    if (!a.latest_review?.would_order_again && b.latest_review?.would_order_again) return 1
    const dateA = new Date(a.latest_review?.created_at || 0).getTime()
    const dateB = new Date(b.latest_review?.created_at || 0).getTime()
    return dateB - dateA
  })

  async function handleOcrDemo() {
    setOcrLoading(true)
    try {
      const service = new MockMenuOcrService()
      const fakeBlob = new Blob([''], { type: 'image/png' })
      const results = await service.extractItemsFromImage(fakeBlob)
      setOcrResults(results.map((r) => ({ ...r, checked: true })))
      setShowOcrDialog(true)
    } catch {
      toast.error('Failed to process menu')
    } finally {
      setOcrLoading(false)
    }
  }

  async function importOcrItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const selected = ocrResults.filter((r) => r.checked)
    let count = 0
    for (const item of selected) {
      const { error } = await supabase.from('menu_items').upsert(
        {
          restaurant_id: id,
          name: item.name,
          category: item.category,
          price: item.price,
          created_by: user.id,
        },
        { onConflict: 'restaurant_id,name' }
      )
      if (!error) count++
    }
    toast.success(`Imported ${count} menu items`)
    setShowOcrDialog(false)
    loadData()
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!restaurant) {
    return <div className="py-8 text-center text-muted-foreground">Restaurant not found</div>
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="relative -mx-4">
        <div className="h-48 bg-muted overflow-hidden">
          {restaurant.photo_url ? (
            <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-orange-100 to-orange-50">
              🍽️
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.city && (
            <p className="text-muted-foreground text-sm">{restaurant.city}</p>
          )}
          {reviewedItems.length > 0 && (
            <Badge variant="secondary" className="mt-2">
              You&apos;ve reviewed {reviewedItems.length} item{reviewedItems.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => router.push(`/restaurants/${id}/quick-review`)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Quick review
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/restaurants/${id}/add-item`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add dish
          </Button>
        </div>

        {/* OCR Demo */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleOcrDemo}
          disabled={ocrLoading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {ocrLoading ? 'Processing...' : 'Import menu (demo)'}
        </Button>

        {/* Filter chips */}
        {reviewedItems.length > 0 && (
          <div className="flex gap-2">
            {(['all', 'yes', 'skip'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f === 'all' ? 'All' : f === 'yes' ? 'YES again' : 'Skip'}
              </button>
            ))}
          </div>
        )}

        {/* Items list */}
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <MenuItemReviewCard
              key={item.id}
              itemName={item.name}
              rating={item.latest_review?.rating}
              wouldOrderAgain={item.latest_review?.would_order_again ?? true}
              noteSnippet={item.latest_review?.notes}
              lastReviewedAt={item.latest_review?.created_at}
              photoUrl={item.latest_review?.photo_url}
              onClick={() => router.push(`/restaurants/${id}/add-item?edit=${item.id}`)}
            />
          ))}
        </div>

        {sortedItems.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-muted-foreground text-sm">
              {reviewedItems.length === 0
                ? 'No reviews yet. Add a dish to get started!'
                : 'No items match this filter.'}
            </p>
          </div>
        )}
      </div>

      {/* OCR Dialog */}
      <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Menu Items (Demo)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {ocrResults.map((item, i) => (
              <label key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    setOcrResults((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, checked: !!checked } : r))
                    )
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category}{item.price ? ` · $${item.price.toFixed(2)}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">
            This is a demo with mock data. Connect a real OCR provider to scan actual menus.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOcrDialog(false)}>Cancel</Button>
            <Button onClick={importOcrItems}>Import selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
