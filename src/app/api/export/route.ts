import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      would_order_again,
      notes,
      visited_at,
      created_at,
      menu_items (
        name,
        category,
        restaurants (
          name,
          city
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!reviews || reviews.length === 0) {
    return new NextResponse('No reviews found', { status: 404 })
  }

  // Build CSV
  const headers = ['Restaurant', 'City', 'Dish', 'Category', 'Would Order Again', 'Rating', 'Notes', 'Visited At', 'Created At']
  const rows = reviews.map((r: any) => {
    const mi = r.menu_items || {}
    const rest = mi.restaurants || {}
    return [
      rest.name || '',
      rest.city || '',
      mi.name || '',
      mi.category || '',
      r.would_order_again ? 'YES' : 'NO',
      r.rating || '',
      (r.notes || '').replace(/"/g, '""'),
      r.visited_at || '',
      r.created_at || '',
    ]
  })

  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.map((v: any) => `"${v}"`).join(',')),
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="menu-reviews-export.csv"',
    },
  })
}
