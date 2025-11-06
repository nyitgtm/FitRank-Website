# FitRank Coaches Portal

A Next.js web application for FitRank coaches to view leaderboards and manage users.

## Features

- **Coach-Only Authentication**: Only users with `isCoach: true` can login
- **Leaderboard Viewing**: 
  - View by Tokens or Weight (Bench Press, Squat, Deadlift)
  - Real-time data from Firebase
- **User Management**: View all users with filtering by team and role
- **Fully Connected to Firebase**: No hardcoded data, all data fetched from Firestore

## Firebase Configuration

The app is already configured to connect to the FitRank Firebase project. All data is fetched in real-time from:
- **Users Collection**: User profiles, tokens, teams
- **Teams Collection**: Team information
- **Workouts Collection**: Workout records for weight leaderboards

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Firebase (Auth & Firestore)
- Tailwind CSS

# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Access to FitRank Firebase project

## Installation

1. Navigate to the project directory:
```bash
cd "FitRank-Website copy"
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at: http://localhost:3000

## Login Instructions

1. Navigate to http://localhost:3000
2. You'll be redirected to the login page
3. Sign in with a coach account (must have `isCoach: true` in Firestore)
4. After successful login, you'll see the dashboard with:
   - **Leaderboard Tab**: View rankings by tokens or lift weights
   - **Users Tab**: Browse all users with filters

## Features Overview

### Leaderboard
- Toggle between Tokens and Weight rankings
- For weight rankings, select lift type (Bench Press, Squat, Deadlift)
- Real-time data from Firebase Firestore
- Shows rank, user info, team, and score

### Users View
- Search by name or username
- Filter by team
- Filter by role (Coaches/Athletes)
- View user tokens and team information

## Troubleshooting

### Login Issues
- Ensure the user has `isCoach: true` in their Firestore document
- Check Firebase Authentication is enabled
- Verify email/password are correct

### Data Not Loading
- Check Firebase console for collection structure
- Ensure collections exist: `users`, `teams`, `workouts`
- Check browser console for errors

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Styling**: Tailwind CSS
