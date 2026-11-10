import { CategoriesManager } from "@/components/masterdata/categories-manager"

export const metadata = {
    title: "Categories | Master Data | Qurani Admin",
    description: "Kelola kategori untuk guru dan kursus di platform Qurani",
}

export default function CategoriesPage() {
    return <CategoriesManager />
}