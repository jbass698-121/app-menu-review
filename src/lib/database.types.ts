export interface User {
  id: string
  display_name: string | null
  created_at: string
}

export interface Restaurant {
  id: string
  google_place_id: string | null
  name: string
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  created_by: string | null
  created_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  category: string | null
  description: string | null
  price: number | null
  created_by: string | null
  created_at: string
}

export interface Review {
  id: string
  menu_item_id: string
  user_id: string
  rating: number | null
  would_order_again: boolean
  notes: string | null
  photo_url: string | null
  visited_at: string | null
  created_at: string
}

export interface RestaurantVisit {
  id: string
  restaurant_id: string
  user_id: string
  visited_at: string
  overall_notes: string | null
  created_at: string
}

// Joined types for UI
export interface MenuItemWithReview extends MenuItem {
  reviews: Review[]
  latest_review?: Review
}

export interface RestaurantWithStats extends Restaurant {
  review_count?: number
  yes_again_count?: number
  last_visited?: string
}
