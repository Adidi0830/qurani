import { Suspense } from "react";
import Roles from "@/components/admin/roles";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <Roles />
        </Suspense>
    )
}