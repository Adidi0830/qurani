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
    
    // Remove multi-line UserWalletModal
    content = content.replace(/<UserWalletModal[^>]*\/>/g, '');
    content = content.replace(/<UserWalletModal[\s\S]*?<\/UserWalletModal>/g, '');
    
    // Also catch the specific format used in these files
    content = content.replace(/<UserWalletModal[\s\S]*?\/>/g, '');

    fs.writeFileSync(file, content);
    console.log('Cleaned ' + file);
}
