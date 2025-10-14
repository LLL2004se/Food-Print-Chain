/*
  # Food Print Chain - Initial Database Schema

  ## Overview
  Creates the core database structure for connecting food donors with NGOs/orphanages.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `user_type` (text) - Either 'donor' or 'ngo'
  - `full_name` (text) - User's full name
  - `organization_name` (text) - Name of restaurant/NGO
  - `phone` (text) - Contact phone number
  - `address` (text) - Physical address
  - `latitude` (numeric) - Location latitude
  - `longitude` (numeric) - Location longitude
  - `verified` (boolean) - Account verification status
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last update time

  ### `food_listings`
  - `id` (uuid, primary key) - Unique listing ID
  - `donor_id` (uuid) - Reference to profiles
  - `title` (text) - Food item title
  - `description` (text) - Detailed description
  - `quantity` (text) - Amount available
  - `food_type` (text) - Category (prepared, packaged, produce, etc.)
  - `expiry_date` (timestamptz) - When food expires
  - `pickup_time_start` (timestamptz) - Pickup window start
  - `pickup_time_end` (timestamptz) - Pickup window end
  - `status` (text) - available, claimed, completed, cancelled
  - `image_url` (text) - Photo of food
  - `created_at` (timestamptz) - Listing creation time
  - `updated_at` (timestamptz) - Last update time

  ### `claims`
  - `id` (uuid, primary key) - Unique claim ID
  - `listing_id` (uuid) - Reference to food_listings
  - `ngo_id` (uuid) - Reference to profiles
  - `status` (text) - pending, accepted, rejected, completed
  - `message` (text) - Message from NGO
  - `claimed_at` (timestamptz) - When claim was made
  - `updated_at` (timestamptz) - Last status update

  ### `notifications`
  - `id` (uuid, primary key) - Unique notification ID
  - `user_id` (uuid) - Recipient user
  - `type` (text) - Notification type
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `read` (boolean) - Read status
  - `related_id` (uuid) - Related listing/claim ID
  - `created_at` (timestamptz) - When notification was created

  ## Security
  - Enable RLS on all tables
  - Users can read/update their own profiles
  - Donors can manage their own listings
  - NGOs can view available listings and create claims
  - Users can view their own notifications
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('donor', 'ngo')),
  full_name text NOT NULL,
  organization_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create food_listings table
CREATE TABLE IF NOT EXISTS food_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  quantity text NOT NULL,
  food_type text NOT NULL,
  expiry_date timestamptz NOT NULL,
  pickup_time_start timestamptz NOT NULL,
  pickup_time_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed', 'cancelled')),
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message text,
  claimed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Food listings policies
CREATE POLICY "Anyone can view available listings"
  ON food_listings FOR SELECT
  TO authenticated
  USING (status = 'available' OR donor_id = auth.uid() OR id IN (
    SELECT listing_id FROM claims WHERE ngo_id = auth.uid()
  ));

CREATE POLICY "Donors can insert own listings"
  ON food_listings FOR INSERT
  TO authenticated
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Donors can update own listings"
  ON food_listings FOR UPDATE
  TO authenticated
  USING (donor_id = auth.uid())
  WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Donors can delete own listings"
  ON food_listings FOR DELETE
  TO authenticated
  USING (donor_id = auth.uid());

-- Claims policies
CREATE POLICY "Users can view their claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    ngo_id = auth.uid() OR 
    listing_id IN (SELECT id FROM food_listings WHERE donor_id = auth.uid())
  );

CREATE POLICY "NGOs can create claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (ngo_id = auth.uid());

CREATE POLICY "Donors can update claims on their listings"
  ON claims FOR UPDATE
  TO authenticated
  USING (listing_id IN (SELECT id FROM food_listings WHERE donor_id = auth.uid()))
  WITH CHECK (listing_id IN (SELECT id FROM food_listings WHERE donor_id = auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_listings_donor ON food_listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_status ON food_listings(status);
CREATE INDEX IF NOT EXISTS idx_claims_listing ON claims(listing_id);
CREATE INDEX IF NOT EXISTS idx_claims_ngo ON claims(ngo_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);