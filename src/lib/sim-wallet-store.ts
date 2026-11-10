import DUMMY_DATA from "@/data/dummy-wallet.json"
import dummyBillingData from "@/data/billing-dummy.json"
import { getSimOrders, SimOrder } from "@/lib/sim-store"

const PENDING_TOPUPS_KEY = "qurani_sim_pending_topups"
const TOPUP_HISTORY_KEY = "qurani_sim_topup_history"
const TRANSACTIONS_KEY = "qurani_sim_transactions_v3"
const WALLET_STATS_KEY = "qurani_sim_wallet_stats"
const WALLETS_KEY = "qurani_sim_wallets_v2"
const STORE_VERSION_KEY = "qurani_sim_wallet_version"
const STORE_VERSION = "v14-pagination-test"

// ─── RIWAYAT TRANSAKSI DINAMIS ───────────────────────────
function generateDynamicTransactions() {
    const transactions: any[] = [];
    
    // Base static transactions (TopUps, Withdraws, etc)
    const staticTransactions = [
        // TopUps
        { id: "1785723002101", userId: 889977665544101, user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" }, type: 1, typeName: "TopUp", description: "Top up via VA Mandiri", amount: 300000, balanceBefore: 0, balanceAfter: 300000, status: "completed", paymentMethod: "VA Mandiri", referenceId: "EXT-TOP-001", createdAt: new Date(Date.now() - 345600000).toISOString() },
        { id: "1785723002102", userId: 889977665544102, user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" }, type: 1, typeName: "TopUp", description: "Top up via BCA Virtual Account", amount: 200000, balanceBefore: 0, balanceAfter: 200000, status: "completed", paymentMethod: "BCA Virtual Account", referenceId: "EXT-TOP-002", createdAt: new Date(Date.now() - 432000000).toISOString() },
        { id: "1785723002104", userId: 889977665544104, user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" }, type: 1, typeName: "TopUp", description: "Top up via GoPay", amount: 150000, balanceBefore: 0, balanceAfter: 150000, status: "completed", paymentMethod: "GoPay", referenceId: "EXT-TOP-004", createdAt: new Date(Date.now() - 604800000).toISOString() },
        { id: "1785723002105", userId: 889977665544105, user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" }, type: 1, typeName: "TopUp", description: "Top up via Bank BNI", amount: 500000, balanceBefore: 0, balanceAfter: 500000, status: "completed", paymentMethod: "Bank BNI", referenceId: "EXT-TOP-005", createdAt: new Date(Date.now() - 691200000).toISOString() },
        { id: "1785723002106", userId: 889977665544106, user: { name: "Nur Hidayah", email: "nur.hidayah@example.com", username: "nur_hidayah" }, type: 1, typeName: "TopUp", description: "Top up via GoPay", amount: 250000, balanceBefore: 0, balanceAfter: 250000, status: "completed", paymentMethod: "GoPay", referenceId: "EXT-TOP-006", createdAt: new Date(Date.now() - 518400000).toISOString() },
        { id: "1785723002107", userId: 889977665544107, user: { name: "Nia Hidayati", email: "nia.hidayati@mail.com", username: "nia_hidayati" }, type: 1, typeName: "TopUp", description: "Top up via OVO", amount: 400000, balanceBefore: 0, balanceAfter: 400000, status: "completed", paymentMethod: "OVO", referenceId: "EXT-TOP-007", createdAt: new Date(Date.now() - 777600000).toISOString() },
        { id: "1785723002108", userId: 889977665544108, user: { name: "Farid Al-Amin", email: "farid.alamin@edu.id", username: "farid_alamin" }, type: 1, typeName: "TopUp", description: "Top up via Bank Mandiri", amount: 600000, balanceBefore: 0, balanceAfter: 600000, status: "completed", paymentMethod: "Bank Mandiri", referenceId: "EXT-TOP-008", createdAt: new Date(Date.now() - 864000000).toISOString() },
        { id: "1785723002109", userId: 889977665544109, user: { name: "Halimah Tussa'diyah", email: "halimah.ts@gmail.com", username: "halimah_ts" }, type: 1, typeName: "TopUp", description: "Top up via Dana", amount: 350000, balanceBefore: 0, balanceAfter: 350000, status: "completed", paymentMethod: "Dana", referenceId: "EXT-TOP-009", createdAt: new Date(Date.now() - 950400000).toISOString() },
        { id: "1785723002110", userId: 889977665544110, user: { name: "Muhammad Yusuf", email: "m.yusuf@qurani.id", username: "m_yusuf" }, type: 1, typeName: "TopUp", description: "Top up via ShopeePay", amount: 450000, balanceBefore: 0, balanceAfter: 450000, status: "completed", paymentMethod: "ShopeePay", referenceId: "EXT-TOP-010", createdAt: new Date(Date.now() - 1036800000).toISOString() },
        // Withdraws
        { id: "178572300270100000", userId: 889977665544101, user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" }, type: 2, typeName: "Withdraw", description: "Penarikan ke Bank BCA", amount: -200000, balanceBefore: 300000, balanceAfter: 100000, status: "completed", paymentMethod: "Bank BCA", referenceId: "WD-REF-001", createdAt: new Date(Date.now() - 172800000).toISOString() },
        { id: "178572300270300000", userId: 889977665544103, user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" }, type: 2, typeName: "Withdraw", description: "Penarikan ke Bank BNI", amount: -500000, balanceBefore: 500000, balanceAfter: 0, status: "completed", paymentMethod: "Bank BNI", referenceId: "WD-REF-003", createdAt: new Date(Date.now() - 518400000).toISOString() },
        { id: "178572300270400000", userId: 889977665544104, user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" }, type: 2, typeName: "Withdraw", description: "Penarikan ke Bank BRI", amount: -250000, balanceBefore: 250000, balanceAfter: 0, status: "completed", paymentMethod: "Bank BRI", referenceId: "WD-REF-004", createdAt: new Date(Date.now() - 604800000).toISOString() }
    ];

    transactions.push(...staticTransactions);

    // Build package name lookup from trainerPackages for richer descriptions
    const pkgMap: Record<string, string> = {};
    const trainerNameMap: Record<number, string> = {};
    (dummyBillingData.trainerPackages || []).forEach((pkg: any) => {
        pkgMap[String(pkg.id)] = pkg.name;
        trainerNameMap[pkg.trainerId] = pkg.trainerName;
    });

    const staticBookings = dummyBillingData.bookings || [];
    const simOrders = getSimOrders() || [];

    const allBookings = [
        ...staticBookings.map((b: any) => {
            const isCompleted = b.sessions && b.sessions.every((s:any) => s.status === "completed") && b.sessions.length > 0;
            // Try to get the package name from trainerPackages
            const pkgId = b.payment?.packageId || b.packageId;
            const packageName = pkgId ? (pkgMap[String(pkgId)] || null) : null;
            const trainerName = b.trainer?.name || (b.trainerId ? trainerNameMap[b.trainerId] : null) || "";
            return {
                id: b.bookingId,
                user: b.member || { id: 0, name: "" },
                trainer: b.trainer || { id: 0, name: trainerName },
                amount: b.payment?.pricePackage || b.payment?.total || 0,
                status: isCompleted ? "selesai" : (b.payment?.status === "paid" ? "paid" : "pending"),
                paymentMethod: b.payment?.method || "Transfer",
                createdAt: b.payment?.paidAt || b.createdAt || new Date().toISOString(),
                packageName,
                trainerId: b.trainerId || b.trainer?.id,
            }
        }),
        ...simOrders.map((o: SimOrder) => ({
            id: o.id,
            user: o.member,
            trainer: o.trainer,
            amount: o.pkg.price,
            status: o.status === "completed" ? "selesai" : (o.paymentStatus === "paid" ? "paid" : "pending"),
            paymentMethod: o.paymentGateway || "Transfer",
            createdAt: o.paidAt || o.bookingDate || new Date().toISOString(),
            packageName: o.pkg.name || null,
            trainerId: o.trainer?.id,
        }))
    ];

    // For every booking, we need a payment (deducting from user)
    // and if completed, a payout (adding to teacher)
    allBookings.forEach(b => {
        if (b.status === "paid" || b.status === "selesai") {
            // Deskripsi dengan nama paket jika tersedia
            const pkgLabel = b.packageName
                ? `${b.packageName}${b.trainer?.name ? ` — ${b.trainer.name}` : ""}`
                : `Pesanan #${b.id}`;
            
            // User Payment Transaction
            transactions.push({
                id: `TXN-PAY-${b.id}`,
                userId: b.user.id,
                user: { name: b.user.name, email: "", username: "" },
                type: 4,
                typeName: "Payment",
                description: `Pembayaran ${pkgLabel}`,
                amount: -Math.abs(b.amount),
                balanceBefore: 0,
                balanceAfter: -Math.abs(b.amount),
                status: "completed",
                paymentMethod: b.paymentMethod,
                referenceId: `TXN-PAY-REF-${b.id}`,
                createdAt: b.createdAt
            });
        }

        if (b.status === "selesai") {
            const pkgLabel = b.packageName
                ? `${b.packageName}${b.user?.name ? ` dari ${b.user.name}` : ""}`
                : `Pesanan #${b.id}`;

            // Teacher Payout Transaction
            transactions.push({
                id: `TXN-IN-${b.id}`,
                userId: b.trainer.id,
                user: { name: b.trainer.name, email: "", username: "" },
                type: 4,
                typeName: "Payment",
                description: `Payout ${pkgLabel}`,
                amount: Math.floor(b.amount * 0.8),
                balanceBefore: 0,
                balanceAfter: Math.floor(b.amount * 0.8),
                status: "completed",
                paymentMethod: "Qurani Wallet",
                referenceId: `TXN-IN-REF-${b.id}`,
                createdAt: b.createdAt
            });
        }
    });

    // sort desc by createdAt
    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const DUMMY_PENDING_TOPUPS = [
    {
        id: "1785723002001",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        amount: 300000,
        status: "PENDING",
        paymentMethod: "VA Mandiri",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002002",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        amount: 200000,
        status: "PENDING",
        paymentMethod: "BCA Virtual Account",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002003",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@yahoo.com", username: "siti_a" },
        amount: 250000,
        status: "PENDING",
        paymentMethod: "Bank Transfer",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002004",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        amount: 150000,
        status: "PENDING",
        paymentMethod: "GoPay",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002005",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        amount: 500000,
        status: "PENDING",
        paymentMethod: "Bank BNI",
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        externalReference: null
    }
];

const DUMMY_TOPUP_HISTORY = [
    {
        id: "1785723002101",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        amount: 300000,
        status: "COMPLETED",
        paymentMethod: "VA Mandiri",
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        completedAt: new Date(Date.now() - 345500000).toISOString(),
        externalReference: "EXT-TOP-001",
        rejectionReason: null
    },
    {
        id: "1785723002102",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        amount: 200000,
        status: "COMPLETED",
        paymentMethod: "BCA Virtual Account",
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        completedAt: new Date(Date.now() - 431000000).toISOString(),
        externalReference: "EXT-TOP-002",
        rejectionReason: null
    },
    {
        id: "1785723002103",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@yahoo.com", username: "siti_a" },
        amount: 250000,
        status: "REJECTED",
        paymentMethod: "Bank Transfer",
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        completedAt: new Date(Date.now() - 518000000).toISOString(),
        externalReference: null,
        rejectionReason: "Data tidak valid"
    },
    {
        id: "1785723002104",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        amount: 150000,
        status: "COMPLETED",
        paymentMethod: "GoPay",
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        completedAt: new Date(Date.now() - 604000000).toISOString(),
        externalReference: "EXT-TOP-004",
        rejectionReason: null
    },
    {
        id: "1785723002105",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        amount: 500000,
        status: "COMPLETED",
        paymentMethod: "Bank BNI",
        createdAt: new Date(Date.now() - 691200000).toISOString(),
        completedAt: new Date(Date.now() - 691000000).toISOString(),
        externalReference: "EXT-TOP-005",
        rejectionReason: null
    }
];

export function initSimWalletStore(forceReset = false) {
    if (typeof window === "undefined") return;

    const currentVersion = localStorage.getItem(STORE_VERSION_KEY);
    if (forceReset || currentVersion !== STORE_VERSION) {
        localStorage.removeItem(PENDING_TOPUPS_KEY);
        localStorage.removeItem(TOPUP_HISTORY_KEY);
        localStorage.removeItem(TRANSACTIONS_KEY);
        localStorage.removeItem(WALLET_STATS_KEY);
        localStorage.removeItem(WALLETS_KEY);
        localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION);
    }

    if (!localStorage.getItem(PENDING_TOPUPS_KEY)) {
        localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(DUMMY_PENDING_TOPUPS));
    }
    
    if (!localStorage.getItem(TOPUP_HISTORY_KEY)) {
        localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(DUMMY_TOPUP_HISTORY));
    }
    
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(generateDynamicTransactions()));
    }

    if (!localStorage.getItem(WALLET_STATS_KEY)) {
        localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(DUMMY_DATA.statistics || {}));
    }
    
    if (!localStorage.getItem(WALLETS_KEY)) {
        localStorage.setItem(WALLETS_KEY, JSON.stringify({}));
    }
}

export function getSimPendingTopups(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(PENDING_TOPUPS_KEY) || "[]");
    } catch { return []; }
}

export function getSimTopupHistory(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(TOPUP_HISTORY_KEY) || "[]");
    } catch { return []; }
}

export function getSimTransactions(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || "[]");
    } catch { return []; }
}

export function getSimWalletStats(): any {
    if (typeof window === "undefined") return {};
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(WALLET_STATS_KEY) || "{}");
    } catch { return {}; }
}

export function confirmSimTopup(id: number | string, extRef?: string): void {
    const pending = getSimPendingTopups();
    const history = getSimTopupHistory();
    const transactions = getSimTransactions();
    const stats = getSimWalletStats();

    const idx = pending.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = pending[idx];
    
    // Remove from pending
    pending.splice(idx, 1);
    
    // Add to topup history
    const historyItem = {
        ...item,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        externalReference: extRef || `EXT-${Date.now()}`,
        rejectionReason: null
    };
    history.unshift(historyItem);

    // Add to transaction history
    const balanceBefore = 0; // dummy balance logic
    const balanceAfter = item.amount;
    const txItem = {
        id: Date.now(),
        userId: item.userId,
        user: item.user,
        type: 1,
        typeName: "TopUp",
        description: `Top up via ${item.paymentMethod || 'Manual'}`,
        amount: item.amount,
        balanceBefore,
        balanceAfter,
        status: "completed",
        referenceId: `TXN-TOPUP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        createdAt: new Date().toISOString()
    };
    transactions.unshift(txItem);

    // Update stats (dummy)
    stats.totalPendingTopups = Math.max(0, (stats.totalPendingTopups || 0) - 1);
    stats.totalBalance = (stats.totalBalance || 0) + item.amount;

    localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(pending));
    localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(stats));
}

export function rejectSimTopup(id: number | string, reason?: string): void {
    const pending = getSimPendingTopups();
    const history = getSimTopupHistory();
    const stats = getSimWalletStats();

    const idx = pending.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = pending[idx];
    
    // Remove from pending
    pending.splice(idx, 1);
    
    // Add to topup history
    const historyItem = {
        ...item,
        status: "REJECTED",
        completedAt: new Date().toISOString(),
        externalReference: null,
        rejectionReason: reason || "Ditolak oleh Admin"
    };
    history.unshift(historyItem);

    // Update stats
    stats.totalPendingTopups = Math.max(0, (stats.totalPendingTopups || 0) - 1);

    localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(pending));
    localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(stats));
}

export function getSimWallet(userId: string | number): any {
    if (typeof window === "undefined") return {};
    try {
        initSimWalletStore();
        const wallets = JSON.parse(localStorage.getItem(WALLETS_KEY) || "{}");
        if (!wallets[userId]) {
            wallets[userId] = {
                id: `W-MOCK-${userId.toString().slice(0, 6)}`,
                status: "active",
                limits: {
                    dailyTopupLimit: 10000000,
                    dailyWithdrawLimit: 5000000,
                    dailyTransferLimit: 5000000,
                    minWithdrawAmount: 50000,
                    maxBalance: 100000000
                },
                suspendReason: null,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
        }
        return wallets[userId];
    } catch { return {}; }
}

export function updateSimWallet(userId: string | number, updates: any): any {
    if (typeof window === "undefined") return {};
    try {
        const wallets = JSON.parse(localStorage.getItem(WALLETS_KEY) || "{}");
        if (!wallets[userId]) {
            wallets[userId] = { 
                id: `W-MOCK-${userId.toString().slice(0, 6)}`, 
                status: "active", 
                limits: {
                    dailyTopupLimit: 10000000,
                    dailyWithdrawLimit: 5000000,
                    dailyTransferLimit: 5000000,
                    minWithdrawAmount: 50000,
                    maxBalance: 100000000
                },
                suspendReason: null
            };
        }
        wallets[userId] = { ...wallets[userId], ...updates };
        localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
        return wallets[userId];
    } catch { return {}; }
}

export function getSimWalletBalances(userId: string | number) {
    const txs = getSimTransactions().filter((tx: any) => String(tx.userId) === String(userId));
    
    let activeBalance = 0;
    let pendingBalance = 0;

    for (const tx of txs) {
        if (tx.status === 'completed') {
            activeBalance += tx.amount;
        } else if (tx.status === 'pending' || tx.status === 'waiting') {
            pendingBalance += Math.abs(tx.amount); // Treat pending amounts as positive pending balance
        }
    }

    return { 
        balance: Math.max(0, activeBalance), 
        activeBalance: Math.max(0, activeBalance), 
        pendingBalance: Math.max(0, pendingBalance)
    };
}

// ─── PAYOUT DATA UNTUK GURU ────────────────────────────────────────────────────

/**
 * Generate dummy payout records untuk seorang guru (trainer).
 * Data diturunkan dari bookings yang sudah selesai di billing-dummy.json + sim orders.
 * @param userId  userId / trainerId guru
 */
export function getSimPayouts(userId: string | number): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        const txs = getSimTransactions();
        // Payout = transaksi dengan amount positif (pemasukan) yang terkait user ini
        const payouts = txs.filter((tx: any) =>
            String(tx.userId) === String(userId) &&
            tx.amount > 0 &&
            (tx.typeName === "Payment" || tx.type === 4)
        );

        // Tambah beberapa payout dummy jika kosong, agar UI tidak kosong
        if (payouts.length === 0) {
            const now = Date.now();
            return [
                {
                    id: `PO-${userId}-001`,
                    userId: Number(userId),
                    orderId: `ORD-${userId}-1001`,
                    packageName: "5x Pertemuan",
                    amount: Math.floor(85000 * 0.8),
                    status: "completed",
                    createdAt: new Date(now - 7 * 86400000).toISOString(),
                    paidAt: new Date(now - 6 * 86400000).toISOString(),
                },
                {
                    id: `PO-${userId}-002`,
                    userId: Number(userId),
                    orderId: `ORD-${userId}-1002`,
                    packageName: "1x Pertemuan",
                    amount: Math.floor(120000 * 0.8),
                    status: "pending",
                    createdAt: new Date(now - 2 * 86400000).toISOString(),
                    paidAt: null,
                },
                {
                    id: `PO-${userId}-003`,
                    userId: Number(userId),
                    orderId: `ORD-${userId}-1003`,
                    packageName: "10x Pertemuan",
                    amount: Math.floor(550000 * 0.8),
                    status: "completed",
                    createdAt: new Date(now - 14 * 86400000).toISOString(),
                    paidAt: new Date(now - 13 * 86400000).toISOString(),
                },
                {
                    id: `PO-${userId}-004`,
                    userId: Number(userId),
                    orderId: `ORD-${userId}-1004`,
                    packageName: "5x Pertemuan",
                    amount: Math.floor(375000 * 0.8),
                    status: "pending",
                    createdAt: new Date(now - 1 * 86400000).toISOString(),
                    paidAt: null,
                },
            ];
        }

        return payouts.map((tx: any, i: number) => ({
            id: tx.referenceId || `PO-${userId}-${i + 1}`,
            userId: tx.userId,
            orderId: tx.referenceId || tx.id,
            packageName: tx.description || "Pembayaran Pesanan",
            amount: tx.amount,
            status: tx.status === "completed" ? "completed" : "pending",
            createdAt: tx.createdAt,
            paidAt: tx.status === "completed" ? tx.createdAt : null,
        }));
    } catch { return []; }
}

