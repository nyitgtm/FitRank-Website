<div align="center">
  <img src="https://github.com/nyitgtm/FitRank/blob/main/FitRank/Assets.xcassets/fitrank_shield.imageset/fitrank_shield.png?raw=true" alt="FitRank Logo" width="100">
  <h1>FitRank Coaches Portal</h1>
  
  [![Netlify Status](https://api.netlify.com/api/v1/badges/407eaca7-55a7-4e50-869f-7edadfcc2f72/deploy-status)](https://app.netlify.com/projects/fitrank/deploys)

  <p>
    <a href="https://fitrank.netlify.app/">Visit our website</a>
  </p>
</div>

A comprehensive web application designed for FitRank coaches to manage the platform, oversee user activity, moderate content, and analyze performance metrics. This portal serves as the administrative hub for the FitRank ecosystem, interacting directly with the Firebase backend to ensure real-time data management and synchronization with the mobile app.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
  - [Gym Management](#gym-management)
  - [Video Management](#video-management)
  - [Item Shop Management](#item-shop-management)
  - [Posts & Content Moderation](#posts--content-moderation)
  - [Leaderboards](#leaderboards)
  - [Reports System](#reports-system)
  - [User Management](#user-management)
  - [UploadThing API Bridge](#uploadthing-api-bridge)
- [Firebase Integration](#firebase-integration)
  - [Authentication](#authentication)
  - [Firestore Schema](#firestore-schema)
  - [Storage](#storage)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)

## Tech Stack

This project is built using modern web technologies to ensure performance, scalability, and type safety.

*   **Framework**: Next.js 16 (App Router) - Utilizes server-side rendering and static site generation for optimal performance.
*   **Language**: TypeScript - Ensures type safety and developer productivity across the codebase.
*   **Styling**: Tailwind CSS - Utility-first CSS framework for rapid and responsive UI development.
*   **Backend**: Firebase - Provides a serverless backend infrastructure.
    *   **Authentication**: Firebase Auth for secure coach login and session management.
    *   **Database**: Cloud Firestore for real-time, NoSQL data storage.
    *   **Storage**: Firebase Storage for managing user-uploaded content (videos, images).
    *   **Admin SDK**: Firebase Admin SDK for privileged server-side operations.
*   **State Management**: React Context API (e.g., AuthContext) for global state management.
*   **Icons**: Lucide React for consistent and customizable iconography.

## Features

### Gym Management
The Gyms view allows coaches to manage the physical locations associated with the FitRank platform.

*   **List View**: Displays a table of all registered gyms, showing the gym name, address, and the owning team.
*   **Sorting**: Columns are sortable by Name, Location, and Owner Team to easily find specific entries.
*   **Search**: A real-time search bar filters the list by gym name, address, or unique ID.
*   **Detailed Expansion**: Clicking on a row expands it to reveal:
    *   **Best Lifts**: The top records for Bench Press, Deadlift, and Squat at that location.
    *   **Coordinates**: Precise latitude and longitude data.
    *   **Google Maps Link**: A direct link to view the location on Google Maps.
*   **CRUD Operations**:
    *   **Add Gym**: A modal form to create new gyms, requiring name, address, coordinates, and team affiliation.
    *   **Edit Gym**: Functionality to update existing gym details.
    *   **Delete Gym**: Capability to remove a gym from the database.

### Video Management
This feature provides oversight on user-uploaded workout videos, a core component of the FitRank experience.

*   **Video Feed**: A list of workout videos including metadata like User, Lift Type (Bench, Squat, Deadlift), Weight, Team, and Date.
*   **Playback**: Integrated video player to review content directly within the portal.
*   **Moderation Tools**:
    *   **Comments & Replies**: View all comments and nested replies associated with a video.
    *   **Auto-Flagging**: The system automatically scans comments for profanity or harmful language (using a predefined list) and visually flags them with a warning badge.
    *   **Deletion**: Coaches can delete individual comments, replies, or the entire video if it violates community guidelines.
*   **Upload**: Coaches can manually upload workout videos on behalf of users or for system purposes, specifying the video URL, lift type, weight, and team.

### Item Shop Management
Manages the virtual inventory available for users to purchase within the mobile app.

*   **Analytics Dashboard**: Displays key metrics at the top: Total Items, Total Purchases, and Total Revenue (in tokens).
*   **Inventory Grid**: Visual grid of all items, showing their image, rarity, price, and status.
*   **Item Properties**:
    *   **Category**: Classifies items into types like Theme, Avatar, Frame, Badge, Powerup, Merchandise, or App Icon.
    *   **Rarity**: Assigns a rarity level (Common, Rare, Epic, Legendary) which visually changes the item's card style.
    *   **Availability**: Options to set an "Available Until" date for limited-time items.
    *   **Status**: Toggles for "Active" (purchasable) and "Featured" (highlighted in the app).
*   **Filtering**: Dropdowns to filter the grid by Category and Rarity.

### Posts & Content Moderation
A centralized feed to monitor user-generated social posts.

*   **Feed View**: Table displaying posts with Author, Text content, Team Tag, Like count, and Comment count.
*   **Flagged Content Filter**: A dedicated filter mode to instantly show only posts containing potential profanity or harmful keywords.
*   **Visual Indicators**: Flagged posts are highlighted with a yellow border and a warning badge.
*   **Deep Dive**: Expanding a post reveals:
    *   **Image Preview**: If the post has an attached image.
    *   **Likes**: A list of users who liked the post.
    *   **Comments**: A full history of comments on the post.
*   **Deletion**: One-click deletion of posts to remove them permanently.

### Leaderboards
Real-time rankings to track user performance and engagement.

*   **Dual Scoring Modes**:
    *   **Tokens**: Ranks users based on their total accumulated currency/tokens.
    *   **Weight**: Ranks users based on their maximum lifted weight.
*   **Lift Specifics**: When in "Weight" mode, toggles allow switching between Bench Press, Squat, and Deadlift rankings.
*   **Ranking Visuals**: Top 3 users receive distinct icons (Crown, Silver Medal, Bronze Medal) and color coding.
*   **User Details**: Displays Rank, Username, Name, Team (with team color), and the Score.

### Reports System
A ticketing system for handling user reports against content or other users.

*   **Unified Inbox**: Aggregates reports for various content types: Lifts, Posts, Comments, and Replies.
*   **Contextual Details**: Expanding a report dynamically fetches and displays the reported content (e.g., the specific comment text, the video, or the post image) alongside the reporter's reason.
*   **Status Workflow**: Reports can be moved through states: Pending -> Working -> Fixed.
*   **Direct Action**: Coaches can delete the reported content directly from the report view, which also automatically resolves the report.

### User Management
A complete directory of all registered users.

*   **User Table**: Lists Username, Name, Team, Token balance, Friend count, and Workout count.
*   **Advanced Filtering**:
    *   **Role**: Filter by Coaches or Athletes.
    *   **Status**: Filter by Suspended, Deleted, or Flagged accounts.
    *   **Team**: Filter by specific team affiliation.
*   **Administrative Actions**:
    *   **Modify Tokens**: Manually adjust a user's token balance.
    *   **Edit Profile**: Change a user's name, username, or team.
    *   **Password Reset**: Trigger a password reset email to the user.
    *   **Suspension**: Toggle a user's suspension status, which disables their access to the platform via Firebase Auth.

### UploadThing API Bridge
The project includes a dedicated API route at `/app/api/upload` to facilitate file uploads from the FitRank iOS mobile application.

*   **Purpose**: The FitRank iOS app needs to upload user-generated content (workout pictures/videos) to UploadThing storage. However, UploadThing does not currently provide a native Swift SDK for iOS.
*   **Solution**: This Next.js API route acts as a bridge. The iOS app sends `multipart/form-data` requests containing the file to this endpoint.
*   **Process**:
    1.  The iOS app sends a POST request to `https://<domain>/api/upload` with the file.
    2.  The API route receives the file and uses the UploadThing Server SDK (available for Next.js) to upload the file to the storage bucket.
    3.  Upon success, UploadThing returns the file metadata.
    4.  The API route responds to the iOS app with a JSON object containing the public URL of the uploaded file.
*   **Response Format**:
    ```json
    {
      "success": true,
      "url": "https://utfs.io/f/...",
      "key": "file-key",
      "name": "filename.jpg",
      "size": 12345
    }
    ```

## Firebase Integration

The application relies heavily on Firebase for its backend infrastructure.

### Authentication
*   **Coach Access**: The `AuthContext` enforces security by checking the `isCoach` boolean field in the user's Firestore document upon login. Non-coach users are denied access.
*   **Session Persistence**: Firebase Auth handles session state, ensuring users stay logged in across reloads.

### Firestore Schema
The database is structured into several core collections:

*   **`users`**: Stores user profiles, roles, token balances, and team associations.
*   **`teams`**: Defines team properties like name, color, and slug.
*   **`workouts`**: Contains workout records, video URLs, lift types, and weights.
*   **`gyms`**: Stores gym location data and owner team references.
*   **`posts`**: User-generated social feed posts.
*   **`shopItems`**: Inventory for the in-app store.
*   **`reports`**: User-submitted reports for moderation.
*   **Subcollections**: Used extensively for relational data, such as `users/{id}/friends`, `posts/{id}/comments`, and `workouts/{id}/comments`.

### Storage
*   **Media Assets**: Video files for workouts and image files for shop items or posts are stored in Firebase Storage. The application retrieves these via public URLs or authenticated download URLs depending on the resource.

## Project Structure

*   **`/app`**: Contains the Next.js App Router pages.
    *   **`page.tsx`**: The main dashboard entry point.
    *   **`login/`**: The authentication page.
    *   **`api/`**: Server-side API routes for privileged actions (e.g., user suspension).
*   **`/components`**: Reusable UI components and feature-specific views.
    *   **`Navbar.tsx`**: The side navigation menu.
    *   **`*View.tsx`**: Large, feature-specific components (e.g., `GymsView.tsx`, `UsersView.tsx`) that handle the logic and UI for each section.
*   **`/lib`**: Utility functions and configurations.
    *   **`firebase.ts`**: Client-side Firebase initialization.
    *   **`types.ts`**: TypeScript interface definitions for data models.
    *   **`admin/`**: Server-side Firebase Admin SDK configuration.
*   **`/contexts`**: React Context providers.
    *   **`AuthContext.tsx`**: Handles user authentication state and protection logic.

## Setup & Installation

Follow these steps to run the project locally.

1.  **Prerequisites**: Ensure you have Node.js 18 or higher installed.

2.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd FitRank-Website
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Environment Configuration**:
    Create a `.env.local` file in the root directory and add your Firebase configuration keys:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    # ... other firebase config keys
    FIREBASE_CLIENT_EMAIL=...
    FIREBASE_PRIVATE_KEY=...
    ```

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```

6.  **Access the Portal**:
    Open your browser and navigate to `http://localhost:3000`. Log in with a coach account credentials.
