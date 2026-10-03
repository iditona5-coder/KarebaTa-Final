import React from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";

export interface CommentActionsProps {
  likes?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
}

export function CommentActions({
  likes = 12,
  isLiked = false,
  onLike,
  onReply,
  onDelete,
  isOwner,
}: CommentActionsProps) {
  return (
    <div className="flex flex-row items-center gap-4 mt-1.5 select-none text-xs">
      {/* Like */}
      <button
        type="button"
        onClick={onLike}
        className={`flex flex-row items-center gap-1 transition-colors cursor-pointer active:scale-95 ${
          isLiked ? "text-red-500 font-semibold" : "text-neutral-400 hover:text-neutral-600"
        }`}
        aria-label="Suka komentar"
      >
        <Heart
          className={`w-3.5 h-3.5 ${isLiked ? "fill-red-500 text-red-500" : "text-neutral-400"}`}
        />
        <span className="text-[12px]">{likes}</span>
      </button>

      {/* Balas Komentar */}
      <button
        type="button"
        onClick={onReply}
        className="flex flex-row items-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer active:scale-95"
        aria-label="Balas komentar"
      >
        <MessageCircle className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[12px]">Balas</span>
      </button>

      {/* Hapus Komentar - hanya muncul jika pemilik komentar */}
      {isOwner && (
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-row items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer active:scale-95"
          aria-label="Hapus komentar"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[12px]">Hapus</span>
        </button>
      )}
    </div>
  );
}
