-- Menu Review App Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price NUMERIC,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_order_again BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  photo_url TEXT,
  visited_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant visits table
CREATE TABLE IF NOT EXISTS restaurant_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  visited_at DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_menu_item_id ON reviews(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_user_id ON restaurant_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_restaurant_id ON restaurant_visits(restaurant_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;

-- Users: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Restaurants: any authenticated user can read; creators and logged users can insert
CREATE POLICY "Anyone can view restaurants" ON restaurants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create restaurants" ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update restaurants" ON restaurants FOR UPDATE USING (auth.uid() = created_by);

-- Menu items: any authenticated user can read/create; creator can update
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create menu items" ON menu_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update menu items" ON menu_items FOR UPDATE USING (auth.uid() = created_by);

-- Reviews: users can CRUD their own reviews; can read all
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Restaurant visits: users own their visits
CREATE POLICY "Anyone can view visits" ON restaurant_visits FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create own visits" ON restaurant_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own visits" ON restaurant_visits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own visits" ON restaurant_visits FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
