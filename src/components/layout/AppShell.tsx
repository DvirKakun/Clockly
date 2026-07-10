import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main
        className="mx-auto w-full max-w-lg flex-1 px-4"
        style={{
          paddingTop: 'calc(var(--safe-top) + 16px)',
          paddingBottom: 'calc(var(--safe-bottom) + 96px)',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
