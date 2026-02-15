'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RestaurantCard } from '@/components/restaurant-card'
import { createClient } from '@/lib/supabase/client'

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  city: string
  lat: number
  lng: number
  rating: number
  photo_url: string | null
}

interface RecentRestaurant {
  id: string
  name: string
  city: string | null
  photo_url: string | null
  review_count: number
  yes_again_count: number
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([])
  const [recentRestaurants, setRecentRestaurants] = useState<RecentRestaurant[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRecentRestaurants()
    requestLocation()
  }, [])

  async function loadRecentRestaurants() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        menu_item_id,
        would_order_again,
        menu_items!inner (
          restaurant_id,
          restaurants!inner (
            id,
            name,
            city,
            photo_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!reviews) return

    // Aggregate by restaurant
    const restMap = new Map<string, RecentRestaurant>()
    for (const r of reviews as any[]) {
      const rest = r.menu_items?.restaurants
      if (!rest) continue
      if (!restMap.has(rest.id)) {
        restMap.set(rest.id, {
          id: rest.id,
          name: rest.name,
          city: rest.city,
          photo_url: rest.photo_url,
          review_count: 0,
          yes_again_count: 0,
        })
      }
      const entry = restMap.get(rest.id)!
      entry.review_count++
      if (r.would_order_again) entry.yes_again_count++
    }

    setRecentRestaurants(Array.from(restMap.values()).slice(0, 10))
  }

  function requestLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadNearby(pos.coords.latitude, pos.coords.longitude)
      },
      () => { /* location unavailable */ }
    )
  }

  async function loadNearby(lat: number, lng: number) {
    setLoadingNearby(true)
    try {
      const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      setNearbyPlaces(data.places || [])
    } catch {
      console.error('Failed to load nearby places')
    } finally {
      setLoadingNearby(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/restaurants/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  async function handleNearbyClick(place: PlaceResult) {
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          city: place.city,
          latitude: place.lat,
          longitude: place.lng,
          photo_url: place.photo_url,
        }),
      })
      const data = await res.json()
      if (data.id) {
        router.push(`/restaurants/${data.id}`)
      }
    } catch {
      console.error('Failed to create restaurant')
    }
  }

  const hasContent = recentRestaurants.length > 0 || nearbyPlaces.length > 0

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          What are you eating tonight?
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find a restaurant and check your notes
        </p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants near you"
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {!hasContent && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🍔</div>
          <h2 className="text-lg font-semibold">Your food journal is empty</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            Search for a restaurant to start logging what you love (and what to skip).
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push('/restaurants/search')}
          >
            Find a restaurant
          </Button>
        </div>
      )}

      {nearbyPlaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-lg">Near you</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {nearbyPlaces.map((place) => (
              <div
                key={place.place_id}
                onClick={() => handleNearbyClick(place)}
                className="cursor-pointer flex-shrink-0 w-40"
              >
                <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-24 bg-muted relative overflow-hidden">
                    {place.photo_url ? (
                      <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-medium text-sm truncate">{place.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{place.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loadingNearby && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Finding restaurants near you...
        </div>
      )}

      {recentRestaurants.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Recent places</h2>
          <div className="space-y-3">
            {recentRestaurants.map((rest) => (
              <RestaurantCard
                key={rest.id}
                id={rest.id}
                name={rest.name}
                city={rest.city}
                photoUrl={rest.photo_url}
                reviewCount={rest.review_count}
                yesAgainCount={rest.yes_again_count}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
