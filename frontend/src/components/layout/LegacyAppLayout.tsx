import { ReactNode } from 'react';
import { Header } from './Header';
import { useLearningLocale } from '@/contexts/LearningLocaleContext';

interface LegacyAppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function LegacyAppLayout({ children, showHeader = true }: LegacyAppLayoutProps) {
  const { learningLocale } = useLearningLocale();

  return (
    <div
      className="h-screen flex flex-col"
      dir="ltr"
      lang={learningLocale}
    >
      {showHeader && <Header />}
      <main className={showHeader ? 'flex-1 pt-16 overflow-auto' : 'flex-1 overflow-auto'}>
        {children}
      </main>
    </div>
  );
}
