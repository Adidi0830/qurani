"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserWalletDetail } from "@/components/Wallet/UserWalletDetail";
import { useI18n } from "@/components/providers/i18n-provider";
import { getSimTransactions } from "@/lib/sim-wallet-store";

function WalletPageContent() {
    const { t } = useI18n();
    const params = useParams();
    const userId = params?.id as string;
    const lang = params?.lang as string;

    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        if (!userId) return;
        
        // Fetch basic user data to pass to UserWalletDetail (mocked for now, from dummy transactions)
        const dummyTxs = getSimTransactions();
        const txData = dummyTxs.filter((tx: any) => String(tx.userId) === userId);
        
        if (txData.length > 0) {
            const latestTx = txData[0];
            setUserData({
                id: userId,
                name: latestTx.user?.name || `User ID: ${userId}`,
                username: latestTx.user?.username,
                email: latestTx.user?.email,
            });
        } else {
            setUserData({ id: userId, name: `User ID: ${userId}` });
        }
    }, [userId]);

    return (
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 min-h-screen">
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link 
                        href={`/${lang}/billing/transaction`}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t("billing.wallet_page.title", "Kelola Wallet Pengguna")}</h1>
                        <p className="text-xs sm:text-sm text-gray-500">{t("billing.wallet_page.subtitle", "Menampilkan detail profil, informasi wallet, dan riwayat transaksi")}</p>
                    </div>
                </div>

                <UserWalletDetail userId={userId} userData={userData} />

            </div>
        </div>
    );
}

export default function UserWalletPage() {
    return (
                <WalletPageContent />
    );
}
