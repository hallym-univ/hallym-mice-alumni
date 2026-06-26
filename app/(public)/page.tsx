import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { StatsTeaser } from "@/components/landing/StatsTeaser";
import { DirectoryPreview } from "@/components/landing/DirectoryPreview";
import { FeatureSections } from "@/components/landing/FeatureSections";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingThemeShell } from "@/components/landing/LandingThemeShell";

/**
 * 랜딩 (§11.1) — 블랙 캔버스 에디토리얼 쇼케이스.
 * 자체 다크/라이트 테마(앱 토큰과 분리).
 */
export const revalidate = 60;

const MARQUEE = [
  "동문 찾기",
  "커피챗",
  "오픈카톡",
  "구인구직",
  "동문 인터뷰",
  "네트워킹",
  "기수",
  "분야 태그",
];

export default function LandingPage() {
  return (
    <LandingThemeShell>
      <main className="bg-black text-white">
        <Hero />
        <div className="border-y border-white/10 bg-black py-6">
          <Marquee items={MARQUEE} />
        </div>
        <StatsTeaser />
        <DirectoryPreview />
        <FeatureSections />
        <LandingCTA />
        <LandingFooter />
      </main>
    </LandingThemeShell>
  );
}
