import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Globe, Lock, Shield, Users } from "lucide-react";
import { GroupCardProps } from "@/types/grup";

export function GroupCard({ group, status, onAction, actionLabel, actionIcon }: GroupCardProps) {
    // Safe fallbacks for group name
    const groupName = group.name || 'Unnamed Group';

    // Generate avatar fallback safely
    const getAvatarFallback = (name: string) => {
        return name
            .split(" ")
            .filter(n => n.length > 0)
            .slice(0, 2) // Max 2 initials
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "G"; // Fallback to "G" if nothing
    };

    // Safe date formatting - Indonesian format (DD MMM YYYY)
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return 'Invalid date';
            const day = date.getDate().toString().padStart(2, "0");
            const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return 'Invalid date';
        }
    };

    // Generate gradient colors based on group name
    const generateGradient = (name: string) => {
        const gradients = [
            'from-blue-500 to-purple-600',
            'from-green-500 to-blue-600',
            'from-purple-500 to-pink-600',
            'from-gray-500 to-gray-600',
            'from-teal-500 to-cyan-600',
            'from-indigo-500 to-purple-600'
        ];
        const index = name.length % gradients.length;
        return gradients[index];
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            {/* Header with gradient background and shadow overlay */}
            <div className={`relative h-24 bg-gradient-to-r ${generateGradient(groupName)} text-white`}>
                {/* Shadow overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-black/40" />
                <div className="absolute inset-0 bg-black/10" />

                {/* Header content */}
                <div className="relative p-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Group Avatar */}
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-white/20">
                                <AvatarImage src={group.avatar} alt={groupName} />
                                <AvatarFallback className="bg-white/20 text-white font-semibold backdrop-blur-sm">
                                    {getAvatarFallback(groupName)}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Group Info */}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg truncate" title={groupName}>{groupName}</h3>
                            <div className="flex items-center gap-2 text-sm text-white/80">
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {group.total_members} members
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                                    {Math.floor(group.total_members * 0.3)} online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom section with details and action */}
            <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Status badges and creation date */}
                    <div className="flex flex-wrap items-center gap-2">
                        {group.isPrivate ? (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Public
                            </Badge>
                        )}

                        <Badge variant={status == "owner" ? "default" : status == "admin" ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                            {status == "owner" ? (
                                <>
                                    <Crown className="h-3 w-3" />
                                    Owner
                                </>
                            ) : status == "admin" ? (
                                <>
                                    <Shield className="h-3 w-3" />
                                    Admin
                                </>
                            ) : (
                                "Member"
                            )}
                        </Badge>

                        <span className="text-xs text-muted-foreground">
                            Created {formatDate(group.createdAt)}
                        </span>
                    </div>

                    {/* Action button */}
                    <Button
                        size="sm"
                        onClick={onAction}
                        className="flex items-center gap-2 whitespace-nowrap"
                        variant={status === "member" ? "outline" : "default"}
                    >
                        {actionIcon}
                        {actionLabel}
                    </Button>
                </div>
            </div>
        </Card>
    )
}