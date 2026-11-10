import { GrupDetailPage } from "@/components/dashboard/grup/grup-detail-page"

interface PageProps {
    params: Promise<{
        groupId: string
    }>
}

export default async function Page({ params }: PageProps) {
    const { groupId } = await params

    return <GrupDetailPage groupId={groupId} />
}