import React, { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Share2,
  Flag,
  Bookmark,
  Heart,
  Trash2,
  Eye,
} from "lucide-react";
import { PostItem, FeedItem } from "../types";
import { FeedMedia } from "./FeedMedia";
import { ShareBar } from "./ShareBar";

interface PostDetailModalProps {
  post: PostItem | null;
  feedItem?: FeedItem | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onReport?: (id: string, user: string) => void;
  onShare?: (postId: string) => void;
  isSaved?: boolean;
  onToggleSave?: (postId: string) => void;
  isLiked?: boolean;
  likeCount?: number;
  onToggleLike?: (id: string) => void;
  views?: number;
  userName?: string;
  initial?: string;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  feedItem,
  onClose,
  onShowToast,
  isOwner,
  onDelete,
  onReport,
  onShare,
  isSaved = false,
  onToggleSave,
  isLiked = false,
  likeCount = 0,
  onToggleLike,
  views,
  userName = "Kamu",
  initial = "K",
}) => {
  if (!post) return null;

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const postViews = views ?? feedItem?.views ?? post.views ?? 0;

  const isVid =
    post.mediaType === "video" ||
    post.img?.startsWith("data:video") ||
    post.img?.includes(".mp4");

  const authorInit = isOwner
    ? initial
    : (post.user ? post.user.trim().replace(/^@/, "")[0] : post.init || "W").toUpperCase();

  const authorName = isOwner ? userName : (post.user || "warga");
  const postText = post.caption || post.title || "Kabar Warga";
  const postLocation = post.loc || feedItem?.location;
  const postTime = post.createdAt || feedItem?.time || "Baru saja";

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex justify-center overflow-hidden overscroll-none select-none animate-fade-in"
      style={{ overscrollBehavior: "none" }}
    >
      <div
        id="post-fullscreen-modal"
        className="w-full h-full max-w-md bg-white flex flex-col relative overflow-hidden"
      >
        {/* Sticky Header Navigasi (Bersih tanpa icon X) */}
        <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0">
          <button
            id="close-post-fullscreen-btn"
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-neutral-800 hover:text-[#00632B] transition active:scale-95 cursor-pointer font-bold text-sm"
            aria-label="Kembali ke beranda"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-800" />
            <span>Kabar Warga</span>
          </button>
        </header>

        {/* Konten Postingan: TAMPILAN PERSIS SAMA SEPERTI DI FEED */}
        <div
          className="flex-1 bg-white overflow-y-auto overscroll-contain"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          <article
            id={`feed-post-${post.id}`}
            className="w-full bg-white space-y-3 pt-3.5 pb-6"
          >
          {/* Post Header: Nama & Waktu tetap satu baris, tidak turun ke bawah */}
          <div className="px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Foto Profil dengan Cincin Lingkar Kuning Emas */}
              {isOwner ? (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 select-none">
                  {initial}
                </div>
              ) : post.avatar ? (
                <img
                  src={post.avatar}
                  alt={post.user}
                  className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] shadow-xs select-none"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 select-none">
                  {authorInit}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
                  <span className="text-sm font-bold text-neutral-900 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                    {authorName}
                  </span>
                  <span className="text-[11px] text-neutral-300 shrink-0">•</span>
                  <span className="text-[11px] text-neutral-500 font-normal shrink-0 whitespace-nowrap">
                    {postTime}
                  </span>
                </div>
                {postLocation && (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-yellow-500 shrink-0 inline" />
                    <span className="truncate">{postLocation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Icon Simpan di atas kanan postingan */}
            {onToggleSave && (
              <button
                id={`save-detail-header-${post.id}`}
                type="button"
                onClick={() => onToggleSave(post.id)}
                className="p-1.5 text-neutral-400 hover:text-[#00632B] hover:bg-[#00632B]/10 rounded-lg transition cursor-pointer"
                aria-label="Simpan kabar"
              >
                <Bookmark
                  className={`w-4 h-4 transition-transform active:scale-125 ${
                    isSaved
                      ? "fill-[#00632B] text-[#00632B]"
                      : "text-neutral-500 hover:text-[#00632B]"
                  }`}
                />
              </button>
            )}
          </div>

          {/* Media Foto/Video: Vertikal rasio 4:5 dipotong atas bawah, Horizontal rasio asli */}
          <div id={`detail-post-media-${post.id}`} className="w-full">
            <FeedMedia
              src={post.img}
              thumbnail={post.thumbnail}
              alt={postText}
              description={postText}
              mediaType={isVid ? "video" : "image"}
              author={{
                name: isOwner ? userName : (post.name || post.user || "Kawan Warga Kareba"),
                username: isOwner ? userName : (post.user || "kamu"),
                email: post.email || "iditona5@gmail.com",
                location: postLocation || "Kawasan Sekitar",
                time: postTime,
                initials: authorInit,
                avatar: post.avatar,
                description: postText,
              }}
            />
          </div>

          {/* Post Content / Deskripsi di bawah media - Hanya menampilkan selengkapnya jika teks benar-benar panjang/terpotong */}
          <div className="px-4">
            {(() => {
              const isLong = postText.length > 110 || postText.split("\n").length > 2;
              return (
                <div
                  id={`detail-post-desc-container-${post.id}`}
                  onClick={() => {
                    if (isLong) {
                      setIsExpanded((prev) => !prev);
                    }
                  }}
                  className={`select-none ${isLong ? "cursor-pointer group" : ""}`}
                >
                  <h3
                    className={`text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-snug transition-all ${
                      isLong && !isExpanded ? "line-clamp-2" : ""
                    }`}
                  >
                    {postText}
                  </h3>
                  {isLong && (
                    <span className="text-xs font-semibold text-[#00632B] hover:text-[#004f22] mt-1 inline-block">
                      {isExpanded ? "Tampilkan lebih sedikit" : "selengkapnya"}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Post Actions: Suka, Bagikan, Laporkan / Hapus (Persis seperti di feed, bersih tanpa icon X) */}
          <div className="px-4 flex items-center gap-6 text-xs font-semibold text-neutral-600">
            {onToggleLike && (
              <button
                id={`like-detail-btn-${post.id}`}
                type="button"
                onClick={() => onToggleLike(post.id)}
                className={`flex items-center gap-1.5 py-1 transition cursor-pointer ${
                  isLiked ? "text-red-500 font-bold" : "hover:text-red-500 text-neutral-600"
                }`}
                aria-label="Suka"
              >
                <Heart
                  className={`w-4 h-4 transition-transform active:scale-125 ${
                    isLiked ? "fill-red-500 text-red-500" : "text-neutral-500"
                  }`}
                />
                <span>Suka{likeCount > 0 ? ` (${likeCount})` : ""}</span>
              </button>
            )}

            <button
              id={`share-detail-btn-${post.id}`}
              type="button"
              onClick={() => setIsShareOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 py-1 transition cursor-pointer ${
                isShareOpen ? "text-emerald-600 font-bold" : "hover:text-emerald-600 text-neutral-600"
              }`}
              aria-label="Bagikan"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan{feedItem?.shares && feedItem.shares > 0 ? ` (${feedItem.shares})` : ""}</span>
            </button>

            {/* Sesuai aturan kepemilikan:
                - Pada postingan kita sendiri: tombol Hapus.
                - Pada postingan orang lain: tombol Laporkan.
            */}
            {isOwner && onDelete ? (
              <button
                id={`delete-detail-btn-${post.id}`}
                type="button"
                onClick={() => onDelete(post.id)}
                className="flex items-center gap-1.5 py-1 text-neutral-500 hover:text-red-600 transition cursor-pointer"
                aria-label="Hapus kabar"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-red-600">Hapus</span>
              </button>
            ) : !isOwner && onReport ? (
              <button
                id={`report-detail-btn-${post.id}`}
                type="button"
                onClick={() => onReport(post.id, post.user || "kabar_warga")}
                className="flex items-center gap-1.5 py-1 hover:text-red-500 text-neutral-600 transition cursor-pointer"
                aria-label="Laporkan"
              >
                <Flag className="w-4 h-4" />
                <span>Laporkan</span>
              </button>
            ) : null}

            {/* Ikon Tayangan / Dilihat (Fitur Analitik) - Posisi di samping kanan icon Laporkan/Hapus */}
            <div
              className="flex items-center gap-1.5 py-1 text-neutral-500 select-none ml-auto sm:ml-0"
              aria-label={`${postViews.toLocaleString("id-ID")} kali dilihat`}
            >
              <Eye className="w-4 h-4 text-neutral-400" />
              <span>{postViews ? postViews.toLocaleString("id-ID") : 0} dilihat</span>
            </div>
          </div>

          {/* Bar Bagikan Interaktif (FB, WA, Salin) - Persis seperti di Feed */}
          {isShareOpen && (
            <div className="mx-4 mt-2.5 px-3 py-1 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between animate-fade-in">
              <ShareBar
                newsUrl={window.location.href}
                title={postText}
                onShared={() => {
                  if (onShare) onShare(post.id);
                }}
                onShowToast={onShowToast}
              />
            </div>
          )}
        </article>
      </div>
    </div>
  </div>
);
};
