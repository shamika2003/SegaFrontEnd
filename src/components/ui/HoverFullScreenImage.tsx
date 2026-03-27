import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, ZoomIn } from "lucide-react";

type Props = {
  src: string;
  alt?: string;
};

export default function HoverFullScreenImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Thumbnail */}
      <span className="group relative inline-block rounded-xl my-3 w-fit">

        <img
          src={src}
          alt={alt}
          className="rounded-xl max-w-full transition group-hover:scale-105"
        />

        {/* Buttons (hidden until hover) */}
        <div className="absolute top-0 -right-12 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">

          <button
            onClick={() => setOpen(true)}
            className="p-2 dark:hover:bg-black/10 hover:bg-black/10 rounded-lg cursor-zoom-in">
            <ZoomIn className="text-black/60 dark:text-white/80 w-5 h-5" />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 dark:hover:bg-black/10 hover:bg-black/10 rounded-lg">
            <Download className="text-black/60 dark:text-white/80 w-5 h-5" />
          </button>

        </div>

      </span>

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