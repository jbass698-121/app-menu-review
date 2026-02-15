import Link from 'next/link'
import { MapPin, Star, ThumbsUp } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface RestaurantCardProps {
  id: string
  name: string
  photoUrl?: string | null
  distanceText?: string
  city?: string | null
  lastVisited?: string | null
  reviewCount?: number
  yesAgainCount?: number
  compact?: boolean
}

export function RestaurantCard({
  id,
  name,
  photoUrl,
  city,
  lastVisited,
  reviewCount,
  yesAgainCount,
  compact,
}: RestaurantCardProps) {
  if (compact) {
    return (
      <Link href={`/restaurants/${id}`}>
        <Card className="flex-shrink-0 w-40 overflow-hidden hover:shadow-md transition-shadow">
          <div className="h-24 bg-muted relative overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🍽️
              </div>
            )}
          </div>
          <div className="p-2">
            <p className="font-medium text-sm truncate">{name}</p>
            {city && (
              <p className="text-xs text-muted-foreground truncate">{city}</p>
            )}
            {typeof reviewCount === 'number' && reviewCount > 0 && (
              <p className="text-xs text-primary mt-1">
                {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/restaurants/${id}`}>
      <Card className="flex overflow-hidden hover:shadow-md transition-shadow">
        <div className="w-24 h-24 bg-muted relative overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🍽️
            </div>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0">
          <h3 className="font-semibold text-base truncate">{name}</h3>
          {city && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{city}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            {typeof reviewCount === 'number' && reviewCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />
                {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </span>
            )}
            {typeof yesAgainCount === 'number' && yesAgainCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <ThumbsUp className="h-3 w-3" />
                {yesAgainCount} YES again
              </span>
            )}
          </div>
          {lastVisited && (
            <p className="text-xs text-muted-foreground mt-1">
              Last visited: {new Date(lastVisited).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
