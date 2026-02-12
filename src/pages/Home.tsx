import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import AnimatedGradientBlob from "../components/ui/AnimatedGradientBlob";

export default function Home() {
    return (
        <main className="relative bg-[#020617]">
            <Navbar />

            <section className="relative z-10 pt-16">
                <Hero />
            </section>

            <section className="h-screen relative z-10">
                <AnimatedGradientBlob />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-green-300 drop-shadow-[0_0_30px_rgba(34,211,238,0.7)]">
                        Sega AI Gaming Labs
                    </h1>

                    <p className="mt-6 max-w-xl text-green-200/80 text-lg">
                        Building next-generation AI-powered gaming experiences
                    </p>

                    <button
                        className="mt-10 px-8 py-3 rounded-lg text-cyan-900 font-semibold bg-green-400 shadow-[0_0_25px_rgba(34,211,238,0.8)] hover:shadow-[0_0_45px_rgba(34,211,238,1)] transition"
                    >
                        Explore Tech
                    </button>
                </div>
            </section>

            <section className="h-screen relative z-10">
            </section>
        </main>
    );
}