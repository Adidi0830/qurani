import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-emerald-600 dark:text-emerald-400">404</h1>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Halaman Tidak Ditemukan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Maaf, halaman yang Anda cari tidak dapat ditemukan. Mungkin halaman telah dipindahkan atau dihapus.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            <Link href="/">
              Kembali ke Beranda
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Ke Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
