import { Hero } from "@/components/lp/Hero";
import { HowItWorks } from "@/components/lp/HowItWorks";
import { Safety } from "@/components/lp/Safety";
import { UseCases } from "@/components/lp/UseCases";
import { Faq } from "@/components/lp/Faq";
import { FinalCta } from "@/components/lp/FinalCta";
import { Link } from "wouter";

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-white/30 selection:text-white font-sans antialiased">
            {/* Minimal Header */}
            <header className="fixed top-0 w-full z-50 mix-blend-difference px-6 py-6 md:px-12 flex justify-between items-center bg-[#050505]/0 backdrop-blur-[2px]">
                <div className="text-xl font-bold tracking-tighter">silentmemo</div>
                <nav className="flex gap-6 items-center text-sm font-medium">
                    <Link href="/login">
                        <span className="cursor-pointer hover:opacity-70 transition-opacity">Login</span>
                    </Link>
                    <Link href="/create">
                        <span className="cursor-pointer bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-colors">Start</span>
                    </Link>
                </nav>
            </header>

            <main>
                <Hero />
                <HowItWorks />
                <Safety />
                <UseCases />
                <Faq />
                <FinalCta />
            </main>
        </div>
    );
}
