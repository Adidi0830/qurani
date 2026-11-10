import CurrencyDetail from "@/components/masterdata/currency-detail-view"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CurrencyDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
            <div className="container mx-auto py-6 max-w-7xl">
                <CurrencyDetail id={id} />
            </div>
    )
}
