import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { getEvent } from '@/lib/data/events';

export const revalidate = 30;

export default async function EventLineupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[#FFD60A]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to {event.title}
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-[#F4F2FA]">
          Line-up
        </h1>
        <p className="text-sm text-[#9C97B0]">{event.title}</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/60 px-6 py-10 text-center">
        <Users className="size-7 text-[#9B6CFF]" aria-hidden="true" />
        <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
          No line-up published yet
        </h2>
        <p className="max-w-sm text-sm text-[#9C97B0]">
          The event host will publish the performer / team order here once
          check-in begins.
        </p>
      </div>
    </div>
  );
}
