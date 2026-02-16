import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  const body = await request.json()
  const {
    google_place_id,
    name,
    address,
    city,
    latitude,
    longitude,
    photo_url,
  } = body

  // Check if restaurant already exists by google_place_id
  if (google_place_id) {
    const { data: existing, error: existingError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('google_place_id', google_place_id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = no rows found; anything else is a real error
      console.error('Lookup restaurant error:', existingError)
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json({ id: existing.id })
    }
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      google_place_id,
      name,
      address,
      city,
      latitude,
      longitude,
      photo_url,
      // created_by is optional for now since we’re not enforcing server-side user
    })
    .select('id')
    .single()

  if (error) {
    console.error('Create restaurant error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
