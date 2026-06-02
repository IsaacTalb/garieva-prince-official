"use client";

import Image from "next/image";
import { useMemo, useState, type MouseEvent } from "react";

const heroImages = [
  "/hero-image/hero-1.webp",
  "/hero-image/hero-2.webp",
  "/hero-image/hero-3.webp",
  "/hero-image/hero-4.webp",
  "/hero-image/hero-5.webp",
  "/hero-image/hero-6.webp",
];

const navItems = ["Men", "Women", "Collection", "Search", "Sign In", "About Us"];

type GalleryItem = {
  src?: string;
  span: string;
  mobileRatio?: string;
  motion: number;
  position?: string;
};

const galleryItems: GalleryItem[] = [
  {
    src: "/product-image/beach-slide/SLF003-1005-1.webp",
    span: "md:col-span-2 md:row-span-4 xl:col-span-2 xl:row-span-5",
    mobileRatio: "aspect-[4/5]",
    motion: 0.8,
    position: "object-center",
  },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.3 },
  {
    src: "/product-image/beach-slide/SLF003-1005-7.webp",
    span: "md:col-span-3 md:row-span-3 xl:col-span-4 xl:row-span-3",
    mobileRatio: "aspect-[16/11]",
    motion: 0.9,
    position: "object-[50%_58%]",
  },
  {
    src: "/product-image/beach-slide/SLF003-1005-3.webp",
    span: "md:col-span-3 md:row-span-4 xl:col-span-3 xl:row-span-4",
    mobileRatio: "aspect-[3/4]",
    motion: 0.7,
    position: "object-[50%_42%]",
  },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.3 },
  {
    src: "/product-image/beanie-hat/GB_v2_1_LIZ.webp",
    span: "md:col-span-2 md:row-span-3 xl:col-span-2 xl:row-span-4",
    mobileRatio: "aspect-square",
    motion: 0.6,
    position: "object-top",
  },
  { span: "hidden xl:block xl:col-span-2 xl:row-span-1", motion: 0.7 },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.3 },
  {
    src: "/product-image/hoodie/REVERSEHOODIE_LIME_FRONT.webp",
    span: "md:col-span-2 md:row-span-3 xl:col-span-2 xl:row-span-3",
    mobileRatio: "aspect-[4/5]",
    motion: 0.9,
    position: "object-top",
  },
  { span: "hidden lg:block lg:col-span-2 lg:row-span-1", motion: 0.5 },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.3 },
  {
    src: "/product-image/jogger/REVERSEJOGGER_IRIS_CINCHEDFRONT.webp",
    span: "md:col-span-3 md:row-span-3 xl:col-span-3 xl:row-span-3",
    mobileRatio: "aspect-[4/5]",
    motion: 1,
    position: "object-[50%_35%]",
  },
  {
    src: "/product-image/phone-cover/IPHONE_16_PRO_SUPER_BLUE_RIGHT_29689_27.webp",
    span: "md:col-span-3 md:row-span-2 xl:col-span-4 xl:row-span-2",
    mobileRatio: "aspect-[16/10]",
    motion: 0.6,
    position: "object-center",
  },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.3 },
  { span: "hidden lg:block lg:col-span-2 lg:row-span-1", motion: 0.7 },
  {
    src: "/product-image/short-pant/SLB021-3010_BACK.webp",
    span: "md:col-span-3 md:row-span-3 xl:col-span-3 xl:row-span-3",
    mobileRatio: "aspect-[4/5]",
    motion: 0.8,
    position: "object-[50%_42%]",
  },
  { span: "hidden md:block md:col-span-1 md:row-span-1", motion: 0.4 },
  {
    src: "/product-image/sock/IMG_1743-2.webp",
    span: "md:col-span-4 md:row-span-2 xl:col-span-4 xl:row-span-3",
    mobileRatio: "aspect-[16/10]",
    motion: 0.9,
    position: "object-center",
  },
  {
    src: "/product-image/sock/SLOUCHSOCK_LIME.webp",
    span: "md:col-span-2 md:row-span-2 xl:col-span-2 xl:row-span-3",
    mobileRatio: "aspect-square",
    motion: 0.7,
    position: "object-center",
  },
];

export default function Home() {
  const [bgColor] = useState("#000000");
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const bgStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at 50% 18%, ${bgColor}66 0%, transparent 22%), radial-gradient(circle at 18% 20%, rgba(87,87,87,0.30) 0%, transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,1))`,
    }),
    [bgColor],
  );

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    setCursorOffset({ x, y });
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white" style={bgStyle}>
      {/* Home Page Section-1 */}
      <section className="relative min-h-[100svh] overflow-hidden">
        {/* Navigation */}
        <header className="absolute left-0 right-0 top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <nav className="hidden items-center gap-5 lg:flex xl:gap-6" aria-label="Primary left navigation">
              {navItems.slice(0, 3).map((item) => (
                <button
                  key={item}
                  className="nav-link text-xs font-black uppercase tracking-wide text-white underline decoration-white/80 underline-offset-4"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>

            <h1 className="text-center text-base font-black uppercase tracking-[0.18em] text-white sm:text-lg lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              GARIEVA PRINCE
            </h1>

            <nav className="hidden items-center gap-5 lg:flex xl:gap-6" aria-label="Primary right navigation">
              {navItems.slice(3).map((item) => (
                <button
                  key={item}
                  className="nav-link text-xs font-black uppercase tracking-wide text-white underline decoration-white/80 underline-offset-4"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>

            <button
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              className="menu-button flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md lg:hidden"
              onClick={() => setIsMenuOpen((open) => !open)}
              type="button"
            >
              <span className="sr-only">Menu</span>
              <span className="relative h-4 w-5" aria-hidden="true">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-white transition duration-300 ${
                    isMenuOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-white transition duration-300 ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-0.5 w-5 rounded bg-white transition duration-300 ${
                    isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>

          <div
            id="mobile-menu"
            className={`mx-4 overflow-hidden rounded-[2rem] border border-white/15 bg-black/70 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-out lg:hidden ${
              isMenuOpen ? "max-h-96 translate-y-0 opacity-100" : "max-h-0 -translate-y-4 opacity-0"
            }`}
          >
            <nav className="grid gap-2 p-4" aria-label="Mobile navigation">
              {navItems.map((item, index) => (
                <button
                  key={item}
                  className="mobile-nav-link rounded-full px-4 py-3 text-left text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ animationDelay: `${index * 55}ms` }}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Models */}
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center justify-center px-3 pt-24 pb-36 sm:px-6 lg:px-8 lg:pt-28">
          <div className="hero-model-grid grid w-full grid-cols-3 items-end gap-1.5 sm:gap-2 md:grid-cols-6 md:gap-3 lg:gap-4">
            {heroImages.map((image, index) => (
              <div key={image} className="hero-model-card relative aspect-[3/5] w-full sm:aspect-[2/5]">
                <Image
                  src={image}
                  alt={`Garieva Prince runway model ${index + 1}`}
                  fill
                  preload={index < 2}
                  sizes="(max-width: 767px) 33vw, (max-width: 1279px) 16vw, 190px"
                  className="object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.55)]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Center Bottom Content */}
        <div className="absolute bottom-10 left-1/2 z-20 w-full max-w-[92vw] -translate-x-1/2 text-center sm:bottom-12">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-white/70 sm:text-sm">New Season</p>
          <h2 className="mt-2 text-4xl font-black uppercase leading-none sm:text-5xl md:text-6xl lg:text-7xl">
            FALL WINTER 2026
          </h2>

          <button className="mt-4 rounded-full border border-white/25 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] underline underline-offset-4 transition hover:bg-white hover:text-black sm:text-base" type="button">
            LIVE NOW
          </button>
        </div>
      </section>

      {/* Homepage section-2 */}
      <section className="relative min-h-screen overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-24" onMouseMove={handleMouseMove}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-white/50">Modern showcase</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-4xl lg:text-6xl">Gallery Picks</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/60 sm:text-base">
              A responsive mosaic with oversized editorial moments on larger screens and a smooth vertical mobile flow.
            </p>
          </div>

          <div className="gallery-mosaic grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-6 md:auto-rows-[90px] md:grid-flow-dense lg:auto-rows-[108px] xl:grid-cols-8 xl:auto-rows-[118px] xl:gap-7">
            {galleryItems.map((item, index) => (
              <div
                key={`${item.src ?? "space"}-${index}`}
                className={`gallery-card relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm ${
                  item.src ? item.mobileRatio ?? "aspect-[4/5]" : "min-h-10"
                } ${item.span}`}
                style={{
                  transform: item.src
                    ? `translate3d(${cursorOffset.x * item.motion * 10}px, ${cursorOffset.y * item.motion * 6}px, 0)`
                    : undefined,
                  transition: "transform 0.35s ease-out, border-color 0.3s ease, background 0.3s ease",
                }}
                aria-hidden={!item.src}
              >
                {item.src ? (
                  <Image
                    src={item.src}
                    alt={`Garieva Prince gallery product ${index + 1}`}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    className={`gallery-image object-cover ${item.position ?? "object-center"}`}
                  />
                ) : (
                  <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
