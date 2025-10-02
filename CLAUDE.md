# CLAUDE.md - AI Assistant Context

## Project Overview

This is a YouTube Analytics SaaS application built with Next.js that integrates with Airtable for data management. The application provides tools for YouTube content creators to analyze and optimize their video content, including title generation, thumbnail creation, content analytics, and comprehensive channel optimization with AI-powered suggestions.

## Tech Stack

- **Framework**: Next.js 15.4.1 with App Router and Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with tw-animate-css
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Data Grid**: MUI X Data Grid
- **Database Integration**: Airtable API
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Theme**: next-themes for dark/light mode

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/              # Login page
│   │   ├── signup/             # Sign up page
│   │   └── layout.tsx          # Auth layout (no header/sidebar)
│   ├── (protected)/            # Protected routes (requires auth)
│   │   ├── airtable/           # Airtable management page
│   │   ├── youtube-analytics/  # Main YouTube analytics dashboard
│   │   ├── channel-optimization/ # YouTube channel optimization with AI suggestions
│   │   ├── image-generation/   # AI image and video generation tool
│   │   ├── profile/            # User profile management
│   │   └── layout.tsx          # Protected layout with auth check
│   └── api/                     # API routes
│       ├── airtable/           # Airtable CRUD endpoints
│       ├── characters/         # Character data from Airtable
│       ├── products/           # Product data from Airtable
│       └── themes/             # Theme data from Airtable
├── components/
│   ├── auth/                    # Authentication components
│   │   ├── LoginForm.tsx       # Login form component
│   │   ├── SignupForm.tsx      # Signup form component
│   │   └── UserButton.tsx      # User menu in header
│   ├── youtube-analytics/       # YouTube-specific components
│   │   ├── grid/               # Data grid components
│   │   ├── modals/             # Various modal dialogs
│   │   └── search/             # Search functionality
│   ├── channel-optimization/    # Channel optimization components
│   │   ├── modals/             # Channel management modals
│   │   ├── ChannelCard.tsx     # Channel selection cards
│   │   └── VideoList.tsx       # Video display and optimization
│   ├── image-generation/        # Image generation components
│   │   ├── CharacterSelector.tsx # Character selection from Airtable
│   │   ├── ProductSelector.tsx  # Product selection from Airtable
│   │   ├── ThemeSelector.tsx    # Theme selection from Airtable
│   │   ├── DrawingCanvas.tsx    # Hand-drawing input canvas
│   │   ├── ImageDisplay.tsx     # Generated image display (deprecated)
│   │   ├── ImageResult.tsx      # Enhanced image result display
│   │   ├── VideoResult.tsx      # Generated video display
│   │   ├── ImageUpload.tsx      # Main character image upload
│   │   ├── ProductUpload.tsx    # Product image upload component
│   │   ├── VideoGeneration.tsx  # Video generation controls
│   │   ├── ImageSnapshots.tsx   # Snapshot history component
│   │   └── modals/             # Selection and editing modals
│   │       ├── CharacterSelectionModal.tsx
│   │       ├── ProductSelectionModal.tsx
│   │       ├── ThemeSelectionModal.tsx
│   │       └── CropperModal.tsx # Image cropping modal
│   ├── ui/                     # shadcn/ui components
│   └── common/                 # Shared components
├── contexts/                    # React contexts
│   └── AuthContext.tsx         # Authentication context provider
├── hooks/                       # Custom React hooks
│   ├── useYouTubeAnalytics.ts # Main analytics hook
│   ├── useChannelOptimization.ts # Channel optimization hook
│   ├── useModalStates.ts      # Modal state management
│   ├── useAirtableOperations.ts # Airtable CRUD operations
│   ├── useImageGeneration.ts  # Image/video generation workflow
│   ├── useCharacterSelection.ts # Character selection logic
│   ├── useProductSelection.ts # Product selection logic
│   └── useThemeSelection.ts   # Theme selection logic
├── lib/                        # Utility functions
│   ├── supabase/              # Supabase configuration
│   │   ├── client.ts          # Browser client
│   │   └── server.ts          # Server client
│   ├── airtable.ts            # Airtable client
│   ├── keyword-utils.ts       # Keyword processing
│   └── srt-parser.ts          # SRT file parsing
└── types/                      # TypeScript type definitions
```

## Core Features

1. **Authentication & User Management**
   - Email/password authentication via Supabase
   - OAuth authentication with Google and GitHub
   - **OAuth login/signup separation** - prevents unauthorized account creation
   - User registration with email verification
   - Protected routes with automatic redirect
   - User profile management
   - Session persistence and auto-refresh
   - Registration method tracking (email/google/github)

2. **YouTube Analytics Dashboard**
   - Search and filter YouTube content data
   - Display data in interactive grid with custom cells
   - Support for attachments, images, and text preview

3. **Channel Optimization System**
   - Import and manage multiple YouTube channels (owned + reference channels)
   - Video scraping with YouTube API and Apify fallback for reliability
   - AI-powered optimization suggestions using hybrid reference data:
     * External successful titles from YouTube Analytics database
     * Internal top-performing titles from user's own channels
   - Enhanced n8n webhook integration with enriched context
   - Performance analysis and video categorization
   - One-click suggestion copying and application

4. **Content Generation Tools**
   - Title generation with keywords and tone selection
   - Thumbnail generation with AI assistance
   - Special instructions for content optimization

5. **AI Image & Video Generation System**
   - Character selection from Airtable database with image preview
   - Product/background selection from Airtable database
   - Theme selection from Airtable for style guidance
   - Hand-drawing canvas with real-time boundary detection
   - AI-powered image generation via n8n webhook integration
   - Automatic video generation from generated images
   - UGC (User Generated Content) script input for video narration
   - Dual-stage generation workflow (image → video)
   - Save to Airtable functionality for archiving generated content
   - Download capabilities for both images and videos
   - **Snapshot System**: Auto-saves last 15 generations with one-click restore
   - **Image Cropping**: Built-in cropper modal for generated images
   - **Continue Editing**: Use generated image as new input for iteration
   - **Auto Video Generation**: Simplified one-click video creation
   - **Toast Notifications**: Real-time operation feedback
   - **Product Image Upload**: Optional product image for composition
   - **Enhanced Error Handling**: Auto-dismissing errors with manual clear option
   - **Video Prompt Shortcuts**: Ready-made Chinese camera movement prompts for quick selection
   - **Intelligent Video Status Polling**: Handles temporary/fallback task IDs with auto-download
   - **Complete Airtable Export**: Uploads all assets (character/product/generated) with metadata in single call
   - **Airtable Asset Fetching**: Product and theme pickers convert remote images to local File objects

6. **Airtable Integration**
   - Full CRUD operations on Airtable records
   - Dynamic field mapping
   - Support for various field types (text, attachments, select)

7. **Modal System**
   - CreateTitleModal: Generate YouTube titles
   - GenerateThumbnailModal: Create thumbnails with AI
   - ImagePreviewModal: Preview uploaded images
   - TextPreviewModal: Preview generated text content
   - DeleteConfirmModal: Confirm record deletion
   - AddChannelModal: Add new YouTube channels
   - VideoScrapingModal: Configure video synchronization
   - OptimizationSuggestionsModal: View and manage AI suggestions
   - CharacterSelectionModal: Browse and select characters
   - ProductSelectionModal: Browse and select products
   - ThemeSelectionModal: Browse and select themes
   - CropperModal: Crop and adjust generated images

## Development Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run type-check   # TypeScript type checking

# Cleanup
npm run clean        # Remove build artifacts
```

## Key Files & Their Purpose

### Authentication
- `src/contexts/AuthContext.tsx` - Authentication context and hooks
- `src/components/auth/LoginForm.tsx` - Login form component
- `src/components/auth/SignupForm.tsx` - Signup form component
- `src/app/(auth)/layout.tsx` - Auth pages layout
- `src/app/(protected)/layout.tsx` - Protected routes wrapper
- `src/lib/supabase/client.ts` - Supabase browser client
- `src/lib/supabase/server.ts` - Supabase server client

### YouTube Analytics
- `src/app/(protected)/youtube-analytics/page.tsx` - Main dashboard page
- `src/hooks/useYouTubeAnalytics.ts` - Core business logic hook
- `src/hooks/useModalStates.ts` - Modal state management
- `src/components/youtube-analytics/modals/CreateTitleModal.tsx` - Title generation UI
- `src/components/youtube-analytics/modals/GenerateThumbnailModal.tsx` - Thumbnail generation UI

### Data Management
- `src/lib/airtable.ts` - Airtable API client configuration
- `src/app/(protected)/profile/page.tsx` - User profile management

### Image Generation
- `src/app/(protected)/image-generation/page.tsx` - Main image generation page
- `src/hooks/useImageGeneration.ts` - Core image/video generation workflow logic with snapshot management
- `src/hooks/useCharacterSelection.ts` - Character data fetching and selection
- `src/hooks/useProductSelection.ts` - Product data fetching and selection
- `src/hooks/useThemeSelection.ts` - Theme data fetching and selection
- `src/components/image-generation/DrawingCanvas.tsx` - Canvas drawing component
- `src/components/image-generation/ImageSnapshots.tsx` - Snapshot history management
- `src/components/image-generation/modals/CropperModal.tsx` - Image cropping functionality
- `src/app/api/characters/route.ts` - API endpoint for character data
- `src/app/api/products/route.ts` - API endpoint for product data
- `src/app/api/themes/route.ts` - API endpoint for theme data

## Coding Standards

### Component Structure
- Use functional components with TypeScript
- Organize components by feature in dedicated folders
- Export components through index.ts files for cleaner imports

### State Management
- Use React hooks for local state
- Custom hooks for complex state logic
- Form state managed by React Hook Form

### Styling
- Tailwind CSS for all styling
- Use shadcn/ui components as base
- Follow mobile-first responsive design

### TypeScript
- Strict mode enabled
- Define types in dedicated files
- Use Zod for runtime validation

### API Routes
- RESTful endpoints under `/api/airtable/`
- Proper error handling with try-catch
- Return appropriate HTTP status codes

## Common Tasks

### Adding a New Protected Page
1. Create page component in `src/app/(protected)/[page-name]/page.tsx`
2. The page will automatically be protected by the layout
3. Use `useAuth()` hook to access user data if needed
4. Handle loading states while auth is checking

### Implementing Authentication Features
1. Use `useAuth()` hook from AuthContext for user state
2. Use `supabase.auth` methods for auth operations
3. Protected routes redirect to `/login` automatically
4. Session tokens are managed automatically by Supabase
5. OAuth methods available:
   - **Login page**: `signInWithGoogle()`, `signInWithGitHub()` (existing users only)
   - **Signup page**: `signUpWithGoogle()`, `signUpWithGitHub()` (new users only)

### Setting Up OAuth Providers

#### OAuth Login/Signup Separation
This application implements **strict OAuth separation**:
- **Login page**: Only allows existing users to sign in via OAuth
- **Signup page**: Only allows new users to register via OAuth
- Users attempting wrong flow receive clear error messages

#### Google OAuth Configuration
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Enable Google provider in Supabase Dashboard
5. Add Client ID and Secret to Supabase

#### GitHub OAuth Configuration
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Enable GitHub provider in Supabase Dashboard
5. Add Client ID and Secret to Supabase

#### Database Schema for OAuth
Add `registration_method` column to track how users registered:
```sql
ALTER TABLE profiles_saas 
ADD COLUMN registration_method TEXT CHECK (registration_method IN ('email', 'google', 'github'));
```

### Adding a New Modal
1. Create component in `src/components/youtube-analytics/modals/`
2. Add state management in `useModalStates.ts`
3. Export from modals index file
4. Integrate in main page component

### Modifying Airtable Schema
1. Update types in `src/types/youtube-analytics.ts`
2. Adjust field mapping if needed
3. Update API routes if new operations required

### Adding New Grid Columns
1. Define column in YouTubeDataGrid component
2. Create custom cell renderer if needed
3. Update field mapping for proper data display

### Working with Image Generation
1. Character, Product, and Theme data are fetched from Airtable
2. Images are processed through n8n webhook for AI generation
3. Generated content can be saved back to Airtable for archiving
4. The workflow is: Select inputs → Generate image → (Optional: Crop) → Generate video → Save/Download
5. Canvas drawing supports touch and mouse input with boundary detection
6. All API routes for image generation bypass authentication middleware
7. Snapshots are automatically saved (max 15) and can be restored with one click
8. Generated images can be reused as input for iterative editing
9. Toast notifications provide real-time feedback for all operations
10. Error messages auto-dismiss after 5 seconds or can be manually cleared
11. Video generation includes pre-defined Chinese camera movement prompts (緩慢拉近, 緩慢拉遠, 向左平移, etc.)
12. Video status polling automatically handles temporary IDs and fallback scenarios
13. Airtable save uploads all source images (character/product) plus generated content with full metadata
14. Product/Theme selection fetches remote Airtable images and converts them to local File objects for processing

## Environment Variables

Required environment variables (set in `.env.local`):
```bash
# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Airtable API
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# YouTube Analytics Configuration
NEXT_PUBLIC_YOUTUBE_ANALYTICS_BASE_ID=your_youtube_analytics_base_id
NEXT_PUBLIC_YOUTUBE_ANALYTICS_TABLE_ID=your_youtube_analytics_table_id

# n8n Webhook URLs
NEXT_PUBLIC_N8N_WEBHOOK_URL=your_n8n_search_webhook_url
NEXT_PUBLIC_N8N_CREATE_TITLE_WEBHOOK_URL=your_n8n_title_generation_webhook_url
NEXT_PUBLIC_N8N_SUMMARY_WEBHOOK_URL=your_n8n_summary_webhook_url
NEXT_PUBLIC_N8N_IMAGE_GENERATION_WEBHOOK_URL=your_n8n_image_generation_webhook_url

# Image Generation Configuration
NEXT_PUBLIC_IMAGE_GENERATION_BASE_ID=your_airtable_image_generation_base_id

# YouTube Data API (for channel optimization)
YOUTUBE_API_KEY=your_youtube_data_api_key

# Apify Configuration (alternative to YouTube API)
APIFY_API_KEY=your_apify_api_key
APIFY_YOUTUBE_SCRAPER_ACTOR_ID=your_apify_actor_id
```

## Testing & Validation

Before committing:
1. Run `npm run type-check` to ensure no TypeScript errors
2. Run `npm run lint:fix` to fix linting issues
3. Run `npm run format` to format code
4. Test all modal flows manually
5. Verify Airtable operations work correctly

## Important Notes

### Authentication Flow
- Users must register and verify email before accessing protected routes
- OAuth login/signup are strictly separated:
  - Login page OAuth only works for existing users
  - Signup page OAuth only works for new users
  - Wrong flow attempts show clear error messages
- Session tokens are stored in cookies and auto-refresh
- Protected routes use server-side auth checks via middleware
- Unauthorized users are redirected to `/login` with return URL preserved
- User context is available throughout the app via AuthContext
- Registration method is tracked in database (email/google/github)

### Security Considerations
- All protected pages check authentication server-side
- API routes should validate user permissions
- Sensitive operations require user re-authentication
- Environment variables must be properly secured

### Data Management
- The application heavily relies on Airtable as the data backend
- Modal states are centrally managed for consistency
- All user inputs are validated with Zod schemas
- The grid component uses MUI X Data Grid for performance
- File uploads are handled through Airtable's attachment fields

## Current Development Status

The application is feature-complete with:
- ✅ User authentication with Supabase (Email/Password)
- ✅ OAuth authentication (Google & GitHub) with unified flow
- ✅ Protected routes and automatic redirects
- ✅ User profile management with registration method tracking
- ✅ Full CRUD operations on Airtable
- ✅ YouTube content analytics dashboard
- ✅ Channel optimization system with AI-powered suggestions
- ✅ Hybrid reference system (external + internal data)
- ✅ Video scraping with YouTube API and Apify fallback
- ✅ Enhanced n8n webhook integration
- ✅ Title and thumbnail generation tools
- ✅ AI-powered image and video generation system
- ✅ Hand-drawing canvas with boundary detection
- ✅ Integration with Airtable for content selection
- ✅ Save to Airtable functionality for generated content
- ✅ Snapshot system with history management (15 items limit)
- ✅ Image cropping with modal interface
- ✅ Continue editing feature for iterative improvements
- ✅ Auto video generation with simplified workflow
- ✅ Toast notification system for user feedback
- ✅ Enhanced error handling with auto-dismiss
- ✅ Chinese video prompt shortcuts for camera movements
- ✅ Intelligent video status polling with auto-download
- ✅ Complete Airtable export with all assets and metadata
- ✅ Airtable asset fetching with automatic file conversion
- ✅ Multiple modal dialogs for various operations
- ✅ Responsive design with dark mode support
- ✅ TypeScript throughout the codebase

## Known Issues & TODOs

### Channel Optimization System
- Implement thumbnail style copying feature
- Add real YouTube API and Apify integration (currently using mock data)
- Implement database persistence for channels and videos
- Add video performance analytics and scoring algorithms
- Implement batch optimization for multiple videos
- Add export functionality for optimization results

### Image Generation System
- ~~Add image editing capabilities (crop, resize, filters)~~ ✅ Cropping implemented
- ~~Implement generation history and versioning~~ ✅ Snapshot system implemented
- Add support for multiple image style presets
- Implement batch generation for multiple characters/products
- Add more image editing features (resize, filters, adjustments)
- Add collaborative features for team workflows
- Optimize canvas performance for larger drawings
- Extend snapshot system with cloud backup
- Add undo/redo for canvas drawing
- Implement snapshot search and filtering

### General Improvements
- Monitor performance with large datasets in the grid
- Consider implementing pagination for better performance
- Add unit tests for critical business logic
- Implement error boundary for better error handling
- Add rate limiting for API endpoints
- Implement background job processing for video scraping
- Add comprehensive logging and monitoring
- Implement caching strategy for frequently accessed data