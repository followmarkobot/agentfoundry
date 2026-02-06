# AgentFoundry - Build Spec

## Overview
Clone of agents.shipmas.fun - an AI agent marketplace landing page with GitHub OAuth.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Convex (database)
- NextAuth with GitHub provider

## Pages

### 1. Landing Page (`/`)
Match the style of agents.shipmas.fun:
- Dark theme (black/gray background)
- Hero section:
  - "Deploy in 60 seconds" pill badge (dark bg, white text)
  - "Stop Building." (white) + "Start Deploying." (purple gradient text)
  - Subtitle: "Skip months of development. Deploy battle-tested AI agents..."
  - "Explore AI Automations" button (white bg, black text)
  - Stats row: "3000+ integrations ready | Production-ready workflows | 60-second setup"
- Value props section:
  - "Why waste months building what already exists?"
  - 3 cards: "Months of Development", "60-Second Deploy", "Battle-Tested"
- Featured agents section (skip pricing for now, just show cards)
- Stats bar: 60s / 99.9% / 24/7 / $0
- CTA sections with purple/pink gradient backgrounds
- "Sign in with GitHub" button in header

### 2. Dashboard (`/dashboard`) - Protected
After GitHub sign-in:
- Fetch user's GitHub repos via GitHub API
- Display as a grid of cards in Upwork job-listing style:
  - Card has: repo name, description, language, stars, last updated
  - Clean white/dark cards with subtle shadows
  - Hover state
  - Grid layout (3-4 columns on desktop)

## Design System
- Colors:
  - Background: #000000, #0a0a0a, #111111
  - Text: white, gray-400
  - Accent: purple-500, purple-600 (gradient)
  - Cards: dark gray with subtle border
- Typography: Clean sans-serif (system or Inter)
- Buttons: Rounded, solid backgrounds
- Cards: Rounded corners, subtle shadows

## Auth Flow
1. User clicks "Sign in with GitHub"
2. OAuth redirect to GitHub
3. Return to /dashboard
4. Fetch repos from GitHub API using access token
5. Display repo grid

## File Structure
```
src/
  app/
    page.tsx          # Landing page
    dashboard/
      page.tsx        # Protected dashboard with repo grid
    api/
      auth/[...nextauth]/
        route.ts      # NextAuth handler
  components/
    Header.tsx
    Hero.tsx
    ValueProps.tsx
    FeaturedAgents.tsx
    StatsBar.tsx
    CTASection.tsx
    RepoCard.tsx
    RepoGrid.tsx
convex/
  schema.ts           # Convex schema (users, agents)
```

## Priority
1. Landing page with all sections
2. GitHub OAuth working
3. Dashboard with repo grid
