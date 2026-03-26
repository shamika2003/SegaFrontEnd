import { useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, X } from "lucide-react";

type Props = {
  src: string;
  alt?: string;
};

export default function HoverFullScreenImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={() => setOpen(true)}
        className="group relative cursor-zoom-in overflow-hidden rounded-xl my-3 w-fit"
      >
        <img
          src={src}
          alt={alt}
          className="rounded-xl max-w-full transition group-hover:scale-105"
        />

        <div className="absolute inset-0 flex bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <ZoomIn className="text-white w-8 h-8" />
        </div>
      </div>

      {/* FULLSCREEN VIA PORTAL */}
      {open &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[95vh] max-w-[95vw] rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={() => setOpen(false)}
              className="absolute top-6 right-6 text-white"
            >
              <X size={30} />
            </button>
          </div>,
          document.body
        )}
    </>
  );
}