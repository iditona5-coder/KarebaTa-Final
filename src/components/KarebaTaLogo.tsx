export function KarebaPinIcon({ className = "w-11 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Pin Kareba'Ta"
    >
      {/* Bentuk Pin Lokasi Warna Kuning Keemasan Khas Kareba'Ta */}
      <path
        d="M 50 118 C 47 108 10 70 10 46 A 40 40 0 1 1 90 46 C 90 70 53 108 50 118 Z"
        fill="#E5A000"
      />

      {/* Huruf K Tebal Putih Bersih di Dalam Pin */}
      <path
        d="M 30 25 H 41 V 44.5 L 59.5 25 H 73.5 L 50.5 47.5 L 74.5 71 H 60.5 L 41 51 V 71 H 30 V 25 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function KarebaTaLogo({
  showSubtitle = true,
  className = "",
}: {
  showSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Icon Pin Lokasi Kuning Keemasan */}
      <div className="shrink-0 transition-transform duration-200 hover:scale-105 drop-shadow-xs">
        <KarebaPinIcon className="w-10 h-11 sm:w-11 sm:h-12" />
      </div>

      {/* Typography Kareba'Ta (Kareba' Hijau Tua & Ta Kuning Keemasan) & Slogan "beritamu suaramu" */}
      <div className="flex flex-col justify-center">
        <div
          className="text-2xl sm:text-[28px] font-[900] tracking-tight leading-none"
          style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
        >
          <span className="text-[#00632B]">Kareba'</span>
          <span className="text-[#E5A000]">Ta</span>
        </div>
        {showSubtitle && (
          <span
            className="text-[12px] sm:text-[13px] font-bold tracking-[0.05em] text-[#E5A000] leading-tight mt-1"
            style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            beritamu, suaramu
          </span>
        )}
      </div>
    </div>
  );
}

