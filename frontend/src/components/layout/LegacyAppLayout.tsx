import { ReactNode } from 'react';
import { Header } from './Header';

interface LegacyAppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function LegacyAppLayout({ children, showHeader = true }: LegacyAppLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {showHeader && <Header />}
      <main className={showHeader ? 'flex-1 pt-16 overflow-auto' : 'flex-1 overflow-auto'}>
        {children}
      </main>
    </div>
  );
}
