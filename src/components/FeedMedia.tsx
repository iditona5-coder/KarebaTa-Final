import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Volume2,
  VolumeX,
  Loader2,
  Video,
} from "lucide-react";
import { extractVideoThumbnail } from "../utils/thumbnail";

export interface MediaAuthorInfo {
  avatar?: string;
  initials?: string;
  name?: string;
  username?: string;
  email?: string;
  location?: string;
  time?: string;
  description?: string;
}

interface FeedMediaProps {
  src: string;
  thumbnail?: string;
  alt?: string;
  description?: string;
  mediaType?: "image" | "video";
  className?: string;
  author?: MediaAuthorInfo;
}

export const FeedMedia: React.FC<FeedMediaProps> = ({
  src,
  thumbnail,
  alt = "Konten media",
  mediaType,
  className = "",
}) => {
  // Tentukan apakah tipe media adalah video
  const isVideo =
    mediaType === "video" ||
    src.endsWith(".mp4") ||
    src.endsWith(".webm") ||
    src.endsWith(".mov") ||
    src.startsWith("data:video/") ||
    src.includes("video");

  // Orientasi media: default "vertical" (rasio 4:5 standar) atau "horizontal" (rasio 16:9)
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Safety timer: Pastikan indikator loading tidak berputar terus menerus jika jaringan lambat / offline
  useEffect(() => {
    setIsLoading(true);
    setHasVideoError(false);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [src]);

  // Poster / Thumbnail khusus video agar tidak blank di HP / browser
  const [posterUrl, setPosterUrl] = useState<string | undefined>(thumbnail);

  useEffect(() => {
    if (thumbnail) {
      setPosterUrl(thumbnail);
      return;
    }
    if (isVideo && src) {
      let isCancelled = false;
      extractVideoThumbnail(src).then((extracted) => {
        if (!isCancelled && extracted) {
          setPosterUrl(extracted);
        }
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [thumbnail, isVideo, src]);

  // Helper aman untuk memutar (play) dan menjeda (pause) video tanpa error Promise browser
  const safePlay = (video: HTMLVideoElement | null) => {
    if (!video) return;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err.name === "AbortError" || err.name === "NotAllowedError") {
          return;
        }
        console.warn("Video playback safely handled:", err);
      });
    }
  };

  const safePause = (video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
      if (!video.paused) {
        video.pause();
      }
    } catch {
      // Abaikan jika sudah dalam kondisi pause
    }
  };

  // Efek: Berhenti berjalan (pause) otomatis ketika media di-scroll keluar pandangan
  useEffect(() => {
    if (!isVideo) return;

    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && currentVideo && !currentVideo.paused) {
            safePause(currentVideo);
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(currentVideo);

    return () => {
      observer.disconnect();
    };
  }, [isVideo]);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = e.currentTarget;
    if (videoWidth && videoHeight) {
      if (videoHeight >= videoWidth) {
        setOrientation("vertical");
      } else {
        setOrientation("horizontal");
      }
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      if (naturalHeight >= naturalWidth) {
        setOrientation("vertical");
      } else {
        setOrientation("horizontal");
      }
    }
  };

  // Proteksi anti-play/anti-click saat scrolling pada perangkat sentuh (touchscreen)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchScrollingRef = useRef(false);
  const blockClickUntilRef = useRef(0);

  const handleMediaTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isTouchScrollingRef.current = false;
    }
  };

  const handleMediaTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current && e.touches.length > 0) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 6) {
        isTouchScrollingRef.current = true;
        blockClickUntilRef.current = Date.now() + 400;
      }
    }
  };

  const handleMediaTouchEnd = () => {
    if (isTouchScrollingRef.current) {
      blockClickUntilRef.current = Date.now() + 400;
      setTimeout(() => {
        isTouchScrollingRef.current = false;
      }, 400);
    }
  };

  const toggleVideoPlay = () => {
    if (isTouchScrollingRef.current || Date.now() < blockClickUntilRef.current) return;
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      safePlay(videoRef.current);
    } else {
      safePause(videoRef.current);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTouchScrollingRef.current || Date.now() < blockClickUntilRef.current) return;
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // 1. KONTEN VIDEO
  if (isVideo) {
    const isVertical = orientation === "vertical";
    return (
      <div
        className={`w-full ${
          isVertical ? "aspect-[4/5]" : "w-full"
        } relative overflow-hidden bg-neutral-100 flex items-center justify-center select-none ${className}`}
        style={{ touchAction: "pan-y" }}
        onClick={toggleVideoPlay}
        onTouchStart={handleMediaTouchStart}
        onTouchMove={handleMediaTouchMove}
        onTouchEnd={handleMediaTouchEnd}
      >
        <video
          ref={videoRef}
          src={src}
          poster={posterUrl || thumbnail}
          preload="metadata"
          className={
            isVertical
              ? "w-full h-full object-cover object-center cursor-pointer block"
              : "w-full h-auto object-cover object-center cursor-pointer block"
          }
          playsInline
          loop
          muted={isMuted}
          onLoadedMetadata={handleVideoMetadata}
          onLoadedData={() => {
            setIsLoading(false);
            setIsBuffering(false);
          }}
          onError={() => {
            setIsLoading(false);
            setIsBuffering(false);
            setHasVideoError(true);
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsLoading(false);
            setHasVideoError(false);
            setIsPlaying(true);
          }}
          onCanPlay={() => {
            setIsBuffering(false);
            setIsLoading(false);
            setHasVideoError(false);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Tampilan pesan bila video rusak atau URL blob temporer */}
        {hasVideoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-white p-4 text-center z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-2 border border-white/10">
              <Video className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-xs font-semibold text-neutral-200">Video tidak dapat dimuat</p>
            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[240px]">
              URL video telah kedaluwarsa atau berkas belum selesai diunggah.
            </p>
          </div>
        )}

        {/* Indikator Loading Tajeng cina saat buffering / jaringan lambat */}
        {(isLoading || isBuffering) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-2xs z-20 pointer-events-none animate-fade-in">
            <div className="flex flex-col items-center gap-2 bg-black/60 px-4 py-2.5 rounded-2xl border border-white/15 shadow-lg">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="text-white text-xs font-semibold tracking-wide flex items-center gap-1">
                Tajeng cina...
              </span>
            </div>
          </div>
        )}

        {/* Kontrol Play/Pause Overlay di tengah */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && !isLoading && !isBuffering && (
            <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center text-white shadow-xl pointer-events-auto cursor-pointer transition transform hover:scale-110 active:scale-95 border border-white/20">
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </div>
          )}
        </div>

        {/* Tombol Audio Mute / Unmute Inline */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition z-10 cursor-pointer"
          aria-label={isMuted ? "Aktifkan suara" : "Bisukan"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  // 2. KONTEN FOTO
  const isVertical = orientation === "vertical";
  return (
    <div
      className={`w-full ${
        isVertical ? "aspect-[4/5]" : "w-full"
      } relative overflow-hidden bg-neutral-100 select-none ${className}`}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleMediaTouchStart}
      onTouchMove={handleMediaTouchMove}
      onTouchEnd={handleMediaTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onLoad={handleImageLoad}
        onError={() => setIsLoading(false)}
        className={
          isVertical
            ? "w-full h-full object-cover object-center block pointer-events-none select-none"
            : "w-full h-auto object-cover object-center block pointer-events-none select-none"
        }
        style={{ WebkitTouchCallout: "none" }}
        loading="lazy"
      />

      {/* Indikator Loading Tajeng cina saat foto belum selesai dimuat */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100/80 backdrop-blur-2xs z-10 pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center gap-2 bg-neutral-900/85 px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-white text-xs font-semibold tracking-wide">
              Tajeng cina...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
