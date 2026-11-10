"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { UserWalletDetail } from "@/components/Wallet/UserWalletDetail";

interface UserWalletModalProps {
    userId: string | number | null;
    userName?: string;
    onClose: () => void;
}

export function UserWalletModal({ userId, userName, onClose }: UserWalletModalProps) {
    const isOpen = userId !== null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Dompet & Transaksi {userName ? `- ${userName}` : "Pengguna"}
                    </DialogTitle>
                </DialogHeader>
                
                {userId && (
                    <div className="mt-4">
                        <UserWalletDetail 
                            userId={String(userId)} 
                            hideProfileCard={false}
                            hideLimitFeature={false}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
