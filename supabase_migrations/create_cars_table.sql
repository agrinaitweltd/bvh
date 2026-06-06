-- Create cars table for fleet management
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('small', 'medium', 'xl')),
  price_daily DECIMAL(10,2) NOT NULL,
  capacity TEXT NOT NULL,
  payload INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone (for fleet display)
CREATE POLICY "Allow read access to all users" ON cars
  FOR SELECT USING (true);

-- Create policy to allow insert/update/delete for admin only
CREATE POLICY "Allow admin full access" ON cars
  FOR ALL USING (auth.jwt() ->> 'email' = 'kavotechuk@gmail.com');

-- Insert initial fleet data
INSERT INTO cars (model, type, price_daily, capacity, payload, description, image_url, is_active) VALUES
  ('Citroen Berlingo', 'small', 100.00, '2–3 m³', 750, 'Best for light moves and deliveries. Compact, nimble, and easy to park in the city.', '/van-small.jpg', true),
  ('Mercedes Sprinter', 'medium', 200.00, '10–12 m³', 1500, 'Ideal for house moves and business relocations. Spacious, powerful, and built to perform.', '/van-medium.jpg', true),
  ('Iveco Daily Luton', 'xl', 350.00, '18–20 m³', 2000, 'Maximum capacity for the biggest jobs. Full house moves, large furniture, zero compromises.', '/van-large.jpg', true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cars_type ON cars(type);
CREATE INDEX IF NOT EXISTS idx_cars_is_active ON cars(is_active);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
