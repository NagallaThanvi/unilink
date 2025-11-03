import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Stats } from "@/components/Stats";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { CallToAction } from "@/components/CallToAction";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CallToAction />
      <Footer />
    </div>
  );
}