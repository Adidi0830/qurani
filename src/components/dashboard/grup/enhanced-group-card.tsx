"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Crown, Globe, Lock, Shield, Users } from "lucide-react"
import { GroupCardProps } from "@/types/grup"

export function GroupCard({ group, status, onAction, actionLabel, actionIcon }: GroupCardProps) {
    // Safe fallbacks for group name
    const groupName = group.name || 'Unnamed Group'

    // Generate avatar fallback safely
    const getAvatarFallback = (name: string) => {
        return name
            .split(" ")
            .filter(n => n.length > 0)
            .slice(0, 2) // Max 2 initials
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "G" // Fallback to "G" if nothing
    }

    // Safe date formatting - Indonesian format (DD MMM YYYY)
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            if (Number.isNaN(date.getTime())) return 'Invalid date'
            const day = date.getDate().toString().padStart(2, "0")
            const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            const month = months[date.getMonth()]
            const year = date.getFullYear()
            return `${day} ${month} ${year}`
        } catch {
            return 'Invalid date'
        }
    }

    // Generate CSS gradient colors for fallback when no profile image
    const generateLinearGradient = (name: string) => {
        const gradients = [
            '#f59e0b, #ef4444, #dc2626',
            '#10b981, #06b6d4, #3b82f6',
            '#8b5cf6, #ec4899, #ef4444',
            '#3b82f6, #6366f1, #8b5cf6',
            '#14b8a6, #06b6d4, #3b82f6',
            '#f43f5e, #ec4899, #8b5cf6'
        ]
        const index = name.length % gradients.length
        return gradients[index]
    }

    return (
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 rounded-xl p-0">
            {/* Main content with profile image background or gradient fallback */}
            <div className={`relative min-h-[200px] text-white rounded-xl overflow-hidden`}
                style={{
                    backgroundImage: group.avatar
                        ? `url(${group.avatar})`
                        : `linear-gradient(135deg, ${generateLinearGradient(groupName)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}>
                {/* Shadow overlay for text readability - stronger shadow for images */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />
                <div className="absolute inset-0 bg-black/30" />

                {/* Content */}
                <div className="relative p-4 sm:p-6 h-full flex flex-col justify-between rounded-xl">
                    {/* Top section with avatar and title */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* Group Avatar with letter badge */}
                        <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-white/40 shadow-2xl rounded-full">
                                <AvatarImage src={group.avatar} alt={groupName} className="rounded-full" />
                                <AvatarFallback className="bg-white/20 text-white font-bold text-xl backdrop-blur-sm border-2 border-white/20 rounded-full">
                                    {getAvatarFallback(groupName)}
                                </AvatarFallback>
                            </Avatar>
                            {/* Letter badge similar to "A" in the image */}
                            {/* <div className="absolute -top-2 -left-2 bg-purple-600 text-white text-sm font-bold h-8 w-8 rounded-full flex items-center justify-center border-2 border-white shadow-xl">
                                {getAvatarFallback(groupName).charAt(0)}
                            </div> */}
                        </div>

                        {/* Group name and member info */}
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                            <h3 className="font-bold text-xl sm:text-2xl mb-2 drop-shadow-lg text-white" title={groupName}>
                                {groupName}
                            </h3>
                            <div className="flex items-center gap-3 text-white/95 text-sm drop-shadow-md">
                                <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4 drop-shadow-sm" />
                                    {group.total_members} members
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom section with badges and action button */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 mt-6">
                        {/* Status badges and date */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                {group.isPrivate ? (
                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Private
                                    </Badge>
                                ) : (
                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg">
                                        <Globe className="h-3 w-3 mr-1" />
                                        Public
                                    </Badge>
                                )}

                                <Badge variant={status == "owner" ? "default" : status == "admin" ? "default" : "secondary"}
                                    className="bg-white/25 text-white border-white/40 backdrop-blur-md shadow-lg">
                                    {status == "owner" ? (
                                        <>
                                            <Crown className="h-3 w-3 mr-1" />
                                            Owner
                                        </>
                                    ) : status == "admin" ? (
                                        <>
                                            <Shield className="h-3 w-3 mr-1" />
                                            Admin
                                        </>
                                    ) : (
                                        "Member"
                                    )}
                                </Badge>
                            </div>

                            <span className="text-sm text-white/80 drop-shadow-md font-medium">
                                Created {formatDate(group.createdAt)}
                            </span>
                        </div>

                        {/* Action button */}
                        <Button
                            onClick={onAction}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-xl px-6 py-2 font-semibold rounded-lg backdrop-blur-sm"
                            size="sm"
                        >
                            {actionIcon}
                            {actionLabel || "Join Group"}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
