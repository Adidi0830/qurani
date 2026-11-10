import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export interface SelectionEmailPayload {
  trainerName: string
  trainerEmail: string
  date: string          // "2026-07-15"
  time: string          // "09:00"
  timeEnd?: string      // "10:00"
  timezone?: string
  duration?: string      // "60 menit"
  method: "online" | "offline"
  link: string          // zoom link or location
  pengujiName: string
  pengujiSpecialty: string
  notes?: string
  trainerId: number
}

function buildEmailHtml(data: SelectionEmailPayload): string {
  const dateObj = new Date(`${data.date}T${data.time}:00`)
  const dateFormatted = dateObj.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  })

  const methodLabel = data.method === "online" ? "Online (Zoom / Google Meet)" : "Tatap Muka (Offline)"
  const linkLabel = data.method === "online"
    ? `<a href="${data.link}" style="color:#059669;text-decoration:underline;">${data.link}</a>`
    : data.link

  const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://quraniadmin.ubig.web.id"}/teachers/confirm?id=${data.trainerId}&response=hadir`
  const rescheduleUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://quraniadmin.ubig.web.id"}/teachers/confirm?id=${data.trainerId}&response=reschedule`

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Undangan Seleksi Guru – Qurani</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#0d9488 100%);padding:36px 40px;text-align:center;">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || "https://quraniadmin.ubig.web.id"}/icons/Qurani%20-%20Logo%20White.png" alt="Qurani Logo" style="height: 48px; object-fit: contain; margin-bottom: 8px;" />
            <div style="font-size:13px;color:#a7f3d0;margin-top:4px;">Platform Pembelajaran Al-Qur'an</div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 0;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Undangan Wawancara Seleksi
            </h1>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
              Assalamu'alaikum warahmatullahi wabarakatuh,<br>
              Halo <strong style="color:#111827;">${data.trainerName}</strong>,
            </p>
            <p style="margin:12px 0 0;color:#374151;font-size:14px;line-height:1.6;">
              Alhamdulillah, kami telah meninjau profil Anda dan dengan senang hati mengundang Anda
              untuk mengikuti <strong>wawancara seleksi calon guru Qurani</strong>.
              Berikut adalah detail jadwal seleksi Anda:
            </p>
          </td>
        </tr>

        <!-- Schedule Card -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1.5px solid #a7f3d0;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;background:#059669;">
                  <span style="font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;">
                    Detail Jadwal Seleksi
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Tanggal</span>
                        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">${dateFormatted}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Waktu</span>
                        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">${timeFormatted} ${data.timeEnd ? `- ${data.timeEnd}` : ""} ${data.timezone || "WIB"}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Metode</span>
                        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">${methodLabel}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">${data.method === "online" ? "Link Pertemuan" : "Lokasi"}</span>
                        <div style="font-size:14px;font-weight:600;color:#059669;margin-top:2px;word-break:break-all;">${linkLabel}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Tim Penyeleksi</span>
                        <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">${data.pengujiName}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:1px;">${data.pengujiSpecialty}</div>
                      </td>
                    </tr>
                    ${data.notes ? `
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Catatan Persiapan</span>
                        <div style="font-size:14px;color:#374151;margin-top:2px;line-height:1.5;">${data.notes}</div>
                      </td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Confirmation Buttons -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0 0 16px;font-size:14px;color:#374151;font-weight:600;">
              Mohon konfirmasi kehadiran Anda:
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${confirmUrl}" style="display:inline-block;background:#059669;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;">
                    Ya, Saya Hadir
                  </a>
                </td>
                <td>
                  <a href="${rescheduleUrl}" style="display:inline-block;background:#ffffff;color:#dc2626;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;border:2px solid #fecaca;">
                    Minta Reschedule
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
              Jika tombol tidak berfungsi, kunjungi portal Qurani untuk konfirmasi.
            </p>
          </td>
        </tr>

        <!-- Tips -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Tips Persiapan Seleksi</p>
              <ul style="margin:0;padding-left:16px;font-size:13px;color:#78350f;line-height:1.8;">
                <li>Pastikan koneksi internet stabil (jika online)</li>
                <li>Siapkan dokumen sertifikat asli untuk diperlihatkan</li>
                <li>Masuk ke link 5 menit sebelum waktu yang ditentukan</li>
                <li>Siapkan contoh mengajar singkat Al-Qur'an</li>
              </ul>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              Email ini dikirim otomatis oleh sistem <strong>Qurani Admin</strong>.<br>
              Pertanyaan? Hubungi kami di <a href="mailto:support@qurani.com" style="color:#059669;">support@qurani.com</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
              © 2026 Qurani. Hak cipta dilindungi.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body: SelectionEmailPayload = await req.json()

    const gmailUser = process.env.GMAIL_USER
    const gmailPass = process.env.GMAIL_APP_PASSWORD

    // If Gmail not configured, return mock success (for development)
    if (!gmailUser || gmailPass === "xxxx xxxx xxxx xxxx" || !gmailPass) {
      console.log("[send-selection-email] Gmail not configured, returning mock success")
      console.log("[send-selection-email] Would send to:", body.trainerEmail)
      return NextResponse.json({ success: true, mock: true, message: "Email simulated (Gmail not configured)" })
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass.replace(/\s/g, "") },
    })

    // Determine recipient: use test email override if available
    const testEmail = process.env.SELEKSI_TEST_EMAIL
    const recipient = (testEmail && testEmail !== "your-email@gmail.com") ? testEmail : body.trainerEmail

    await transporter.sendMail({
      from: `"Qurani Admin" <${gmailUser}>`,
      to: recipient,
      subject: `📋 Undangan Seleksi Guru Qurani – ${body.trainerName}`,
      html: buildEmailHtml(body),
      text: `
Undangan Seleksi Guru Qurani

Kepada: ${body.trainerName}
Tanggal: ${body.date}
Jam: ${body.time} ${body.timeEnd ? `- ${body.timeEnd}` : ""} ${body.timezone || "WIB"}
Metode: ${body.method}
Link/Lokasi: ${body.link}
Penguji: ${body.pengujiName} (${body.pengujiSpecialty})
Catatan: ${body.notes || "-"}

Silakan konfirmasi kehadiran Anda melalui portal Qurani Admin.
            `.trim(),
    })

    return NextResponse.json({
      success: true,
      mock: false,
      recipient,
      message: `Email berhasil dikirim ke ${recipient}`,
    })
  } catch (err: any) {
    console.error("[send-selection-email] Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
