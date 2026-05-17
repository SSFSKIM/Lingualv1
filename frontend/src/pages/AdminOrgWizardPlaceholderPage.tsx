import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useAuth } from '@/hooks/useAuth';

export function AdminOrgWizardPlaceholderPage() {
  const { logout } = useAuth();
  return (
    <AnimatedPage className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="p-10 max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border-2 border-foreground flex items-center justify-center">
          <Clock size={32} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Almost there</h1>
          <p className="mt-2 text-muted-foreground">
            School registration is launching in the next release. We've saved
            your account — once the wizard is live, you'll be able to register
            your school for Lingual approval.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-stamp-sm hover:bg-primary/90"
          >
            Back to home
          </Link>
          <Button type="button" variant="ghost" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </Card>
    </AnimatedPage>
  );
}
