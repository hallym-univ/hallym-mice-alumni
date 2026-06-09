import { Hero } from "@/components/landing/Hero";
import { ValueProps } from "@/components/landing/ValueProps";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StatsTeaser } from "@/components/landing/StatsTeaser";
import { GalleryTeaser } from "@/components/landing/GalleryTeaser";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * 랜딩 (§11.1) — 데스크톱 풀 에디토리얼.
 * 정적 Server Component(데이터 없음). 앱의 모바일 우선 480px 규칙을 깨는 유일한 화면.
 * 섹션 컴포넌트를 조합만 한다(각 섹션이 자체 reveal/레이아웃 책임).
 */
export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      <Hero />
      <ValueProps />
      <HowItWorks />
      <StatsTeaser />
      <GalleryTeaser />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
