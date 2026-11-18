import UpdatesPage from '@/app/updates/page';
import type { Metadata } from 'next';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Updates',
  description:
    'Automatic schedule change alerts and official committee notices.',
};

export default UpdatesPage;
