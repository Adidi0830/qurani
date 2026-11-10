const fs = require('fs');
const path = require('path');

const generateItems = (count, type, isHistory) => {
  const items = [];
  for (let i = 1; i <= count; i++) {
    const status = isHistory ? (i % 3 === 0 ? 'REJECTED' : 'COMPLETED') : 'PENDING';
    items.push({
      id: (type === 'topup' ? 100 : 200) + (isHistory ? 1000 : 0) + i,
      userId: 500 + i,
      user: { id: 500 + i, name: `User ${i}`, email: `user${i}@example.com`, username: `user${i}` },
      amount: (i % 5 + 1) * 100000,
      status: status,
      paymentMethod: type === 'topup' ? 'BCA Virtual Account' : 'Bank Mandiri',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      completedAt: isHistory ? new Date(Date.now() - i * 3600000 + 1800000).toISOString() : undefined,
      externalReference: isHistory ? `EXT-${Date.now()}-${i}` : null,
      bankCode: type === 'withdraw' ? 'MANDIRI' : undefined,
      accountNumber: type === 'withdraw' ? `1234567890${i}` : undefined,
      accountName: type === 'withdraw' ? `User ${i}` : undefined
    });
  }
  return items;
};

const dummyData = {
  statistics: {
    totalWallets: 1500,
    activeWallets: 1450,
    totalBalance: 15000000,
    totalPendingTopups: 25,
    totalPendingWithdraws: 12,
    volumeToday: 25000000,
    volumeThisMonth: 450000000
  },
  pendingTopups: generateItems(15, 'topup', false),
  pendingWithdraws: generateItems(15, 'withdraw', false),
  topupHistory: generateItems(25, 'topup', true),
  withdrawHistory: generateItems(25, 'withdraw', true)
};

fs.writeFileSync(path.join(__dirname, 'src/data/dummy-wallet.json'), JSON.stringify(dummyData, null, 2));
console.log('Dummy data generated successfully');
