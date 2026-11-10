import { CountryDetail } from "@/components/masterdata/country-detail"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CountryDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
            <div className="container mx-auto py-6 max-w-7xl">
                <CountryDetail id={id} />
            </div>
    )
}
