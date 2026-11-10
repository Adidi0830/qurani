import { Suspense } from "react";
import Users from "@/components/admin/user";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <Users />
        </Suspense>
    )
}