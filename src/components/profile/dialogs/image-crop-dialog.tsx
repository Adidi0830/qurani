"use client"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ImageCrop, ImageCropApply, ImageCropContent } from "@/components/kibo-ui/image-crop"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useI18n } from "@/components/providers/i18n-provider"

interface ImageCropDialogProps {
  open: boolean
  selectedAvatar: File | null
  onCrop: (croppedImageData: string) => void
  onCancel: () => void
  onApply: () => void
  cropApplyRef: React.RefObject<HTMLButtonElement>
  isCancelling: boolean
}

export function ImageCropDialog({
  open,
  selectedAvatar,
  onCrop,
  onCancel,
  onApply,
  cropApplyRef,
  isCancelling
}: ImageCropDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog
      open={open}
      onOpenChange={(openState) => {
        if (!openState && open && !isCancelling) {
          onCancel()
        }
      }}
    >
      <DialogContent showCloseButton={false} className="
        flex flex-col justify-between p-4 fixed bottom-0 right-0 border-transparent h-screen min-w-screen rounded-none
        sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:min-w-[60vw] sm:rounded-lg sm:p-8 sm:border sm:border-white sm:dark:border-gray-600
        lg:min-w-[30vw]
        dark:bg-black 
        "
      >
        <VisuallyHidden>
          <DialogTitle>Crop Image</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col justify-between h-full">
          <div className="h-[75vh] flex flex-col justify-center">
            {selectedAvatar && (
              <ImageCrop
                className="max-w-full max-h-[70vh]"
                aspect={1}
                file={selectedAvatar}
                onChange={console.log}
                onComplete={console.log}
                onCrop={onCrop}
              >
                <ImageCropContent className="max-w-md" />
                <div className="hidden">
                  <ImageCropApply ref={cropApplyRef} />
                </div>
              </ImageCrop>
            )}
          </div>
          <div className="flex justify-between items-center pb-4 sm:pb-0">
            <button
              onClick={onCancel}
              className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('profile.cancel')}
            </button>
            <button
              onClick={onApply}
              className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              {t('profile.done')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

