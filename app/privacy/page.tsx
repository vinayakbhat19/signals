import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  EyeOff,
  Clock,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  Smartphone,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${festName} Live and Signals at ${collegeName}.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Privacy Policy"
        subtitle={`${festName} Live & Signals · ${collegeName}`}
      />

      {/* Overview Banner */}
      <Card className="border-[1.5px] border-[#FFD60A]/40 bg-[#1F1230]">
        <CardContent className="space-y-3 pt-5 text-sm leading-relaxed text-[#F4F2FA]">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#FFD60A]">
            <ShieldCheck className="size-4" />
            <span>Privacy By Design</span>
          </div>
          <p>
            Welcome to the official Privacy Policy for <strong>{festName} Live</strong> and the <strong>Signals</strong> campus app.
            Developed by <strong>Vinayak Bhat</strong> (<a href="https://vinayakbhatpf.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[#FFD60A] underline underline-offset-2">Portfolio</a> · <a href="mailto:vinayakkbhatt@gmail.com" className="text-[#FFD60A] underline underline-offset-2">vinayakkbhatt@gmail.com</a>)
            for the students, faculty, and attendees of {collegeName}.
          </p>
          <p className="text-xs text-[#BDB8CF]">
            Last updated: November 2026 · Effective across <span className="font-mono text-[#F4F2FA]">https://fiesta26.pages.dev</span>
          </p>
        </CardContent>
      </Card>

      {/* Signals Privacy Focus */}
      <Card className="border-[1.5px] border-[#9B6CFF]/50 bg-[#170E24]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[#F4F2FA]">
            <Sparkles className="size-5 text-[#9B6CFF]" />
            Signals: Micro-Connections Without Sacrificing Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-[#BDB8CF]">
          <p>
            <strong>Signals</strong> is a campus micro-connection tool built so students can find study partners, project teammates, or lunch buddies on campus without the anxiety of blasting their personal contact info into public group chats.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <EyeOff className="size-4 text-[#FF4FD8]" />
                <span>Zero Public Phone Numbers</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Your phone number, WhatsApp, and social accounts are never displayed on public feeds or shared with strangers.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <UserCheck className="size-4 text-[#FFD60A]" />
                <span>Mutual Opt-In Only</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Clicking &quot;I&apos;m in&quot; on a Signal does not share your contact details. Direct contact channels are revealed only after the Signal creator manually reviews and accepts your request.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <Clock className="size-4 text-[#22D3EE]" />
                <span>Ephemeral Lifetime</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Signals are real-time and short-lived. Every Signal automatically expires within 3 to 6 hours or at campus curfew, leaving no permanent public archive.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F4F2FA]">
                <Smartphone className="size-4 text-[#9B6CFF]" />
                <span>Campus-Only Scope</span>
              </div>
              <p className="text-xs text-[#9C97B0]">
                Signals are scoped exclusively to {collegeName} students and registered participants. We do not sell data to third-party brokers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information We Collect */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-[#F4F2FA]">
            Information We Collect &amp; How It Is Used
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#BDB8CF] leading-relaxed">
          <div>
            <h3 className="font-bold text-[#F4F2FA]">1. Account &amp; Authentication Data</h3>
            <p className="text-xs text-[#9C97B0] mt-1">
              When you sign up or log in (via Google OAuth or Email / Password), we securely store your email address, full name, and avatar picture URL. This is used solely to identify your session, grant appropriate staff roles (Student, Volunteer, Host, Organiser), and display your profile initials.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#F4F2FA]">2. Competition Evaluation &amp; Notice</h3>
            <p className="text-xs text-[#9C97B0] mt-1">
              Audience voting has been officially cancelled by event organizers. All festival competitions and stage performances are judged directly by designated jury panels.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#F4F2FA]">3. Treasure Hunt &amp; Stamp Check-ins</h3>
            <p className="text-xs text-[#9C97B0] mt-1">
              When you scan physical QR codes across campus stations, the station ID and scan timestamp are recorded to increment your team or player score on the live leaderboard and verify physical presence.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#F4F2FA]">4. Technical &amp; Operational Logs</h3>
            <p className="text-xs text-[#9C97B0] mt-1">
              We collect minimal server request logs (IP address, user-agent, error codes) solely to prevent abuse, mitigate DDoS attacks, and diagnose infrastructure health.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google OAuth Disclosure */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-[#F4F2FA]">
            <Lock className="size-4 text-[#FFD60A]" />
            Google API Limited Use Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#BDB8CF] leading-relaxed">
          <p>
            When you choose <strong>Sign in with Google</strong>, {festName} Live requests only standard identity scopes:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#9C97B0]">
            <li><span className="font-mono text-[#F4F2FA]">openid</span>: To confirm your identity token.</li>
            <li><span className="font-mono text-[#F4F2FA]">email</span>: To link your fest account and send essential verification.</li>
            <li><span className="font-mono text-[#F4F2FA]">profile</span>: To display your first name, last name, and profile avatar.</li>
          </ul>
          <p className="text-xs text-[#BDB8CF]">
            We <strong>never</strong> request access to your Google Drive, Contacts, Gmail, Calendar, or any other personal Google data. Information retrieved through Google OAuth adheres strictly to the Google API Services User Data Policy.
          </p>
        </CardContent>
      </Card>

      {/* Data Retention & Post-Fest Purge */}
      <Card className="border-[1.5px] border-[#3B2758] bg-[#1F1230]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-[#F4F2FA]">
            <Trash2 className="size-4 text-[#FF4FD8]" />
            Post-Fest Data Purge &amp; Your Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#BDB8CF] leading-relaxed">
          <p>
            {festName} Live is committed to strict data minimization. In accordance with our fest archive policy (<span className="font-mono text-xs text-[#FFD60A]">archive_and_purge_fest()</span>):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#9C97B0]">
            <li>Raw individual audience voting records are permanently purged after results declaration.</li>
            <li>All ephemeral Signals and contact connection logs are automatically deleted.</li>
            <li>Student phone numbers and temporary check-in tokens are wiped.</li>
          </ul>
          <p className="text-xs text-[#BDB8CF]">
            <strong>Account Deletion:</strong> You have the right to delete your account and all associated personal data at any time directly through the <Link href="/account/" className="text-[#FFD60A] underline underline-offset-2">Account Settings page</Link> or by emailing <a href="mailto:vinayakkbhatt@gmail.com" className="text-[#FFD60A] underline underline-offset-2">vinayakkbhatt@gmail.com</a>.
          </p>
        </CardContent>
      </Card>

      {/* Contact & Developer */}
      <Card className="border-[1.5px] border-[#FFD60A]/40 bg-[#12091E]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-[#F4F2FA]">
            <Mail className="size-4 text-[#FFD60A]" />
            Developer &amp; Privacy Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#BDB8CF]">
          <p>
            If you have questions, feedback, or concerns regarding your privacy or data protection on {festName} Live or Signals, please contact:
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
              <p>Institution: {collegeName}</p>
              <p>Campus Address: Dhavalgiri, Dharwad, Karnataka 580002, India</p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link href="/terms/" className="text-xs font-bold text-[#FFD60A] underline underline-offset-4">
              Terms of Service →
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
