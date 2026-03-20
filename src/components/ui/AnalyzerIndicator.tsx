function AnalyzerIndicator() {
    return (
        <div className="relative flex items-center justify-center gap-2 w-36 h-8 rounded-xl overflow-hidden animate-futuristic-bg">
            {/* Frosted glass overlay */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-xl" />

            {/* Neon scan line */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="scan-line absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40" />
            </div>

            {/* Particle field */}
            <div className="absolute inset-0 particles pointer-events-none" />

            {/* Text with shimmering effect */}
            <span className="relative z-10 text-xl font-medium text-cyan-200 tracking-wider shimmer">
                Analyzing
            </span>
        </div>
    );
}

export default AnalyzerIndicator;