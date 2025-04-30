import { ReactNode } from 'react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
