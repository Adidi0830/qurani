const fs = require('fs');
const files = [
    'd:/UBIG/PROJECT/PROJECT QURANI/admin-qurani-org/src/app/[lang]/billing/withdraw/page.tsx',
    'd:/UBIG/PROJECT/PROJECT QURANI/admin-qurani-org/src/app/[lang]/billing/wallet/page.tsx',
    'd:/UBIG/PROJECT/PROJECT QURANI/admin-qurani-org/src/app/[lang]/billing/payments/page.tsx',
    'd:/UBIG/PROJECT/PROJECT QURANI/admin-qurani-org/src/app/[lang]/billing/payout/page.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove UserWalletModal import
    content = content.replace(/import\s+\{\s*UserWalletModal\s*\}\s+from\s+[\"']@\/components\/Wallet\/UserWalletModal[\"']\s*;?\r?\n/g, '');
    
    // If useRouter is missing, add it
    if (!content.includes('useRouter')) {
        content = content.replace(/(import .+? from .+\n)/, '$1import { useRouter } from "next/navigation";\n');
    }
    
    // Add router to component if missing
    if (!content.match(/const router = useRouter/)) {
        content = content.replace(/(const \{ t \} = useTranslation|const \{ t \} = useI18n|const \{ profile \} = useAuth.*)/, '$1\n    const router = useRouter();');
    }

    // Replace setSelectedUserId logic
    // Usually it looks like: onClick={(e) => { e.stopPropagation(); setSelectedUserId(String(item.userId)); setSelectedUserName(item.user?.name || `User ID: ${item.userId}`); }}
    content = content.replace(/setSelectedUserId\([^)]+\);\s*setSelectedUserName\([^)]+\);/g, 'router.push(`/${lang || locale}/billing/${item.userId || r.userId || item.studentId}/wallet`);');
    
    // Clean up any remaining usages
    content = content.replace(/setSelectedUserId\([^)]+\)/g, '');
    content = content.replace(/setSelectedUserName\([^)]+\)/g, '');

    // Remove the states
    content = content.replace(/const\s+\[selectedUserId,\s*setSelectedUserId\]\s*=\s*useState<[^>]+>\(null\);?\r?\n/g, '');
    content = content.replace(/const\s+\[selectedUserName,\s*setSelectedUserName\]\s*=\s*useState<[^>]+>\([\"'][\"']\);?\r?\n/g, '');

    // Remove UserWalletModal usage
    content = content.replace(/<UserWalletModal[^>]+>\s*<\/UserWalletModal>/g, '');
    content = content.replace(/<UserWalletModal[^>]+\/>/g, '');

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
}
