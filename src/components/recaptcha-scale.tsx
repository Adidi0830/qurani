import { useEffect, useRef, useState } from "react";

export function useRecaptchaScale() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const resize = () => {
      if (!wrapperRef.current) return;

      const containerWidth = wrapperRef.current.offsetWidth;
      const recaptchaWidth = 302; // lebar default recaptcha

      if (containerWidth < recaptchaWidth) {
        setScale(containerWidth / recaptchaWidth);
      } else {
        setScale(1);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return { wrapperRef, scale };
}