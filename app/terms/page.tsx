import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  Scale,
  Users,
  QrCode,
  Trophy,
  ShieldAlert,
  Mail,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of service and fair play charter for ${festName} Live and Signals at ${collegeName}.`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Terms of Service"
        subtitle={`${festName} Live & Signals · ${collegeName}`}
      />

      {/* Overview Banner */}
      <Card className="border-[1.5px] border-[#FFD60A]/40 bg-[#1F1230]">
        <CardContent className="space-y-3 pt-5 text-sm leading-relaxed text-[#F4F2FA]">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#FFD60A]">
            <FileText className="size-4" />
            <span>Campus Community Agreement</span>
          </div>
          <p>
            Welcome to <strong>{festName} Live</strong> and the <strong>Signals</strong> campus platform.
            By accessing <span className="font-mono text-xs text-[#FFD60A]">https://fiesta26.pages.dev</span> or using our services, you agree to comply with and be bound by these Terms of Service.
          </p>
          <p className="text-xs text-[#BDB8CF]">
            Last updated: November 2026 · Author &amp; Developer: <strong>Vinayak Bhat</strong> (<a href="https://vinayakbhatpf.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[#FFD60A] underline underline-offset-2">Portfolio</a> · <a href="mailto:vinayakkbhatt@gmail.com" className="text-[#FFD60A] underline underline-offset-2">vinayakkbhatt@gmail.com</a>)
          </p>
        </CardContent>
      </Card>

      {/* Signals Code of Conduct */}
      <Card className="border-[1.5px] border-[#9B6CFF]/50 bg-[#170E24]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[#F4F2FA]">
            <Sparkles className="size-5 text-[#9B6CFF]" />
            Signals: Campus Conduct &amp; Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-[#BDB8CF]">
          <p>
            <strong>Signals</strong> connects students across the {collegeName} campus in good faith. To protect the college community, all participants must abide by these rules:
          </p>

          <div className="space-y-3">
            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <Users className="size-4 text-[#FF4FD8]" />
                <span>Respect &amp; Anti-Harassment</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Zero tolerance for harassment, stalking, bullying, intimidation, obscene language, hateful comments, or uninvited spam. Any user found harassing another student will face permanent ban and disciplinary reporting.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <Scale className="size-4 text-[#FFD60A]" />
                <span>Full Poster Discretion</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                A student who broadcasts a Signal has 100% discretion to accept or decline any response without obligation or explanation. Declining a response does not warrant negative action or confrontation.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <AlertTriangle className="size-4 text-[#22D3EE]" />
                <span>Campus Safety &amp; Public Venues</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Always arrange meetups in well-lit, public college facilities (canteen, library, main stage lawns, seminar halls). Follow campus guidelines and hostel curfew timings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiesta'26 Fair Play Charter */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-[#F4F2FA]">
            {festName} Fair Play Charter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#BDB8CF] leading-relaxed">
          <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
              <Trophy className="size-4 text-[#FFD60A]" />
              <span>Competition &amp; Jury Evaluation</span>
            </div>
            <p className="text-xs text-[#9C97B0]">
              Audience voting has been officially cancelled by festival organizers. All competitive events and stage performances are evaluated directly and impartially by appointed jury panels.
            </p>
          </div>

          <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
              <QrCode className="size-4 text-[#FF4FD8]" />
              <span>Treasure Hunt &amp; Physical Check-Ins</span>
            </div>
            <p className="text-xs text-[#9C97B0]">
              Stamp Hunt stations and clue QR codes are deployed physically across campus. <strong>Taking photographs of QR codes, circulating QR URLs in WhatsApp groups, or forging scan tokens is strictly prohibited.</strong> Any participant caught sharing or using remote QR scans will be disqualified immediately alongside their entire team.
            </p>
          </div>

          <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
              <ShieldAlert className="size-4 text-[#22D3EE]" />
              <span>Staff, Host &amp; Volunteer Responsibilities</span>
            </div>
            <p className="text-xs text-[#9C97B0]">
              Authorized hosts and volunteers must maintain absolute impartiality when recording event rankings, scores, or station verifications. Any misuse of privileged staff access will result in immediate role revocation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Security & Termination */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-[#F4F2FA]">
            Account Security, Moderation &amp; Termination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#BDB8CF] leading-relaxed">
          <p>
            You are responsible for maintaining the confidentiality of your sign-in credentials and for all actions taken under your account. If you believe your account has been compromised, notify us immediately.
          </p>
          <p className="text-xs text-[#9C97B0]">
            The fest organising committee and developer reserve the right to suspend, terminate, or restrict access to any account without prior notice if it is determined that the account has violated these terms, engaged in cheating, or disrupted campus harmony.
          </p>
        </CardContent>
      </Card>

      {/* Disclaimers & Limitations */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-[#F4F2FA]">
            Service Availability &amp; Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#BDB8CF] leading-relaxed">
          <p>
            {festName} Live and Signals are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we strive for seamless performance, real-time stage schedules, weather-related room adjustments, and network latency on campus Wi-Fi may cause delays. The organisers and developer shall not be liable for incidental disruptions or missed competition schedules.
          </p>
        </CardContent>
      </Card>

      {/* Governing Law & Contact */}
      <Card className="border-[1.5px] border-[#FFD60A]/40 bg-[#12091E]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-[#F4F2FA]">
            <Mail className="size-4 text-[#FFD60A]" />
            Governing Law &amp; Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#BDB8CF]">
          <p>
            These terms are governed by the internal regulations of {collegeName} and the applicable laws of Karnataka, India.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-[#3B2758] bg-[#1F1230] p-4 text-xs">
            <Image
              src="/vinayak.jpg"
              alt="Vinayak Bhat - Platform Author & Developer"
              width={64}
              height={64}
              className="size-16 rounded-full object-cover border-2 border-[#FFD60A] shrink-0"
            />
            <div className="space-y-1">
              <p className="font-extrabold text-[#F4F2FA] text-sm">Vinayak Bhat (Developer &amp; Platform Authorizer)</p>
              <p>Email: <a href="mailto:vinayakkbhatt@gmail.com" className="text-[#FFD60A] underline underline-offset-2">vinayakkbhatt@gmail.com</a></p>
              <p>Institution: {collegeName}, Dharwad, Karnataka</p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link href="/privacy/" className="text-xs font-bold text-[#FFD60A] underline underline-offset-4">
              Privacy Policy →
            </Link>
            <Link href="/" className="text-xs font-bold text-[#BDB8CF] underline underline-offset-4">
              Return to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
