"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

const images = [
  "/img/carousel/carousel1.webp",
  "/img/carousel/carousel2.webp",
  "/img/carousel/carousel3.webp",
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReverse, setIsReverse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // Jika di akhir, arahkan ke kanan
        if (prevIndex === images.length - 1) {
          setIsReverse(true);
          return 0;
        } else {
          setIsReverse(false);
          return prevIndex + 1;
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg h-full">
      {/* Wrapper semua gambar */}
      <div
        className={`flex transition-transform duration-700 ease-in-out h-full ${isReverse ? "animate-slide-right" : ""
          }`}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {images.map((src, index) => (
          <div key={index} className="relative w-full h-full flex-shrink-0">
            <Image
              src={src}
              alt={`Slide ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${currentIndex === index ? "bg-white" : "bg-white/40"
              }`}
          />
        ))}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
    </div>
  );
}
