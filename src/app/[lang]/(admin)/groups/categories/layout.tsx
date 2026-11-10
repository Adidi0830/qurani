import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Qurani - Group Categories",
    description: "Kelola kategori grup untuk platform Qurani",
};

export default function GroupCategoriesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
