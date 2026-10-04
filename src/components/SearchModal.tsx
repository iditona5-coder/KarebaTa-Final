import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  SearchX,
  X,
  MapPin,
  User,
  Newspaper,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { FeedItem, PostItem } from "../types";

export type SearchFilterCategory = "all" | "account" | "location" | "news";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  feed: FeedItem[];
  posts: PostItem[];
  onSelectResult?: (text: string, category?: SearchFilterCategory) => void;
  query?: string;
  setQuery?: (q: string) => void;
  activeCategory?: SearchFilterCategory;
  onSelectCategory?: (category: SearchFilterCategory) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  feed,
  posts,
  onSelectResult,
  query: externalQuery,
  setQuery: externalSetQuery,
  activeCategory: externalCategory,
  onSelectCategory: externalSetCategory,
}) => {
  const [internalQuery, setInternalQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState<SearchFilterCategory>("all");

  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = (val: string) => {
    if (externalSetQuery) {
      externalSetQuery(val);
    } else {
      setInternalQuery(val);
    }
  };

  const activeCategory = externalCategory !== undefined ? externalCategory : internalCategory;
  const setActiveCategory = (cat: SearchFilterCategory) => {
    if (externalSetCategory) {
      externalSetCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const isIntegratedHeader = externalQuery !== undefined;

  // Keyboard navigation escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (text: string, category: SearchFilterCategory = "all") => {
    setActiveCategory(category);
    if (onSelectResult) {
      onSelectResult(text, category);
    }
    onClose();
  };

  const rawCleanQuery = query.trim().toLowerCase();
  const searchAccountQuery = rawCleanQuery.replace(/^@+/, "");
  const searchLocationQuery = rawCleanQuery.replace(/^lokasi:\s*/i, "");
  const searchNewsQuery = rawCleanQuery.replace(/^berita:\s*/i, "");

  // 1. HASIL: NAMA AKUN WARGA (Menghitung juga berapa banyak postingan milik akun tersebut)
  const matchedAccounts = useMemo(() => {
    if (!searchAccountQuery) return [];
    const map = new Map<string, { user: string; name: string; init: string; postCount: number }>();

    feed.forEach((item) => {
      const u = (item.user || "").toLowerCase().replace(/^@+/, "");
      const n = (item.name || "").toLowerCase();
      if (u.includes(searchAccountQuery) || n.includes(searchAccountQuery)) {
        const cleanUser = item.user.replace(/^@+/, "");
        const existing = map.get(cleanUser);
        if (existing) {
          existing.postCount += 1;
        } else {
          map.set(cleanUser, {
            user: cleanUser,
            name: item.name || cleanUser,
            init: item.init || cleanUser.charAt(0).toUpperCase(),
            postCount: 1,
          });
        }
      }
    });

    posts.forEach((item) => {
      const userStr = (item.user || "").replace(/^@+/, "");
      const u = userStr.toLowerCase();
      const n = (item.name || "").toLowerCase();
      if (userStr && (u.includes(searchAccountQuery) || n.includes(searchAccountQuery))) {
        const existing = map.get(userStr);
        if (existing) {
          existing.postCount += 1;
        } else {
          map.set(userStr, {
            user: userStr,
            name: item.name || userStr,
            init: item.init || userStr.charAt(0).toUpperCase(),
            postCount: 1,
          });
        }
      }
    });

    return Array.from(map.values()).slice(0, 6);
  }, [searchAccountQuery, feed, posts]);

  // 2. HASIL: LOKASI KABAR
  const matchedLocations = useMemo(() => {
    if (!searchLocationQuery) return [];
    const locMap = new Map<string, number>();

    feed.forEach((item) => {
      if (item.location && item.location.toLowerCase().includes(searchLocationQuery)) {
        locMap.set(item.location, (locMap.get(item.location) || 0) + 1);
      }
    });

    posts.forEach((item) => {
      if (item.loc && item.loc.toLowerCase().includes(searchLocationQuery)) {
        locMap.set(item.loc, (locMap.get(item.loc) || 0) + 1);
      }
    });

    return Array.from(locMap.entries())
      .map(([loc, count]) => ({ loc, count }))
      .slice(0, 6);
  }, [searchLocationQuery, feed, posts]);

  // 3. HASIL: BERITA & KABAR WARGA
  const matchedPosts = useMemo(() => {
    if (!searchNewsQuery) return [];
    const results: Array<{
      id: string;
      title: string;
      snippet: string;
      location?: string;
      img?: string;
      thumbnail?: string;
      author: string;
      time: string;
    }> = [];

    feed.forEach((item) => {
      const t = (item.text || "").toLowerCase();
      if (t.includes(searchNewsQuery)) {
        results.push({
          id: item.id,
          title: item.text.slice(0, 50) + (item.text.length > 50 ? "..." : ""),
          snippet: item.text,
          location: item.location,
          img: item.img,
          thumbnail: item.thumbnail,
          author: item.user,
          time: item.time,
        });
      }
    });

    posts.forEach((item) => {
      const titleMatch = (item.title || "").toLowerCase().includes(searchNewsQuery);
      const capMatch = (item.caption || "").toLowerCase().includes(searchNewsQuery);
      if ((titleMatch || capMatch) && !results.some((r) => r.id === item.id)) {
        results.push({
          id: item.id,
          title: item.title,
          snippet: item.caption || item.title,
          location: item.loc,
          img: item.img,
          thumbnail: item.thumbnail,
          author: item.user || "kabar_warga",
          time: item.createdAt || "Terkini",
        });
      }
    });

    return results.slice(0, 6);
  }, [searchNewsQuery, feed, posts]);

  const showAccounts = activeCategory === "all" || activeCategory === "account";
  const showLocations = activeCategory === "all" || activeCategory === "location";
  const showPosts = activeCategory === "all" || activeCategory === "news";

  const hasAnyResult =
    (showAccounts && matchedAccounts.length > 0) ||
    (showLocations && matchedLocations.length > 0) ||
    (showPosts && matchedPosts.length > 0);

  if (!isOpen) return null;

  return (
    <div
      id="search-modal-overlay"
      className={
        isIntegratedHeader
          ? "fixed inset-x-0 bottom-0 top-[52px] sm:top-[56px] z-40 bg-white flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in"
          : "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col max-w-md mx-auto animate-fade-in"
      }
    >
      {/* Header jika dalam mode mandiri */}
      {!isIntegratedHeader && (
        <header className="p-3 sm:p-4 bg-white border-b border-neutral-200 flex items-center gap-2.5 shrink-0 shadow-xs">
          <div className="flex-1 flex items-center gap-2.5 bg-neutral-100 rounded-full px-3.5 py-2 border border-neutral-200 focus-within:border-[#00632B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00632B]/20 transition">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              id="search-input-field"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleSelect(query.trim(), activeCategory);
                }
              }}
              placeholder={
                activeCategory === "account"
                  ? "Ketik nama akun (@username)..."
                  : activeCategory === "location"
                  ? "Ketik nama lokasi / tempat..."
                  : activeCategory === "news"
                  ? "Ketik kata kunci berita / topik..."
                  : "Cari akun, lokasi, atau berita..."
              }
              className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200 transition cursor-pointer"
                aria-label="Hapus ketikan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            id="search-modal-close-btn"
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer shrink-0"
          >
            Batal
          </button>
        </header>
      )}

      {/* Konten Modal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
        {query.trim() === "" ? (
          /* Petunjuk Pencarian Terarah Saja */
          <section className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/90 text-xs text-neutral-600 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 pb-1 border-b border-neutral-200/60">
              <SlidersHorizontal className="w-4 h-4 text-[#00632B]" />
              <p className="font-bold text-neutral-800 text-sm">Petunjuk Pencarian Terarah:</p>
            </div>
            <div className="space-y-2.5 text-xs text-neutral-600 pt-0.5">
              <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-[#00632B]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[#00632B]" />
                </div>
                <div>
                  <strong className="text-neutral-900 block text-xs">Filter Akun:</strong>
                  <span className="text-neutral-500 text-[11px] leading-relaxed">Hanya postingan kabar milik akun warga tersebut yang akan ditampilkan.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <strong className="text-neutral-900 block text-xs">Filter Lokasi:</strong>
                  <span className="text-neutral-500 text-[11px] leading-relaxed">Semua kabar dari lokasi atau wilayah yang dicari akan dikumpulkan serentak.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Newspaper className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <strong className="text-neutral-900 block text-xs">Filter Berita:</strong>
                  <span className="text-neutral-500 text-[11px] leading-relaxed">Menampilkan semua kabar peristiwa warga dengan judul, isi atau topik yang cocok.</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Tampilan Pengelompokan Hasil: Berita, Lokasi, dan Nama Akun */
          <div className="space-y-5">
            {!hasAnyResult ? (
              <div className="py-10 px-3 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 mx-auto flex items-center justify-center text-neutral-400">
                  <SearchX className="w-7 h-7 text-neutral-500" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900">
                    Tidak ada hasil untuk &ldquo;{query}&rdquo;
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    {activeCategory === "account"
                      ? "Tidak ditemukan akun warga dengan nama tersebut."
                      : activeCategory === "location"
                      ? "Tidak ditemukan postingan dengan lokasi tersebut."
                      : activeCategory === "news"
                      ? "Tidak ditemukan kabar berita dengan kata kunci tersebut."
                      : "Tidak ditemukan berita, lokasi, ataupun nama akun yang cocok."}
                  </p>
                </div>

                {activeCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Cari di semua kategori</span>
                  </button>
                )}

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-left text-xs text-neutral-600 space-y-1.5 max-w-xs mx-auto">
                  <p className="font-semibold text-neutral-800">Saran Pencarian:</p>
                  <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
                    <li>Periksa kembali ejaan kata kunci Anda</li>
                    <li>Gunakan kata kunci lebih umum (contoh: <em>Pantai</em>, <em>Talise</em>, <em>Warga</em>)</li>
                    <li>Gunakan tombol filter di atas untuk mempersempit kategori</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00632B]/10 text-[#00632B] hover:bg-[#00632B]/20 rounded-full text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi Pencarian</span>
                </button>
              </div>
            ) : (
              <>
                {/* KELOMPOK 1: NAMA AKUN WARGA */}
                {showAccounts && matchedAccounts.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        <User className="w-3.5 h-3.5 text-[#00632B]" />
                        <span>Nama Akun Warga ({matchedAccounts.length})</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Klik untuk melihat postingannya saja</span>
                    </div>
                    <div className="divide-y divide-neutral-100 bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                      {matchedAccounts.map((acc) => (
                        <div
                          key={acc.user}
                          onClick={() => handleSelect(acc.user, "account")}
                          className="p-3 flex items-center justify-between hover:bg-neutral-100/80 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] flex items-center justify-center text-xs font-bold text-white shadow-xs select-none shrink-0">
                              {acc.init}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 group-hover:text-[#00632B] transition truncate">
                                @{acc.user}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">{acc.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-semibold bg-[#00632B]/10 text-[#00632B] px-2 py-0.5 rounded-full whitespace-nowrap">
                              {acc.postCount} postingan
                            </span>
                            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* KELOMPOK 2: LOKASI */}
                {showLocations && matchedLocations.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                        <span>Lokasi ({matchedLocations.length})</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Klik untuk melihat semua kabar di lokasi ini</span>
                    </div>
                    <div className="divide-y divide-neutral-100 bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                      {matchedLocations.map((locItem) => (
                        <div
                          key={locItem.loc}
                          onClick={() => handleSelect(locItem.loc, "location")}
                          className="p-3 flex items-center justify-between hover:bg-neutral-100/80 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 group-hover:text-yellow-600 transition truncate">
                                {locItem.loc}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                Semua kabar seputar area {locItem.loc}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-semibold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {locItem.count} kabar
                            </span>
                            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* KELOMPOK 3: BERITA & KABAR WARGA */}
                {showPosts && matchedPosts.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        <Newspaper className="w-3.5 h-3.5 text-[#00632B]" />
                        <span>Berita & Kabar ({matchedPosts.length})</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Klik untuk melihat rincian kabar</span>
                    </div>
                    <div className="divide-y divide-neutral-100 bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                      {matchedPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handleSelect(post.title, "news")}
                          className="p-3 flex items-start justify-between gap-3 hover:bg-neutral-100/80 transition cursor-pointer group"
                        >
                          <div className="flex gap-2.5 flex-1 min-w-0">
                            {(post.thumbnail || post.img) ? (
                              <img
                                src={post.thumbnail || post.img}
                                alt={post.title}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-neutral-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#00632B] flex items-center justify-center shrink-0">
                                <Newspaper className="w-5 h-5" />
                              </div>
                            )}
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="text-xs font-bold text-neutral-900 line-clamp-1 group-hover:text-[#00632B] transition">
                                {post.title}
                              </p>
                              <p className="text-[11px] text-neutral-500 line-clamp-1">
                                {post.snippet}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap">
                                <span>@{post.author}</span>
                                {post.location && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 text-neutral-500">
                                      <MapPin className="w-2.5 h-2.5 text-yellow-500" />
                                      {post.location}
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{post.time}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-3.5 group-hover:translate-x-0.5 transition" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
