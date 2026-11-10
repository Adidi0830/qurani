import { StateDetail } from "@/components/masterdata/state-detail"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function StateDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
            <div className="container mx-auto py-6 max-w-7xl">
                <StateDetail id={id} />
            </div>
    )
}
