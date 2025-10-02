import { Shield, CreditCard, BarChart3, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    name: 'Authentication',
    description: 'Secure user authentication with multiple providers, session management, and role-based access control.',
    icon: Shield,
  },
  {
    name: 'Payments',
    description: 'Integrated payment processing with Stripe, subscription management, and billing automation.',
    icon: CreditCard,
  },
  {
    name: 'Analytics',
    description: 'Real-time analytics dashboard with user insights, revenue tracking, and performance metrics.',
    icon: BarChart3,
  },
  {
    name: 'API Management',
    description: 'RESTful API with rate limiting, authentication, documentation, and monitoring tools.',
    icon: Zap,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to build a SaaS
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Focus on building your product, not the infrastructure. Our platform handles the complex stuff.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.name} className="group relative overflow-hidden transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}