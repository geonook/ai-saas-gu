'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Airtable', href: '/airtable' },
  { name: 'YouTube Analytics', href: '/youtube-analytics' },
  { name: 'Channel Optimization', href: '/channel-optimization' },
  { name: 'Image Generation', href: '/image-generation' },
  { name: 'Documentation', href: '/docs' },
  { name: 'Contact', href: '/contact' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'transition-colors hover:text-foreground/80',
            pathname === item.href ? 'text-foreground' : 'text-foreground/60'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}