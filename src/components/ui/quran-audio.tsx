import { Play, Pause } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export default function QuranAudio({ src, surah }: { src: string, surah: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const setAudioDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", setAudioDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", setAudioDuration);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format menit:detik
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="w-full bg-neutral-900 text-white shadow-lg p-4">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {/* Tombol Play/Pause */}
        <button
          onClick={togglePlay}
          className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        {/* Info */}
        <div className="flex-1 mx-4">
          <p className="font-semibold">{surah}</p>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-white h-1"
            />
            <span className="text-xs">{formatTime(duration)}</span>
          </div>
        </div>

      </div>

      {/* Hidden Audio */}
      <audio ref={audioRef}>
        <source src={src} type="audio/mpeg" />
        Browser kamu tidak mendukung audio.
      </audio>
    </div>
  );
}
