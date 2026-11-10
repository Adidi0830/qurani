import { KelolaGrupPage } from "@/components/dashboard/grup/kelola-grup-page"

interface PageProps {
  params: Promise<{
    groupId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { groupId } = await params

  return <KelolaGrupPage groupId={groupId} />
}