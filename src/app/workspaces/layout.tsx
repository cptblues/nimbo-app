import { ReactNode } from 'react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

interface WorkspacesLayoutProps {
  children: ReactNode;
}

export default function WorkspacesLayout({ children }: WorkspacesLayoutProps) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
