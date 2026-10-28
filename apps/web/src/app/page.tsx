import { AskNotarik } from "@/components/landing/AskNotarik";
import { CategoryStrip } from "@/components/landing/CategoryStrip";
import { Cta } from "@/components/landing/Cta";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Nav } from "@/components/landing/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CategoryStrip />
        <Features />
        <HowItWorks />
        <AskNotarik />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
