"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { LocalizedLink as Link } from "@/components/ui/localized-link";
// import { motion } from "motion/react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
}) => {
    return (
        <Link
            href={link.href}
            className={cn(
                "flex items-center justify-start gap-2 group/sidebar py-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg px-2 transition-colors duration-150",
                className
            )}
            {...props}
        >
            {link.icon}
            <span className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre">
                {link.label}
            </span>
        </Link>
    );
};
