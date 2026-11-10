"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/i18n-provider";

export function useImageCrop() {
  const [openCropImage, setOpenCropImage] = useState<boolean>(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [shouldApplyCrop, setShouldApplyCrop] = useState(false);
  const [originalAvatarPreview, setOriginalAvatarPreview] = useState<
    string | null
  >(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const cropApplyRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  // Function to check if browser supports WebP
  const checkWebPSupport = useCallback((): boolean => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  }, []);

  // Function to resize image to specific dimensions (always 400x400)
  const resizeImage = useCallback(
    async (src: string, width: number, height: number): Promise<Blob> => {
      return new Promise<Blob>((resolve, reject) => {
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Draw image to fill the canvas, maintaining aspect ratio
          ctx.drawImage(img, 0, 0, width, height);

          // Use WebP if supported, fallback to PNG
          const format = checkWebPSupport() ? "image/webp" : "image/png";
          const quality = checkWebPSupport() ? 0.85 : 0.9;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Could not convert canvas to blob"));
              }
            },
            format,
            quality
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
      });
    },
    [checkWebPSupport]
  );

  const handleImageCrop = useCallback((croppedImageData: string) => {
    setCroppedImage(croppedImageData);
  }, []);

  const processCroppedImage = useCallback(
    async (
      croppedImageData: string,
      onSuccess: (file: File, preview: string) => void
    ) => {
      try {
        // Resize image to exactly 400x400 and convert to WebP (with PNG fallback)
        const resizedBlob = await resizeImage(croppedImageData, 400, 400);
        const supportsWebP = checkWebPSupport();
        const fileName = supportsWebP ? "avatar.webp" : "avatar.png";
        const mimeType = supportsWebP ? "image/webp" : "image/png";
        const file = new File([resizedBlob], fileName, { type: mimeType });

        onSuccess(file, croppedImageData);
        setOpenCropImage(false);
        setCroppedImage(null);
        setShouldApplyCrop(false);
      } catch (error) {
        console.error("Error converting cropped image:", error);
        toast.error(
          t(
            "profile.messages.error.crop_failed",
            "Failed to process cropped image"
          )
        );
        setShouldApplyCrop(false);
      }
    },
    [resizeImage, checkWebPSupport, t]
  );

  const handleApplyCrop = useCallback(
    (onSuccess: (file: File, preview: string) => void) => {
      if (cropApplyRef.current) {
        // If cropped image already exists, process it immediately
        if (croppedImage) {
          processCroppedImage(croppedImage, onSuccess);
        } else {
          // Set flag and trigger crop
          setShouldApplyCrop(true);
        }
      }
    },
    [croppedImage, processCroppedImage]
  );

  const handleCancelCrop = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (restorePreview: string | null) => {
      if (isCancelling) return;

      setIsCancelling(true);
      setOpenCropImage(false);

      // Reset state after dialog is closed
      setTimeout(() => {
        setCroppedImage(null);
        setShouldApplyCrop(false);
        setOriginalAvatarPreview(null);
        setIsCancelling(false);

        // Reset file input to allow selecting the same file again
        const fileInput = document.getElementById(
          "avatar-upload"
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      }, 300);
    },
    [isCancelling]
  );

  const openCropDialog = useCallback(
    (currentPreview: string | null | undefined) => {
      setOriginalAvatarPreview(currentPreview || null);
      setOpenCropImage(true);
      setCroppedImage(null);
    },
    []
  );

  return {
    openCropImage,
    setOpenCropImage,
    croppedImage,
    shouldApplyCrop,
    setShouldApplyCrop,
    originalAvatarPreview,
    isCancelling,
    cropApplyRef,
    handleImageCrop,
    processCroppedImage,
    handleApplyCrop,
    handleCancelCrop,
    openCropDialog,
  };
}
