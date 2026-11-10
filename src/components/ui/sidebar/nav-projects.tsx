"use client"

import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "./custom-sidebar"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()
  return (
    <div className="relative flex w-full min-w-0 flex-col p-2">
      <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        Projects
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-1">
        {projects.map((item) => (
          <li key={item.name} className="group/menu-item relative">
            <a 
              href={item.url}
              className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.name}</span>
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 opacity-0 group-hover/menu-item:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <Folder className="h-4 w-4 text-gray-500" />
                  <span>View Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="h-4 w-4 text-gray-500" />
                  <span>Share Project</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="h-4 w-4 text-gray-500" />
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
        <li className="group/menu-item relative">
          <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-gray-500 dark:text-gray-400 outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreHorizontal className="h-4 w-4" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
