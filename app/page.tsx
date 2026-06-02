"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export default function Home() {
  const [bgColor, setBgColor] = useState("#000000");

  const bgStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at 50% 18%, ${bgColor}66 0%, transparent 22%), radial-gradient(circle at 18% 20%, rgba(87,87,87,0.30) 0%, transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,1))`,
    }),
    [bgColor],
  );

  const updateBg = (hex: string) => setBgColor(hex);

  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  const galleryItems = [
    { src: "/product-image/beach-slide/SLF003-1005-1.webp", span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-4 md:row-span-4 row-span-2", motion: 0.8 },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.3 },
    { src: "/product-image/beach-slide/SLF003-1005-7.webp", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-4 md:row-span-4 row-span-2", motion: 0.9 },
    { src: "/product-image/beach-slide/SLF003-1005-3.webp", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-4 md:row-span-4 row-span-2", motion: 0.7 },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.3 },
    { src: "/product-image/beanie-hat/GB_v2_1_LIZ.webp", span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-4 md:row-span-4 row-span-2", motion: 0.6 },
    { src: "", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.7, hidden: true },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.3 },
    { src: "/product-image/hoodie/REVERSEHOODIE_LIME_FRONT.webp", span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 0.9 },
    { src: "", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.5 },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.3 },
    { src: "/product-image/jogger/REVERSEJOGGER_IRIS_CINCHEDFRONT.webp", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 1 },
    { src: "/product-image/phone-cover/IPHONE_16_PRO_SUPER_BLUE_RIGHT_29689_27.webp", span: "sm:col-span-3 md:col-span-3 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 0.6 },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.3 },
    { src: "", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.7 },
    { src: "/product-image/short-pant/SLB021-3010_BACK.webp", span: "sm:col-span-2 md:col-span-2 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 0.8 },
    { src: null, span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-1 md:row-span-1 row-span-1", motion: 0.4 },
    { src: "/product-image/sock/IMG_1743-2.webp", span: "sm:col-span-3 md:col-span-3 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 0.9 },
    { src: "/product-image/sock/SLOUCHSOCK_LIME.webp", span: "sm:col-span-1 md:col-span-1 col-span-2 sm:row-span-2 md:row-span-2 row-span-2", motion: 0.7 },
  ];

  const handleMouseMove = (event: MouseEvent) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    setCursorOffset({ x, y });
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white" style={bgStyle}>

      {/* Home Page Section-1 */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background */}
        {/* <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/hero-image/homepage-bg.jpg"
            alt="Background"
            fill
            priority
            className="object-cover scale-110"
          />
        </div> */}

        {/* Navigation */}
        <header className="absolute top-0 left-0 right-0 z-20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
            <nav className="flex items-center gap-6">
              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                Men
              </button>

              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                Women
              </button>

              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                Collection
              </button>
            </nav>

            <h1 className="text-lg font-black uppercase tracking-wider text-white">
              GARIEVA PRINCE
            </h1>

            <nav className="flex items-center gap-6">
              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                Search
              </button>

              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                Sign In
              </button>

              <button className="text-xs text-white font-black uppercase tracking-wide underline decoration-white">
                About Us
              </button>
            </nav>
          </div>
        </header>

        {/* Models */}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">

          <div className="grid w-full grid-cols-6 items-end gap-2 md:gap-4">

            {[
              "/hero-image/hero-1.webp",
              "/hero-image/hero-2.webp",
              "/hero-image/hero-3.webp",
              "/hero-image/hero-4.webp",
              "/hero-image/hero-5.webp",
              "/hero-image/hero-6.webp",
            ].map((image, index) => (
              <div
                key={index}
                className="relative aspect-[2/5] w-full"
              >
                <Image
                  src={image}
                  alt={`Model ${index + 1}`}
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            ))}

          </div>

        </div>

        {/* Center Bottom Content */}
        <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 text-center">

          <h2 className="text-3xl font-black uppercase md:text-5xl">
            FALL WINTER 2026
          </h2>

          <button className="mt-2 text-lg font-black uppercase underline">
            LIVE NOW
          </button>

        </div>
      </section>

      {/* Homepage section-2 */}
      <section className="relative min-h-screen overflow-hidden" onMouseMove={handleMouseMove}>
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-7 px-6 py-16">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-3xl ${item.span}`}
              style={{
                width: item.width,
                height: item.height,
                transform: `translate3d(${cursorOffset.x * item.motion * 10}px, ${cursorOffset.y * item.motion * 6}px, 0)`,
                transition: "transform 0.35s ease-out",
              }}
            >
              {item.src ? (
                <Image
                  src={item.src}
                  alt={`Gallery ${index + 1}`}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <style jsx global>{`
        
      `}</style>
    </main>
  );
}
