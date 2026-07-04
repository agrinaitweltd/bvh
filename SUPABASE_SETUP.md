# Supabase Setup Instructions for Breezyee Vans

## Overview
This project now uses Supabase for real-time fleet management. The admin dashboard can add, edit, and delete cars, and these changes will automatically sync to the fleet page and home page.

## Step 1: Run the SQL Migration

Go to your Supabase project dashboard:
1. Navigate to the SQL Editor
2. Create a new query
3. Copy and paste the contents of `supabase_migrations/create_cars_table.sql`
4. Run the query

This will:
- Create a `cars` table with the proper structure
- Set up Row Level Security (RLS) policies
- Insert initial fleet data with your existing images
- Create indexes for performance
- Set up automatic timestamp updates

## Step 2: Verify Environment Variables

Make sure your `.env.local` file has the correct Supabase configuration:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 3: Update Admin Email (if needed)

If you want to use a different admin email, update it in two places:

1. `.env.local`:
```
VITE_ADMIN_EMAIL=your-admin-email@example.com
```

2. Update the SQL migration file to use your email instead of `kavotechuk@gmail.com` in the RLS policy.

## Step 4: Test the Setup

1. Start the development server:
```bash
npm run dev
```

2. Login to the admin dashboard (dashboard.html) with your admin email

3. Go to the Fleet Cars section (admin-cars.html)

4. You should see the initial fleet data loaded from Supabase

5. Test adding, editing, and deleting cars

6. Check the fleet page (fleet.html) and home page (index.html) to see the changes reflected

## Image Handling

Images are currently stored in the `public` folder and referenced with absolute paths:
- `/van-small.jpg`
- `/van-medium.jpg`
- `/van-large.png`

When you add or edit cars in the admin panel:
- You can specify these image URLs in the database
- The images will display correctly on all pages
- For new images, you would need to:
  1. Upload the image to your Supabase Storage or hosting service
  2. Get the public URL
  3. Enter that URL in the car management form

## Data Synchronization

The system uses Supabase Realtime for automatic updates:
- Changes in the admin dashboard immediately sync to the database
- Fleet pages automatically refresh when data changes
- No page reload needed for users to see updates

## Troubleshooting

### Cars not loading
- Check browser console for Supabase errors
- Verify your Supabase URL and keys in `.env.local`
- Ensure the SQL migration was run successfully

### Images not displaying
- Verify images exist in the `public` folder
- Check that image URLs in the database are correct
- Ensure the paths start with `/` for absolute paths

### Permission errors
- Verify you're logged in with the admin email
- Check that the RLS policy in Supabase matches your admin email
- Ensure the user is authenticated before accessing admin pages

## Future Enhancements

Consider implementing:
- Image upload directly to Supabase Storage
- Image compression and optimization
- CDN integration for faster image loading
- Multiple images per vehicle
- Image gallery views
