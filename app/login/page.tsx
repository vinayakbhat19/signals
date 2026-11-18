import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to join the Stamp Hunt and cast live audience votes.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      nextPath={params.next ?? '/'}
      initialError={params.error ?? null}
    />
  );
}
