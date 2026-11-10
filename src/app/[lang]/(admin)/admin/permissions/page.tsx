import { Suspense } from "react";
import Permissions from "@/components/admin/permissions";

export const metadata = {
    title: "Permissions | Admin Qurani",
    description: "Kelola izin akses API untuk setiap role dalam sistem Qurani.",
}

export default function Page() {
    return (
        <Suspense fallback={null}>
            <Permissions />
        </Suspense>
    )
}