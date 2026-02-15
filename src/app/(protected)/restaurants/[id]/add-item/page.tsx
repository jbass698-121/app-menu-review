'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function AddItemContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const restaurantId = params.id as string
  const editItemId = searchParams.get('edit')
  const router = useRouter()
  const supabase = createClient()

  const [restaurantName, setRestaurantName] = useState('')
  const [dishName, setDishName] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(editItemId)
  const [rating, setRating] = useState<number>(0)
  const [wouldOrderAgain, setWouldOrderAgain] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [showExtras, setShowExtras] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  useEffect(() => {
    loadRestaurant()
    if (editItemId) loadExistingItem(editItemId)
  }, [restaurantId, editItemId])

  async function loadRestaurant() {
    const { data } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', restaurantId)
      .single()
    if (data) setRestaurantName(data.name)
  }

  async function loadExistingItem(itemId: string) {
    const { data: item } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (item) {
      setDishName(item.name)
      setCategory(item.category || '')
      setPrice(item.price ? String(item.price) : '')
      setSelectedItemId(item.id)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('menu_item_id', itemId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (reviews && reviews[0]) {
      const r = reviews[0]
      setRating(r.rating || 0)
      setWouldOrderAgain(r.would_order_again)
      setNotes(r.notes || '')
    }
  }

  async function searchItems(q: string) {
    if (!q.trim()) {
      setSuggestions([])
      return
    }
    const { data } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('restaurant_id', restaurantId)
      .ilike('name', `%${q}%`)
      .limit(5)

    setSuggestions(data || [])
    setShowSuggestions(true)
  }

  function selectSuggestion(item: { id: string; name: string }) {
    setDishName(item.name)
    setSelectedItemId(item.id)
    setShowSuggestions(false)
  }

  async function handleSave(createReview: boolean) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let itemId = selectedItemId

      // Create or get menu item
      if (!itemId) {
        const { data, error } = await supabase
          .from('menu_items')
          .upsert(
            {
              restaurant_id: restaurantId,
              name: dishName.trim(),
              category: category || null,
              price: price ? parseFloat(price) : null,
              created_by: user.id,
            },
            { onConflict: 'restaurant_id,name' }
          )
          .select('id')
          .single()

        if (error) throw error
        itemId = data.id
      }

      if (createReview && wouldOrderAgain !== null) {
        // Upload photo if present
        let photoUrl: string | null = null
        if (photoFile) {
          const ext = photoFile.name.split('.').pop()
          const path = `reviews/${user.id}/${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('review-photos')
            .upload(path, photoFile)

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('review-photos')
              .getPublicUrl(path)
            photoUrl = urlData.publicUrl
          }
        }

        const { error } = await supabase.from('reviews').insert({
          menu_item_id: itemId,
          user_id: user.id,
          rating: rating || null,
          would_order_again: wouldOrderAgain,
          notes: notes || null,
          photo_url: photoUrl,
          visited_at: new Date().toISOString().split('T')[0],
        })

        if (error) throw error
        toast.success('Review saved!')
      } else {
        toast.success('Dish saved!')
      }

      router.push(`/restaurants/${restaurantId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const categories = ['Appetizer', 'Main', 'Dessert', 'Drink', 'Side', 'Soup', 'Salad']

  return (
    <div className="py-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {editItemId ? 'Edit review' : 'Add dish'}
          </h1>
          <p className="text-xs text-muted-foreground">{restaurantName}</p>
        </div>
      </div>

      {/* Dish name with autocomplete */}
      <div className="space-y-2 relative">
        <Label>Dish name</Label>
        <Input
          placeholder="e.g. Margherita Pizza"
          value={dishName}
          onChange={(e) => {
            setDishName(e.target.value)
            setSelectedItemId(null)
            searchItems(e.target.value)
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => selectSuggestion(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Would order again toggle */}
      <div className="space-y-2">
        <Label>Would you order this again?</Label>
        <div className="flex gap-3">
          <button
            onClick={() => setWouldOrderAgain(true)}
            className={cn(
              'flex-1 py-4 rounded-lg border-2 font-semibold text-lg transition-all touch-target',
              wouldOrderAgain === true
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-muted text-muted-foreground hover:border-green-300'
            )}
          >
            👍 YES
          </button>
          <button
            onClick={() => setWouldOrderAgain(false)}
            className={cn(
              'flex-1 py-4 rounded-lg border-2 font-semibold text-lg transition-all touch-target',
              wouldOrderAgain === false
                ? 'border-red-400 bg-red-50 text-red-600'
                : 'border-muted text-muted-foreground hover:border-red-300'
            )}
          >
            👎 SKIP
          </button>
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Rating (optional)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star === rating ? 0 : star)}
              className="p-1 touch-target"
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  star <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="How was it? Any special requests you made?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Photo upload */}
      <div className="space-y-2">
        <Label>Photo (optional)</Label>
        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {photoFile ? photoFile.name : 'Upload a photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* Extras */}
      <button
        onClick={() => setShowExtras(!showExtras)}
        className="text-sm text-primary"
      >
        {showExtras ? 'Hide extras' : 'Add category & price'}
      </button>

      {showExtras && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? '' : cat)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm transition-colors',
                    category === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Button
          className="w-full h-12"
          onClick={() => handleSave(true)}
          disabled={saving || !dishName.trim() || wouldOrderAgain === null}
        >
          {saving ? 'Saving...' : 'Save review'}
        </Button>
        {!editItemId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSave(false)}
            disabled={saving || !dishName.trim()}
          >
            Just save dish name for now
          </Button>
        )}
      </div>
    </div>
  )
}

export default function AddItemPage() {
  return (
    <Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>}>
      <AddItemContent />
    </Suspense>
  )
}
