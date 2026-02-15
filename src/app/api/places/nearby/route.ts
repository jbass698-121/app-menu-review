import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  try {
    const body = {
      includedTypes: ['restaurant'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: 2000,
        },
      },
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.addressComponents',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Places Nearby API error:', err)
      return NextResponse.json({ error: 'Failed to search nearby places' }, { status: 502 })
    }

    const data = await res.json()
    const places = (data.places || []).map((place: any) => {
      let city = ''
      if (place.addressComponents) {
        const cityComponent = place.addressComponents.find(
          (c: any) => c.types?.includes('locality')
        )
        city = cityComponent?.longText || ''
      }

      let photoUrl = null
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_MAPS_API_KEY}`
      }

      return {
        place_id: place.id,
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        city,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        rating: place.rating,
        photo_url: photoUrl,
      }
    })

    return NextResponse.json({ places })
  } catch (err) {
    console.error('Nearby search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
