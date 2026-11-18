import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Radio, Users } from 'lucide-react';
import { getEvent } from '@/lib/data/events';
import { listPublicLineup } from '@/lib/data/participants';

export const revalidate = 15;

export default async function EventLineupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, lineup] = await Promise.all([
    getEvent(id),
    listPublicLineup(id),
  ]);

  if (!event) {
    notFound();
  }

  const onStage = lineup.filter((p) => p.status === 'on_stage');
  const nextUp = lineup.find((p) => p.status === 'checked_in');

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
        <h1 className="font-display text-3xl text-[#F4F2FA]">LINE-UP</h1>
        <p className="text-sm text-[#BDB8CF]">
          {event.title} · {lineup.length}{' '}
          {lineup.length === 1 ? 'performer' : 'performers'}
        </p>
      </div>

      {onStage.length > 0 && (
        <section className="space-y-2">
          {onStage.map((p) => (
            <div
              key={p.id}
              className="rounded-[22px] bg-[#FF4FD8] p-4 text-[#12091E] shadow-[4px_4px_0_#FFD60A]"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12091E] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FFD60A]">
                <Radio className="size-3" /> ON STAGE NOW
              </span>
              <h2 className="mt-1.5 font-heading text-2xl font-extrabold">
                {p.team || p.name}
              </h2>
              <p className="text-sm font-semibold">
                {[p.team ? p.name : null, p.department, p.college]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ))}
        </section>
      )}

      {lineup.length > 0 ? (
        <ol className="space-y-2">
          {lineup.map((p, idx) => {
            const isNext = nextUp?.id === p.id;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2A1840] font-heading text-sm font-extrabold text-[#FFD60A]">
                  {p.performance_order ?? idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-[#F4F2FA]">
                      {p.team || p.name}
                    </span>
                    {isNext && (
                      <span className="rounded-full bg-[#FFD60A] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                        NEXT
                      </span>
                    )}
                    {p.status === 'performed' && (
                      <span className="rounded-full bg-[#3B2758] px-2 py-0.5 text-[10px] font-bold text-[#BDB8CF]">
                        DONE
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[#9C97B0]">
                    {[p.team ? p.name : null, p.department, p.college]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
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
      )}
    </div>
  );
}
