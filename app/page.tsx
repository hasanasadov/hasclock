"use client";
import { useEffect, useMemo, useState } from "react";
import { Manrope, IBM_Plex_Mono } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" });
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

// Types
type Weather = { temp: number; desc: string; city: string } | null;
type ThemeKey = keyof typeof THEMES;

// Themes: gradients + solids
const THEMES = {
  auto: { kind: "auto", cls: "" },
  aurora: {
    kind: "gradient",
    cls: "from-emerald-300 via-cyan-400 to-indigo-500",
  },
  sunset: {
    kind: "gradient",
    cls: "from-amber-300 via-rose-400 to-fuchsia-500",
  },
  lavender: {
    kind: "gradient",
    cls: "from-violet-300 via-purple-400 to-pink-300",
  },
  ocean: { kind: "gradient", cls: "from-sky-300 via-blue-500 to-indigo-600" },
  midnight: {
    kind: "gradient",
    cls: "from-slate-900 via-indigo-900 to-zinc-900",
  },
  citrus: {
    kind: "gradient",
    cls: "from-lime-300 via-yellow-300 to-orange-400",
  },
  noir: { kind: "solid", cls: "bg-zinc-950" },
  charcoal: { kind: "solid", cls: "bg-neutral-950" },
  cobalt: { kind: "solid", cls: "bg-blue-950" },
  forest: { kind: "solid", cls: "bg-emerald-950" },
  plum: { kind: "solid", cls: "bg-purple-950" },
} as const;

function autoGradientByHour(h: number) {
  if (h >= 6 && h < 11) return THEMES.citrus.cls;
  if (h >= 11 && h < 17) return THEMES.ocean.cls;
  if (h >= 17 && h < 21) return THEMES.sunset.cls;
  return THEMES.midnight.cls;
}

function formatDateAZ(date: Date) {
  return date.toLocaleDateString("az-AZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Weather helpers
const WMO_DESC: Record<number, string> = {
  0: "Açıq səma",
  1: "Əsasən açıq",
  2: "Qismən buludlu",
  3: "Buludlu",
  45: "Duman",
  48: "Dondurucu duman",
  51: "Çiskin zəif",
  53: "Çiskin orta",
  55: "Çiskin güclü",
  61: "Yağış zəif",
  63: "Yağış orta",
  65: "Yağış güclü",
  71: "Qar zəif",
  73: "Qar orta",
  75: "Qar güclü",
  80: "Qısamüddətli yağış",
  81: "Güclü qısamüddətli yağış",
  82: "Çox güclü yağış",
  95: "Göy gurultulu yağış",
  96: "Dolu ilə yağış",
  99: "Güclü dolu ilə yağış",
};

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=az`
    );
    const j = await r.json();
    return j.city || j.locality || j.principalSubdivision || "";
  } catch {
    return "";
  }
}

async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  // Try OpenWeather (if key configured)
  try {
    const key = "YOUR_OPENWEATHERMAP_API_KEY";
    if (key && !/YOUR_OPENWEATHERMAP_API_KEY/.test(key)) {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=az&appid=${key}`
      );
      const data = await res.json();
      if (res.ok && data?.main?.temp != null) {
        return {
          temp: Math.round(data.main.temp),
          desc: String(data.weather?.[0]?.description ?? ""),
          city: data.name ?? "",
        };
      }
    }
  } catch {}

  // Fallback: Open-Meteo
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
    );
    const data = await res.json();
    if (data?.current_weather?.temperature != null) {
      const code = Number(data?.current_weather?.weathercode ?? 0);
      return {
        temp: Math.round(Number(data.current_weather.temperature)),
        desc: WMO_DESC[code] ?? "Hava məlumatı",
        city: "",
      };
    }
  } catch {}

  return null;
}

export default function Page() {
  // HYDRATION-SAFE STATE
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(new Date(0));
  const [themeKey, setThemeKey] = useState<ThemeKey>("auto");
  const [hoverKey, setHoverKey] = useState<ThemeKey | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [weather, setWeather] = useState<Weather>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clock tick
  useEffect(() => {
    if (!mounted) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [mounted]);

  // Load prefs after mount
  useEffect(() => {
    if (!mounted) return;
    try {
      const g = localStorage.getItem("clock.theme") as ThemeKey | null;
      if (g) setThemeKey(g);
      const f = localStorage.getItem("clock.focus");
      if (f != null) setFocusMode(f === "1");
    } catch {}
  }, [mounted]);

  // Persist prefs
  useEffect(() => {
    if (mounted)
      try {
        localStorage.setItem("clock.theme", themeKey);
      } catch {}
  }, [mounted, themeKey]);
  useEffect(() => {
    if (mounted)
      try {
        localStorage.setItem("clock.focus", focusMode ? "1" : "0");
      } catch {}
  }, [mounted, focusMode]);

  // Auto-close palette
  useEffect(() => {
    if (!paletteOpen) return;
    const id = setTimeout(() => setPaletteOpen(false), 5000);
    return () => clearTimeout(id);
  }, [paletteOpen]);

  // Weather with reverse geocode for city name
  useEffect(() => {
    if (!mounted || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const w = await fetchWeather(latitude, longitude);
      let city = w?.city || "";
      if (!city) city = await reverseGeocode(latitude, longitude);
      setWeather(w ? { ...w, city } : null);
    });
  }, [mounted]);

  // Derived values
  const hours = mounted ? now.getHours().toString().padStart(2, "0") : "";
  const minutes = mounted ? now.getMinutes().toString().padStart(2, "0") : "";
  const seconds = mounted ? now.getSeconds() : 0;
  const dateDisplay = mounted ? formatDateAZ(now) : "";

  // BG classes (hover preview > selected > SSR fallback)
  const effectiveKey: ThemeKey | "ssr" = !mounted
    ? "ssr"
    : hoverKey ?? themeKey;
  const bgClasses = useMemo(() => {
    if (effectiveKey === "ssr") return "bg-zinc-950"; // safe fallback
    const th = THEMES[effectiveKey];
    if (th.kind === "auto")
      return `bg-gradient-to-br ${autoGradientByHour(now.getHours())}`;
    if (th.kind === "gradient") return `bg-gradient-to-br ${th.cls}`;
    return th.cls; // solid
  }, [effectiveKey, now]);

  // Small seconds ring — FIXED start at top (rotated group)
  const r = 18,
    cx = 24,
    cy = 24;
  const circ = 2 * Math.PI * r;
  const secProg = seconds / 60;
  const dash = `${secProg * circ} ${circ}`;
  const angle = secProg * 2 * Math.PI - Math.PI / 2; // 12 o'clock start
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy + r * Math.sin(angle);

  // Massive time sizes
  const timeSize = focusMode
    ? "text-[240px] md:text-[380px] lg:text-[460px] rotate-[-90deg] translate-x-[5%] translate-y-[5%] sm:rotate-0 sm:translate-x-0 sm:translate-y-0"
    : "text-[190px] md:text-[300px] lg:text-[360px] rotate-[-90deg] translate-x-[5%] translate-y-[5%] sm:rotate-0 sm:translate-x-0 sm:translate-y-0";

  // Keyboard: F toggles focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "f") setFocusMode((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Random theme
  function randomizeTheme() {
    const keys = Object.keys(THEMES).filter((k) => k !== "auto") as ThemeKey[];
    const pick = keys[Math.floor(Math.random() * keys.length)];
    setThemeKey(pick);
    setPaletteOpen(false);
  }

  return (
    <main
      className={`${manrope.variable} ${plex.variable} font-sans relative flex min-h-dvh w-full items-center justify-center overflow-hidden text-white ${bgClasses} transition-colors duration-700`}
      style={{
        fontFamily:
          "var(--font-display), ui-sans-serif, system-ui, -apple-system",
      }}
    >
      {/* Ambient texture */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08] mix-blend-soft-light [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_60%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* Top bar */}
      <header className="absolute left-0 right-0 top-6 z-30 grid grid-cols-3 items-center px-6">
        {/* Weather (left) */}
        {!focusMode ? (
          <div className="justify-self-start -rotate-90 translate-y-[150%] -translate-x-[30%] sm:rotate-0 sm:translate-x-0 sm:translate-y-0 flex items-center gap-3 rounded-full bg-white/12 px-4 py-2 text-sm backdrop-blur ring-1 ring-white/15 shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M6 14a4 4 0 1 1 2.7-6.9A5 5 0 0 1 19 9a3 3 0 0 1-1 5H6z"
                fill="white"
              />
            </svg>
            <div className="leading-tight ">
              <p className="font-medium drop-shadow">
                {weather?.city || "Yerləşmə"}
              </p>
              <p className="opacity-90 drop-shadow">
                {typeof weather?.temp === "number"
                  ? `${weather.temp}°C`
                  : "--°C"}
                {weather?.desc
                  ? ` — ${
                      weather.desc.charAt(0).toUpperCase() +
                      weather.desc.slice(1)
                    }`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Date — centered */}
        <div className="justify-self-center text-center text-sm md:text-base opacity-90 drop-shadow">
          <p>{dateDisplay}</p>
        </div>

        {/* Controls (right) */}
        {!focusMode ? (
          <div className="justify-self-end flex items-center gap-2">
            <button
              onClick={() => setFocusMode((v) => !v)}
              className="h-9 w-9 grid place-items-center rounded-full ring-1 ring-white/15 bg-white/12 backdrop-blur hover:bg-white/20 active:scale-[0.98] transition"
              aria-pressed={focusMode}
              title="Fokus"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="7"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.9"
                />
                {focusMode ? (
                  <circle cx="12" cy="12" r="3" fill="white" />
                ) : null}
              </svg>
            </button>

            <div className="relative ">
              <button
                onClick={() => setPaletteOpen((o) => !o)}
                className="h-9 w-9 grid place-items-center rounded-full ring-1 ring-white/15 bg-white/12 backdrop-blur hover:bg-white/20 active:scale-[0.98] transition"
                title="Tema"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M12 3a9 9 0 1 0 0 18c3 0 4-1 4-2.5S14.5 16 13 16s-2-1-2-2 1-2 2-2 2-1 2-2.5S15 3 12 3z"
                    fill="white"
                  />
                </svg>
              </button>
              {paletteOpen && (
                <div
                  onMouseLeave={() => setPaletteOpen(false)}
                  className="absolute -rotate-90 translate-x-[25%] translate-y-[90%] sm:rotate-0 sm:translate-x-0 sm:translate-y-0 right-0 z-40 mt-2 w-[32rem] overflow-hidden rounded-2xl bg-white/10 p-3 backdrop-blur-xl ring-1 ring-white/15 shadow-2xl"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="px-1 text-xs uppercase tracking-wider opacity-80">
                      Tema seç (hover = önbaxış)
                    </p>
                    <button
                      onClick={randomizeTheme}
                      className="rounded-full bg-white/15 px-2 py-1 text-xs backdrop-blur hover:bg-white/25"
                    >
                      🎲
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                      <button
                        key={k}
                        onMouseEnter={() => setHoverKey(k)}
                        onMouseLeave={() => setHoverKey(null)}
                        onClick={() => {
                          setThemeKey(k);
                          setPaletteOpen(false);
                        }}
                        className={`relative h-16 w-full overflow-hidden rounded-xl ring-1 ring-white/20 ${
                          THEMES[k].kind === "solid"
                            ? THEMES[k].cls
                            : `bg-gradient-to-br ${(THEMES[k] as any).cls}`
                        } transition hover:scale-[1.02] active:scale-95`}
                        title={k}
                      >
                        {themeKey === k && (
                          <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-black text-[11px] font-semibold">
                            ✓
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate px-2 pb-1 text-[10px] tracking-wide uppercase bg-black/25">
                          {k}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="justify-self-end">
            <button
              onClick={() => setFocusMode(false)}
              className="h-9 w-9 grid place-items-center rounded-full ring-1 ring-white/15 bg-white/12 backdrop-blur hover:bg-white/20 active:scale-[0.98] transition"
              title="Fokusu söndür"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="7"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.9"
                />
                <circle cx="12" cy="12" r="3" fill="white" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Center: THICK time + custom colon + fixed seconds ring */}
      <div className="relative z-10 mx-4 flex flex-col items-center justify-center text-center">
        <div className="flex items-center">
          {/* Hours */}
          <span
            className={`time-digit ${timeSize} leading-none font-black tracking-tight tabular-nums`}
          >
            {hours}
            {`${hours ? ":" : ""}`}
            {minutes}
          </span>

          {/* Small seconds ring */}
          <svg
            viewBox="0 0 48 48"
            className="ml-6 h-14 w-14 opacity-95 "
            aria-label="Seconds"
            role="img"
          >
            <defs>
              <linearGradient id="secStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                <stop offset="50%" stopColor="white" stopOpacity="0.85" />
                <stop offset="100%" stopColor="white" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <g transform="rotate(-90 24 24)">
              <circle
                cx={24}
                cy={24}
                r={18}
                stroke="white"
                strokeOpacity="0.18"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx={24}
                cy={24}
                r={18}
                stroke="url(#secStroke)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={dash}
              />
            </g>
            {/* End dot aligned with arc */}
            <circle cx={dotX} cy={dotY} r="3" fill="#fff" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="12"
              fontWeight={600}
              fill="#fff"
              style={{
                fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular",
              }}
            >
              {mounted ? String(seconds).padStart(2, "0") : "00"}
            </text>
          </svg>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --font-display: ${manrope.style.fontFamily ||
          "Manrope, ui-sans-serif, system-ui"};
          --font-mono: ${plex.style.fontFamily ||
          "IBM Plex Mono, ui-monospace"};
        }
        .text-balance {
          text-wrap: balance;
        }
        .time-digit {
          letter-spacing: -0.035em;
          color: #fff;
          -webkit-text-stroke-width: 6px;
          -webkit-text-stroke-color: rgba(255, 255, 255, 0.25);
          filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45));
        }
        @keyframes colonPulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
      `}</style>
    </main>
  );
}
