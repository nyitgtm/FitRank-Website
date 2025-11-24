# FitRank Coaches Portal

A comprehensive Next.js web application for FitRank coaches to manage the platform, view leaderboards, moderate content, and oversee user activity.

## Features

### 🏋️‍♂️ Gym Management
- **List View**: View all gyms with sortable columns (Name, Location, Owner Team).
- **Search**: Real-time search by gym name, location address, or UUID.
- **Detailed View**: Expand rows to see best lifts (Bench, Deadlift, Squat) and precise location coordinates with Google Maps integration.
- **CRUD Operations**:
  - **Add Gym**: Create new gyms with location data and assign an owner team (supports a "Default" team option).
  - **Edit Gym**: Update gym details including name, address, coordinates, and owner team.
  - **Delete Gym**: Remove gyms from the platform.

### 📹 Video Management
- **Workout Videos**: Browse all user-uploaded workout videos.
- **Search & Sort**: Filter by UUID and sort by User, Lift Type, Weight, Team, or Date.
- **Playback**: Watch videos directly within the portal.
- **Moderation**:
  - **Comments**: View and delete comments and replies on videos.
  - **Auto-Flagging**: Visual indicators for comments containing potentially harmful language.
  - **Delete Video**: Remove inappropriate or unwanted videos.
- **Upload**: Coaches can upload workout videos directly from the portal.

### 🛍️ Item Shop Management
- **Inventory Control**: Manage virtual items available in the mobile app.
- **Analytics**: Dashboard showing Total Items, Total Purchases, and Total Revenue.
- **Item Details**: Configure Name, Description, Category, Rarity, Price, and Image URL.
- **Availability**: Set "Available Until" dates and toggle Active/Featured status.
- **Filtering**: Filter inventory by Category (Theme, Avatar, Badge, etc.) and Rarity.

### 📝 Posts & Content Moderation
- **Feed View**: Monitor all user posts in a sortable table.
- **Safety Tools**:
  - **Flagged Filter**: Quickly view posts containing flagged/banned words.
  - **Visual Warnings**: "Potentially Harmful" badges on flagged content.
- **Deep Dive**: Expand posts to view all comments and likes.
- **Actions**: Delete posts and moderate discussions.

### 🏆 Leaderboards
- **Rankings**: View top performers by:
  - **Tokens**: Overall user engagement/currency.
  - **Weight**: Best lifts for Bench Press, Squat, and Deadlift.
- **Real-time**: Data updates instantly from Firebase Firestore.

### 👥 User Management
- **Directory**: Browse all registered users.
- **Filters**: Filter by Team and Role (Coach/Athlete).
- **Search**: Find users by name or username.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth (Coach-only access)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Access to the FitRank Firebase project

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   cd FitRank-Website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Login
- You must log in with an account that has `isCoach: true` in its Firestore user document.
- Unauthorized users will be redirected to the login page.

## Project Structure

- `/app`: Next.js App Router pages and layouts.
- `/components`: Reusable UI components and feature-specific views (GymsView, PostsView, etc.).
- `/lib`: Utility functions, Firebase configuration, and TypeScript types.
- `/contexts`: React contexts (e.g., AuthContext).

## Troubleshooting

- **Login Failed**: Ensure your user document in the `users` collection has the field `isCoach` set to boolean `true`.
- **Data Missing**: Verify that your `.env.local` file contains the correct Firebase configuration keys.

