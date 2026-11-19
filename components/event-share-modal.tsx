'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSiteOrigin } from '@/lib/site-url';
import { formatDay, formatRange } from '@/lib/time';
import type { FeedEvent } from '@/lib/live-store';
import type { Event } from '@/lib/types';

const CATEGORY_BG: Record<string, string> = {
  cultural: '#FF4FD8',
  tech: '#22D3EE',
  workshop: '#FF9F43',
  talk: '#9B6CFF',
  sports: '#FFD60A',
  fun: '#FFE14D',
  official: '#3A3549',
};

interface EventShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FeedEvent | Event;
  venueName?: string | null;
}

export function EventShareModal({
  isOpen,
  onClose,
  event,
  venueName,
}: EventShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const origin = getSiteOrigin();
  const eventUrl = `${origin}/event/?id=${event.id}`;
  const dayStr = formatDay(event.starts_at);
  const rangeStr = formatRange(event.starts_at, event.ends_at);
  const displayVenue =
    venueName ||
    ('venue_name' in event ? event.venue_name : null) ||
    'Campus Venue (TBA)';
  const catColor = CATEGORY_BG[event.category] || '#FFD60A';

  // Generate QR code for the event URL
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(eventUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#12091E',
        light: '#FFFFFF',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR', err));
  }, [isOpen, eventUrl]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Render high-res card onto canvas for sharing and download
  async function generateCardCanvas(): Promise<HTMLCanvasElement | null> {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGrad.addColorStop(0, '#1E1030');
    bgGrad.addColorStop(0.5, '#150A24');
    bgGrad.addColorStop(1, '#0C0517');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 720, 1000);

    // 2. Decorative outer border with rounded corners
    ctx.save();
    ctx.strokeStyle = '#4A2A70';
    ctx.lineWidth = 4;
    roundRect(ctx, 16, 16, 688, 968, 32);
    ctx.stroke();
    ctx.restore();

    // 3. Top accent gradient line
    const accentGrad = ctx.createLinearGradient(60, 0, 660, 0);
    accentGrad.addColorStop(0, '#FF4FD8');
    accentGrad.addColorStop(0.5, '#FFD60A');
    accentGrad.addColorStop(1, '#22D3EE');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(60, 24, 600, 4);

    // 4. Logo
    let logoDrawn = false;
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = '/brand/fiesta26-logo.png';
      });
      const logoAspect = logoImg.width / logoImg.height;
      const targetHeight = 64;
      const targetWidth = targetHeight * logoAspect;
      ctx.drawImage(
        logoImg,
        (720 - targetWidth) / 2,
        48,
        targetWidth,
        targetHeight
      );
      logoDrawn = true;
    } catch {
      // Fallback text if logo fails to load
      ctx.fillStyle = '#FFE866';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("FIESTA '26", 360, 85);
    }

    // 5. Subtitle
    ctx.fillStyle = '#D6CEEC';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'SDMCET DHARWAD · INTRA COLLEGE CULTURAL FEST',
      360,
      logoDrawn ? 134 : 124
    );

    // 6. Category pill
    const pillY = 164;
    const catText = event.category.toUpperCase();
    ctx.font = 'bold 15px sans-serif';
    const catWidth = ctx.measureText(catText).width + 36;
    ctx.fillStyle = catColor;
    roundRect(ctx, (720 - catWidth) / 2, pillY, catWidth, 30, 15);
    ctx.fill();

    ctx.fillStyle = '#12091E';
    ctx.textAlign = 'center';
    ctx.fillText(catText, 360, pillY + 20);

    // 7. Event Title (with word-wrap)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center';
    const titleLines = wrapText(ctx, event.title, 600);
    let titleY = 240;
    for (let i = 0; i < Math.min(titleLines.length, 3); i++) {
      ctx.fillText(titleLines[i], 360, titleY);
      titleY += 44;
    }

    // 8. Event Date, Time & Venue
    const metaY = Math.max(titleY + 16, 335);
    ctx.fillStyle = '#FFD60A';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📅  ${dayStr.toUpperCase()}`, 360, metaY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${rangeStr} IST`, 360, metaY + 32);

    ctx.fillStyle = '#FFE866';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`📍 ${displayVenue}`, 360, metaY + 64);

    // 9. QR Code Box (white card)
    const qrBoxY = metaY + 76;
    const qrBoxSize = 300;
    const qrBoxX = (720 - qrBoxSize) / 2;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 48, 24);
    ctx.fill();
    ctx.restore();

    // Draw QR code inside white card
    if (qrDataUrl) {
      try {
        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => reject();
          qrImg.src = qrDataUrl;
        });
        ctx.drawImage(qrImg, qrBoxX + 25, qrBoxY + 20, 250, 250);
      } catch (e) {
        console.error('Failed to draw QR image on canvas', e);
      }
    }

    ctx.fillStyle = '#12091E';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VIEW & REGISTER', 360, qrBoxY + 310);

    // 10. Card Footer
    ctx.fillStyle = '#9C97B0';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fiesta’26 Live · fiesta26.pages.dev', 360, 940);

    // Bottom accent line
    ctx.fillStyle = accentGrad;
    ctx.fillRect(160, 960, 400, 3);

    return canvas;
  }

  // Handle Share (tries native file share, falls back gracefully)
  async function handleShareCard() {
    try {
      setIsGenerating(true);
      const canvas = await generateCardCanvas();
      if (!canvas) throw new Error('Canvas not available');

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('Failed to create card image');

      const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_');
      const file = new File([blob], `Fiesta26_${safeTitle}_Card.png`, {
        type: 'image/png',
      });

      const shareText = `Check out "${event.title}" at Fiesta'26 SDMCET!\n📅 ${dayStr}, ${rangeStr}\n📍 ${displayVenue}\n\n👉 Event details & registration: ${eventUrl}`;

      // Check if browser supports sharing files (iOS Safari, Android Chrome, etc.)
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${event.title} · Fiesta'26`,
          text: shareText,
          files: [file],
        });
        toast.success('Card shared successfully!');
        return;
      }

      // If file sharing is not supported, try text/url share
      if (navigator.share) {
        await navigator.share({
          title: `${event.title} · Fiesta'26`,
          text: shareText,
          url: eventUrl,
        });
        toast.success('Event shared!');
        return;
      }

      // If navigator.share is completely unavailable (desktop browser), trigger download and copy link
      await handleDownloadCard();
      await handleCopyLink();
      toast.success('Card downloaded & event link copied to clipboard!');
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share failed', err);
        // Fallback: copy link and notify
        await handleCopyLink();
      }
    } finally {
      setIsGenerating(false);
    }
  }

  // Handle Download Card
  async function handleDownloadCard() {
    try {
      setIsGenerating(true);
      const canvas = await generateCardCanvas();
      if (!canvas) throw new Error('Canvas not available');

      const dataUrl = canvas.toDataURL('image/png');
      const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_');
      const link = document.createElement('a');
      link.download = `Fiesta26_${safeTitle}_Card.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Card image saved to your device!');
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Could not download image. Link copied instead!');
      await handleCopyLink();
    } finally {
      setIsGenerating(false);
    }
  }

  // Handle WhatsApp Share
  function handleWhatsAppShare() {
    const text = `*${event.title}* at *Fiesta'26 SDMCET*! 🎨✨\n\n📅 *When:* ${dayStr}, ${rangeStr} IST\n📍 *Venue:* ${displayVenue}\n\nScan QR or click below to view event details & register:\n👉 ${eventUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  // Handle Copy Link
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setIsCopied(true);
      toast.success('Event link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Event Card"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden canvas for PNG export */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative my-auto flex w-full max-w-[420px] flex-col rounded-[28px] border border-[#3B2758] bg-[#140B20] p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Header with Title & Close button */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#FFD60A]/15 text-[#FFE866]">
              <Sparkles className="size-4" />
            </div>
            <h2 className="font-heading text-base font-black text-white">
              Event Share Card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex size-8 items-center justify-center rounded-full bg-[#1F1230] text-[#BDB8CF] hover:bg-[#34224F] hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* The Visual Share Card Preview */}
        <div className="relative overflow-hidden rounded-[22px] border-2 border-[#4A2A70] bg-gradient-to-b from-[#1F1230] via-[#160B24] to-[#0E0618] p-4 text-center shadow-inner">
          {/* Top Rainbow Accent */}
          <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#FF4FD8] via-[#FFD60A] to-[#22D3EE]" />

          {/* Logo & College Subtitle */}
          <div className="pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/fiesta26-logo.png"
              alt="Fiesta'26 Logo"
              className="mx-auto h-11 w-auto object-contain drop-shadow"
            />
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FFE866]">
              SDMCET Dharwad · Fest 2026
            </p>
          </div>

          <div className="my-2.5 h-px w-full bg-gradient-to-r from-transparent via-[#FF4FD8]/30 to-transparent" />

          {/* Category Pill */}
          <div className="inline-block">
            <span
              className="inline-block rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#12091E]"
              style={{ backgroundColor: catColor }}
            >
              {event.category}
            </span>
          </div>

          {/* Event Title */}
          <h3 className="mt-1.5 font-heading text-lg sm:text-xl font-black leading-snug tracking-tight text-white line-clamp-2">
            {event.title}
          </h3>

          {/* Date, Time & Venue */}
          <div className="mt-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-[#FFD60A]/40 bg-[#FFD60A]/15 px-2.5 py-0.5 text-xs font-black text-[#FFE866]">
                <Calendar className="size-3 text-[#FFD60A]" />
                {dayStr}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-[#F4F2FA]">
                <Clock className="size-3 text-[#CFCBDD]" />
                {rangeStr} IST
              </span>
            </div>
            <p className="flex items-center justify-center gap-1 text-xs font-bold text-[#FFE866]">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate max-w-[280px]">{displayVenue}</span>
            </p>
          </div>

          {/* QR Code Container */}
          <div className="mt-3 inline-block rounded-2xl bg-white p-2.5 shadow-lg">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code for ${event.title}`}
                className="size-36 sm:size-40 object-contain mx-auto"
              />
            ) : (
              <div className="flex size-36 sm:size-40 items-center justify-center text-xs text-gray-500">
                Generating QR…
              </div>
            )}
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-[#12091E]">
              Scan to view &amp; register
            </p>
          </div>

          {/* Footer watermark */}
          <div className="mt-3 flex items-center justify-between border-t border-[#3B2758]/60 pt-2 text-[10px] font-semibold text-[#9C97B0]">
            <span>fiesta26.pages.dev</span>
            <span className="text-[#FFE866]">Official Event Pass</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          {/* Primary CTA: Native Share / Send Card */}
          <button
            type="button"
            onClick={handleShareCard}
            disabled={isGenerating}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD60A] to-[#FFE14D] px-4 text-xs font-black uppercase tracking-wider text-[#12091E] shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            <Share2 className="size-4" />
            <span>{isGenerating ? 'Preparing card…' : 'Share Card Image'}</span>
          </button>

          {/* Secondary Grid: Save Image, WhatsApp, Copy Link */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isGenerating}
              className="flex h-10 flex-col items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-2 text-[11px] font-bold text-[#E5E0F5] hover:border-[#FFD60A]/50 hover:bg-[#2A1842] transition-colors cursor-pointer"
            >
              <Download className="size-3.5 mb-0.5 text-[#FFE866]" />
              <span>Save Card</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex h-10 flex-col items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-2 text-[11px] font-bold text-[#E5E0F5] hover:border-[#25D366]/50 hover:bg-[#2A1842] transition-colors cursor-pointer"
            >
              <MessageCircle className="size-3.5 mb-0.5 text-[#25D366]" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex h-10 flex-col items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-2 text-[11px] font-bold text-[#E5E0F5] hover:border-[#FF4FD8]/50 hover:bg-[#2A1842] transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="size-3.5 mb-0.5 text-[#22D3EE]" />
                  <span className="text-[#22D3EE]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mb-0.5 text-[#BDB8CF]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas helper to draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Canvas helper to wrap text into multiple lines
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
