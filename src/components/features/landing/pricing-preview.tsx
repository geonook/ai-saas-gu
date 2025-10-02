import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: [
      'Up to 1,000 users',
      'Basic analytics',
      'Email support',
      'Standard integrations',
      'Basic API access',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'Best for growing businesses',
    features: [
      'Up to 10,000 users',
      'Advanced analytics',
      'Priority support',
      'All integrations',
      'Full API access',
      'Custom branding',
      'Advanced security',
    ],
    cta: 'Start Free Trial',
    href: '/auth/signup?plan=pro',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited users',
      'Custom analytics',
      'Dedicated support',
      'Custom integrations',
      'Enterprise API',
      'Full customization',
      'Enterprise security',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    featured: false,
  },
];

export function PricingPreview() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that&apos;s right for your business. All plans include a 14-day free trial.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  tier.featured
                    ? 'border-primary ring-2 ring-primary ring-opacity-20'
                    : ''
                }`}
              >
                {tier.featured && (
                  <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {tier.price !== 'Custom' && (
                      <span className="ml-1 text-sm text-muted-foreground">
                        /month
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-6 w-full ${
                      tier.featured ? '' : 'variant-outline'
                    }`}
                    variant={tier.featured ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}