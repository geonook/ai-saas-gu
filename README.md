# SaaSify - Next.js SaaS Framework

A modern, production-ready SaaS framework built with Next.js 15, TypeScript, and Tailwind CSS. Get your SaaS up and running in minutes, not weeks.

## 🚀 Features

- **Modern Stack**: Next.js 15, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with beautiful, accessible components
- **Authentication Ready**: Pre-built auth components and types
- **Subscription Management**: Stripe integration ready
- **Dark Mode**: Built-in theme switching with next-themes
- **Responsive Design**: Mobile-first approach
- **Type Safety**: Full TypeScript support
- **Production Ready**: Optimized for performance and SEO

## 📦 What's Included

### Core Features
- ✅ Authentication system (types and components ready)
- ✅ Subscription management (Stripe integration ready)
- ✅ User dashboard layouts
- ✅ Landing page with hero, features, and pricing
- ✅ Responsive navigation with mobile menu
- ✅ Dark/light mode toggle
- ✅ Loading states and error handling
- ✅ TypeScript types for all major entities

### UI Components
- ✅ Header with navigation and auth buttons
- ✅ Footer with company links
- ✅ Hero section with CTA buttons
- ✅ Features showcase section
- ✅ Pricing tiers preview
- ✅ Loading spinner
- ✅ Theme toggle button

### Development Tools
- ✅ ESLint configuration
- ✅ Prettier with Tailwind CSS sorting
- ✅ TypeScript strict mode
- ✅ Git setup with proper .gitignore

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your environment variables in `.env.local`

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                      # Next.js app router
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with theme provider
│   ├── page.tsx             # Landing page
│   └── (auth)/              # Auth route group
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   │   ├── header.tsx       # Main header with navigation
│   │   ├── footer.tsx       # Footer with links
│   │   └── navigation.tsx   # Navigation menu
│   ├── features/            # Feature-specific components
│   │   └── landing/         # Landing page sections
│   │       ├── hero-section.tsx
│   │       ├── features-section.tsx
│   │       └── pricing-preview.tsx
│   └── common/              # Shared components
│       ├── loading-spinner.tsx
│       └── theme-toggle.tsx
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── constants.ts        # App constants
│   └── types.ts            # Shared TypeScript types
├── styles/
│   └── globals.css         # Additional custom styles
└── types/
    ├── auth.ts             # Authentication types
    └── subscription.ts     # Subscription types
```

## 🎨 Customization

### Brand Colors
Update your brand colors in `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    DEFAULT: "hsl(var(--primary))",
    // ... your primary colors
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    // ... your secondary colors
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    // ... your accent colors
  },
}
```

### App Information
Update app constants in `src/lib/constants.ts`:

```typescript
export const APP_NAME = 'Your SaaS Name';
export const APP_DESCRIPTION = 'Your SaaS description';
```

### Metadata
Update SEO metadata in `src/app/layout.tsx`

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## 📊 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React hooks (Context API ready)
- **Theme**: next-themes
- **Icons**: Lucide React
- **Development**: ESLint, Prettier

## 🔐 Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
# Database
DATABASE_URL="your-database-url"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Stripe
STRIPE_SECRET_KEY="your-stripe-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable"

# And more...
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub/GitLab/Bitbucket
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Other Platforms
This is a standard Next.js app and can be deployed to any platform that supports Node.js.

## 📝 Next Steps

1. **Set up database**: Add your preferred database (PostgreSQL, MongoDB, etc.)
2. **Add authentication**: Implement NextAuth.js or your preferred auth solution
3. **Integrate payments**: Set up Stripe for subscriptions
4. **Add analytics**: Implement tracking and analytics
5. **Customize design**: Update colors, fonts, and styling to match your brand

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@saasify.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discord: [Join our community](https://discord.gg/saasify)

---

Built with ❤️ by the SaaSify team
