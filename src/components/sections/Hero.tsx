import herobg from "../../assets/image1.png";

export default function Hero() {
    return (
        <>
            <section className="relative h-screen overflow-hidden">
                {/* IMAGE LAYER */}
                <div className="absolute inset-y-0 left-0 sm:w-[70%]">
                    <img
                        src={herobg}
                        alt=""
                        className=" h-full w-full object-cover mask-image"
                    />
                </div>

                {/* CONTENT */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-green-300 drop-shadow-[0_0_30px_rgba(34,211,238,0.7)]">
                        Sega AI Gaming Labs
                    </h1>
                </div>
            </section>


        </>

    );
}