'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Navigation } from './navigation';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) {
      return;
    }
    
    setIsSigningOut(true);
    
    if (!signOut) {
      console.error('❌ [Header] signOut function not available');
      setIsSigningOut(false);
      return;
    }

    try {
      const { error } = await signOut();
      
      if (error) {
        console.error('❌ [Header] Sign out error:', error);
        // Still redirect on error to clear local state
        window.location.href = '/auth/login';
        return;
      }
      
      // Use router push for better Next.js integration, but also force refresh
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 100);
    } catch (error) {
      console.error('❌ [Header] Sign out error:', error);
      // Fallback redirect on any error
      window.location.href = '/auth/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-1">
            <img src="/saasonic-logo.png" alt="SaaSonic" className="h-8 w-8" />
            <span className="hidden font-bold sm:inline-block">SaaSonic</span>
          </Link>
          <Navigation />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav />
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link href="/" className="mr-6 flex items-center space-x-1 md:hidden">
              <img src="/saasonic-logo.png" alt="SaaSonic" className="h-8 w-8" />
              <span className="font-bold">SaaSonic</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            {user ? (
              // Authenticated user menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || user.email || ''} />
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    className={`text-red-600 cursor-pointer ${isSigningOut ? 'opacity-50 pointer-events-none' : ''}`}
                    disabled={isSigningOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Non-authenticated user buttons
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <div className="flex flex-col space-y-3">
      <Link href="/" className="flex items-center space-x-1">
        <img src="/saasonic-logo.png" alt="SaaSonic" className="h-8 w-8" />
        <span className="font-bold">SaaSonic</span>
      </Link>
      <div className="flex flex-col space-y-2">
        <Link
          href="/features"
          className="text-muted-foreground hover:text-foreground"
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="text-muted-foreground hover:text-foreground"
        >
          Pricing
        </Link>
        <Link
          href="/airtable"
          className="text-muted-foreground hover:text-foreground"
        >
          Airtable
        </Link>
        <Link
          href="/youtube-analytics"
          className="text-muted-foreground hover:text-foreground"
        >
          YouTube Analytics
        </Link>
        <Link
          href="/channel-optimization"
          className="text-muted-foreground hover:text-foreground"
        >
          Channel Optimization
        </Link>
        <Link
          href="/docs"
          className="text-muted-foreground hover:text-foreground"
        >
          Documentation
        </Link>
        <Link
          href="/contact"
          className="text-muted-foreground hover:text-foreground"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}