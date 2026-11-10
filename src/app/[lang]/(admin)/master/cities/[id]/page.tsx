import { CityDetail } from "@/components/masterdata/city-detail"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CityDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
            <div className="container mx-auto py-6 max-w-7xl">
                <CityDetail id={id} />
            </div>
    )
}
