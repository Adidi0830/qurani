"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useLoading } from "@/hooks/useLoading"
import { toast } from "sonner"

/**
 * Contoh penggunaan komponen loading yang telah dibuat
 */
export function LoadingExamples() {
  const { loading, withLoading } = useLoading()
  const [buttonLoading, setButtonLoading] = useState(false)

  const handleAsyncAction = async () => {
    try {
      await withLoading(async () => {
        // Simulasi API call
        await new Promise(resolve => setTimeout(resolve, 3000))
        toast.success("Action completed successfully!")
      })
    } catch {
      toast.error("Something went wrong!")
    }
  }

  const handleButtonLoading = async () => {
    setButtonLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.success("Button action completed!")
    setButtonLoading(false)
  }

  return (
    <div className="space-y-8 p-6">
      {/* Loading Overlay Example */}
      <LoadingOverlay 
        isOpen={loading} 
        message="Processing your request..."
        variant="default"
      />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Loading Components Examples</h2>
        
        {/* Spinner Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">1. Spinner Component</h3>
          <div className="flex gap-4 items-center">
            <Spinner size="sm" label="Small" />
            <Spinner size="default" label="Default" />
            <Spinner size="lg" label="Large" />
            <Spinner size="xl" label="Extra Large" />
          </div>
          
          <div className="flex gap-4 items-center">
            <Spinner variant="default" label="Default" />
            <Spinner variant="muted" label="Muted" />
            <div className="bg-slate-800 p-2 rounded">
              <Spinner variant="white" label="White" />
            </div>
          </div>
        </div>

        {/* Button Loading Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">2. Button with Loading</h3>
          <div className="flex gap-4">
            <Button
              onClick={handleButtonLoading}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Button with Custom Loading Text"
              )}
            </Button>
            
            <Button
              variant="secondary"
              disabled
            >
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Always Loading Button
            </Button>
            
            <Button
              variant="destructive"
              disabled
            >
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Deleting...
            </Button>
          </div>
        </div>

        {/* Full Overlay Example */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">3. Loading with Overlay</h3>
          <Button
            onClick={handleAsyncAction}
            disabled={loading}
            size="lg"
          >
            Trigger Loading Overlay
          </Button>
        </div>

        {/* useLoading Hook Example */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">4. useLoading Hook Usage</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-sm">
{`const { loading, withLoading, startLoading, stopLoading } = useLoading()

// Gunakan withLoading untuk wrap async function
await withLoading(async () => {
  const result = await apiCall()
  return result
})

// Atau kontrol manual
startLoading()
try {
  await someAsyncOperation()
} finally {
  stopLoading()
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
