// hooks/use-recaps-mutate.ts
import { useCallback } from "react";
import { mutate } from "swr";

/**
 * Custom hook untuk trigger revalidation data recaps
 * Berguna untuk sinkronisasi data setelah create/update/delete
 */
export const useRecapsMutate = () => {
  /**
   * Mutate semua data recaps untuk user tertentuu
   * @param userId - ID user yang datanya perlu di-revalidate
   * @param specificMode - Mode spesifik yang ingin di-revalidate (optional)
   */
  const mutateRecaps = useCallback(
    (userId: string, specificMode?: "examiner" | "reciter" | "all") => {
      // Jika mode spesifik diberikan, hanya mutate mode tersebut
      if (specificMode) {
        mutate(
          (key) => {
            if (!Array.isArray(key)) return false;
            return key[0] === `recaps-${specificMode}-${userId}`;
          },
          undefined,
          { revalidate: true }
        );
        return;
      }

      // Jika tidak, mutate semua mode
      const modes: Array<"examiner" | "reciter" | "all"> = [
        "all",
        "examiner",
        "reciter",
      ];

      modes.forEach((mode) => {
        mutate(
          (key) => {
            if (!Array.isArray(key)) return false;
            return key[0] === `recaps-${mode}-${userId}`;
          },
          undefined,
          { revalidate: true }
        );
      });
    },
    []
  );

  /**
   * Mutate single recap detail
   * @param recapId - ID recap yang perlu di-revalidate
   */
  const mutateRecapDetail = useCallback((recapId: string) => {
    mutate(`recap-${recapId}`, undefined, { revalidate: true });
  }, []);

  return {
    mutateRecaps,
    mutateRecapDetail,
  };
};
