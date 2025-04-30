import { ReactNode } from 'react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
