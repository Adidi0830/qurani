"use client";

import { QRCodeCanvas } from "qrcode.react";

export default function GroupInviteQR({ invitationUrl }: { invitationUrl: string }) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Scan to Join Group
      </h2>
      <QRCodeCanvas
        value={invitationUrl}
        size={200} // ukuran pixel
        bgColor="#ffffff"
        fgColor="#000000"
        level="H" // tingkat koreksi error (L, M, Q, H)
        includeMargin={true}
      />
      <p className="text-sm text-slate-500 break-all text-center">
        {invitationUrl}
      </p>
    </div>
  );
}
