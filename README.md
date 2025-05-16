# ChatChill - Video Chat Application

A modern video chat application built with Next.js, Socket.IO, and Supabase.

## Setup Instructions

1. Install dependencies:
   `ash
   npm install
   `

2. Create a .env.local file:
   - Copy .env.local.template to .env.local
   - Fill in your Supabase credentials

3. Run the development server:
   `ash
   npm run dev:all
   `

4. For production:
   `ash
   npm run build
   npm start
   `

## Environment Variables

Required environment variables:
- NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key

## Features

- Real-time video chat
- User profiles with social media links
- Chat messaging
- Country and gender filtering
- VIP features
- Multiple chat lobbies

## Tech Stack

- Next.js
- Socket.IO
- Supabase
- TailwindCSS
- TypeScript
