'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/login-form';

function LoginInner() {
  const params = useSearchParams();
  const nextPath = params.get('next') ?? '/';
  const initialError = params.get('error');
  return <LoginForm nextPath={nextPath} initialError={initialError} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
