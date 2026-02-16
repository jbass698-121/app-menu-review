'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  )
  const router = useRouter()

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }, [])

  const searchPlaces = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams({ query: q })
        if (coords) {
          params.set('lat', String(coords.lat))
          params.set('lng', String(coords.lng))
        }
        const res = await fetch(`/api/places/search?${params}`)
        const data = await res.json()
        setResults(data.places || [])
      } catch {
        console.error('Search failed')
      } finally {
        setLoading(false)
      }
    },
    [coords]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchPlaces(query)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, searchPlaces])

  useEffect(() => {
    if (initialQuery) searchPlaces(initialQuery)
  }, [initialQuery, searchPlaces])

  async function selectPlace(place: PlaceResult) {
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
      if (!res.ok) {
        console.error('API error', await res.text())
        return
      }
      const data = await res.json()
      if (data.id) {
        router.push(`/restaurants/${data.id}`)
      }
    } catch {
      console.error('Failed to select place')
    }
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Find a restaurant</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or location..."
          className="pl-10 h-12"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Searching...
        </div>
      )}

      <div className="space-y-2">
        {results.map((place) => (
          <button
            key={place.place_id}
            onClick={() => selectPlace(place)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow text-left touch-target"
          >
            <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
              {place.photo_url ? (
                <img
                  src={place.photo_url}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  🍽️
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{place.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {place.formatted_address}
              </p>
              {place.rating && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ★ {place.rating.toFixed(1)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No restaurants found</p>
        </div>
      )}
    </div>
  )
}

export default function RestaurantSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-4 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
