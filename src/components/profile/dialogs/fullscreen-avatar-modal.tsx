"use client"

import Image from "next/image"

interface FullscreenAvatarModalProps {
  show: boolean
  avatarSource: string | null
  fullName: string
  username: string
  onClose: () => void
}

export function FullscreenAvatarModal({
  show,
  avatarSource,
  fullName,
  username,
  onClose
}: FullscreenAvatarModalProps) {
  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
          title="Close (Esc)"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Avatar Image */}
        <div
          className="relative max-w-full max-h-full animate-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={avatarSource || ''}
            alt={fullName}
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{ maxHeight: '90vh', maxWidth: '90vw' }}
            priority
            unoptimized
            onError={() => {
              console.error('Fullscreen avatar failed to load:', avatarSource)
            }}
          />
        </div>

        {/* User Info Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-white animate-in slide-in-from-bottom duration-300">
          <h3 className="font-semibold text-lg">
            {fullName || "User"}
          </h3>
          {username && (
            <p className="text-sm text-gray-300">
              {username}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm animate-in slide-in-from-top duration-300">
          <p className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd>
            <span>or click outside to close</span>
          </p>
        </div>
      </div>
    </div>
  )
}

