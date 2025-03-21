// components/LayoutWithSidebar.tsx
'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Navbar/Navbar';

interface LayoutWithSidebarProps {
  children: ReactNode;
}

export default function LayoutWithSidebar({ children }: LayoutWithSidebarProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div>
      {!isLoginPage && <Sidebar />}
      <div>
        {children}
      </div>
    </div>
  );
}