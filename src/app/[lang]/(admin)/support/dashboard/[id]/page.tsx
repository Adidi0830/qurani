import TicketDetailPageWrapper from "@/components/Support/TicketDetailPageWrapper";

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TicketDetail({ params }: PageProps) {
    const { id } = await params

    return (
        <TicketDetailPageWrapper ticketId={id} backUrl="/support/dashboard" />
    )
}