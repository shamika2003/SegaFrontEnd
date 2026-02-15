// src/components/LinkPreview.tsx
import { useEffect, useState } from "react";

type Preview = {
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  url: string;
};

type Props = {
  href: string;
};

export default function LinkPreview({ href }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ---- 1️⃣ fetch preview data ---------------------------------
  useEffect(() => {
    // Encode the URL for safe query‑string transmission
    const endpoint = `/api/link-preview?url=${encodeURIComponent(href)}`;
    // If you prefer a 3rd‑party service, swap the line above for:
    // const endpoint = `https://api.microlink.io?url=${encodeURIComponent(href)}&fields=image,description,title`;
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPreview(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [href]);

  // ---- 2️⃣ UI -------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 animate-pulse">
        <div className="w-12 h-8 bg-gray-300 rounded" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-300 rounded w-3/4" />
          <div className="h-2 bg-gray-300 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // If we couldn’t fetch a preview, just render a normal link
  if (error || !preview) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-indigo-400 hover:underline break-all"
      >
        {href}
      </a>
    );
  }

  // ---- 3️⃣ The nice preview card -----------------------------
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="block border border-white/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white/5 dark:bg-black/30"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title ?? "preview"}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-3">
        {preview.title && (
          <h4 className="font-semibold text-white truncate">{preview.title}</h4>
        )}
        {preview.description && (
          <p className="text-sm text-gray-300 mt-1 line-clamp-2">
            {preview.description}
          </p>
        )}
        {preview.site_name && (
          <p className="text-xs text-gray-500 mt-2">{preview.site_name}</p>
        )}
      </div>
    </a>
  );
}