'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'


import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SelectedDish {
  id?: string
  name: string
  isNew: boolean
  rating: number
  wouldOrderAgain: boolean | null
  notes: string
}

export default function QuickReviewPage() {
  const params = useParams()
  const restaurantId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurantName, setRestaurantName] = useState('')
  const [existingItems, setExistingItems] = useState<Array<{ id: string; name: string }>>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newDishName, setNewDishName] = useState('')
  const [newDishes, setNewDishes] = useState<string[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [dishes, setDishes] = useState<SelectedDish[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [restaurantId])

  async function loadData() {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', restaurantId)
      .single()
    if (rest) setRestaurantName(rest.name)

    const { data: items } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('restaurant_id', restaurantId)
      .order('name')
    if (items) setExistingItems(items)
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addNewDish() {
    if (!newDishName.trim()) return
    if (!newDishes.includes(newDishName.trim())) {
      setNewDishes([...newDishes, newDishName.trim()])
    }
    setNewDishName('')
  }

  function goToStep2() {
    const selected: SelectedDish[] = [
      ...existingItems
        .filter((i) => selectedIds.has(i.id))
        .map((i) => ({
          id: i.id,
          name: i.name,
          isNew: false,
          rating: 0,
          wouldOrderAgain: null as boolean | null,
          notes: '',
        })),
      ...newDishes.map((name) => ({
        name,
        isNew: true,
        rating: 0,
        wouldOrderAgain: null as boolean | null,
        notes: '',
      })),
    ]
    if (selected.length === 0) {
      toast.error('Select at least one dish')
      return
    }
    setDishes(selected)
    setStep(2)
  }

  function updateDish(index: number, updates: Partial<SelectedDish>) {
    setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      for (const dish of dishes) {
        let itemId = dish.id

        // Create new menu item if needed
        if (dish.isNew || !itemId) {
          const { data, error } = await supabase
            .from('menu_items')
            .upsert(
              {
                restaurant_id: restaurantId,
                name: dish.name,
                created_by: user.id,
              },
              { onConflict: 'restaurant_id,name' }
            )
            .select('id')
            .single()
          if (error) throw error
          itemId = data.id
        }

        if (dish.wouldOrderAgain !== null) {
          const { error } = await supabase.from('reviews').insert({
            menu_item_id: itemId,
            user_id: user.id,
            rating: dish.rating || null,
            would_order_again: dish.wouldOrderAgain,
            notes: dish.notes || null,
            visited_at: new Date().toISOString().split('T')[0],
          })
          if (error) throw error
        }
      }

      // Log visit
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        await supabase.from('restaurant_visits').insert({
          restaurant_id: restaurantId,
          user_id: u.id,
        })
      }

      toast.success(`Saved ${dishes.length} review${dishes.length !== 1 ? 's' : ''}!`)
      router.push(`/restaurants/${restaurantId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => step === 1 ? router.back() : setStep(1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Quick review</h1>
          <p className="text-xs text-muted-foreground">{restaurantName} · Step {step}/2</p>
        </div>
      </div>

      {step === 1 && (
        <>
          <div>
            <h2 className="font-medium mb-3">What did you have?</h2>

            {existingItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {existingItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer touch-target"
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <span className="text-sm">{item.name}</span>
                  </label>
                ))}
              </div>
            )}

            {newDishes.length > 0 && (
              <div className="space-y-2 mb-4">
                {newDishes.map((name, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-green-50">
                    <span className="text-sm text-green-700">+ {name}</span>
                    <button
                      className="ml-auto text-xs text-muted-foreground"
                      onClick={() => setNewDishes((d) => d.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add another dish..."
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewDish()}
              />
              <Button variant="outline" size="icon" onClick={addNewDish}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button className="w-full h-12" onClick={goToStep2}>
            Next: Rate dishes
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-6">
            {dishes.map((dish, i) => (
              <div key={i} className="p-4 rounded-lg border space-y-3">
                <h3 className="font-medium">{dish.name}</h3>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateDish(i, { wouldOrderAgain: true })}
                    className={cn(
                      'flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-all',
                      dish.wouldOrderAgain === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-muted text-muted-foreground'
                    )}
                  >
                    👍 YES
                  </button>
                  <button
                    onClick={() => updateDish(i, { wouldOrderAgain: false })}
                    className={cn(
                      'flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-all',
                      dish.wouldOrderAgain === false
                        ? 'border-red-400 bg-red-50 text-red-600'
                        : 'border-muted text-muted-foreground'
                    )}
                  >
                    👎 SKIP
                  </button>
                </div>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateDish(i, { rating: star === dish.rating ? 0 : star })}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          'h-6 w-6',
                          star <= dish.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        )}
                      />
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="Quick note..."
                  value={dish.notes}
                  onChange={(e) => updateDish(i, { notes: e.target.value })}
                />
              </div>
            ))}
          </div>

          <Button
            className="w-full h-12"
            onClick={handleSave}
            disabled={saving || dishes.some((d) => d.wouldOrderAgain === null)}
          >
            {saving ? 'Saving...' : `Save ${dishes.length} review${dishes.length !== 1 ? 's' : ''}`}
          </Button>
        </>
      )}
    </div>
  )
}
