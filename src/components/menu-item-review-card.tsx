import { ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MenuItemReviewCardProps {
  itemName: string
  rating?: number | null
  wouldOrderAgain: boolean
  noteSnippet?: string | null
  lastReviewedAt?: string | null
  photoUrl?: string | null
  onClick?: () => void
}

export function MenuItemReviewCard({
  itemName,
  rating,
  wouldOrderAgain,
  noteSnippet,
  lastReviewedAt,
  photoUrl,
  onClick,
}: MenuItemReviewCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow touch-target"
    >
      <div className="flex items-start gap-3">
        {photoUrl && (
          <img
            src={photoUrl}
            alt={itemName}
            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{itemName}</h4>
            <Badge
              variant={wouldOrderAgain ? 'default' : 'secondary'}
              className={cn(
                'flex-shrink-0 text-xs font-semibold',
                wouldOrderAgain
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              )}
            >
              {wouldOrderAgain ? (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> YES AGAIN
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> SKIP
                </span>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            )}
            {lastReviewedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(lastReviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {noteSnippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {noteSnippet}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
