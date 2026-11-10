import { use } from "react"
import OrderDetailPage from "@/features/order-detail/ui/order-detail-page"

export default function PesananDetailPage({ params }: { params: Promise<{ id: string; lang: string }> }) {
    const { id } = use(params)
    return <OrderDetailPage id={Number(id)} />
}
