import type React from "react";

const AnimatedGradientBlob: React.FC = () => {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 transform-gpu overflow-visible blur-3xl"
        >
            <div
                style={{
                    clipPath:
                        "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                }}
                className="mx-auto aspect-[1155/678] w-[90vw] max-w-[72rem] animate-gradient opacity-20"
            />
        </div>
    );
};


export default AnimatedGradientBlob;