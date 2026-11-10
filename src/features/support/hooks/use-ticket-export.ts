"use client"

import { useCallback, useRef, useState } from "react"

import { bulkUpdateTickets } from "../data/update"
import type { ExportFormat, TicketListItem, TicketUpdates } from "../model/types"

export interface ExportLabels {
    reportTitle: string
    reportHeading: string
    headers: string[]
}

/** Trigger download file dari Blob di browser. */
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

function escapeXml(value: unknown): string {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Ekspor daftar tiket yang sedang tampil (bukan seluruh hasil query). */
export function useTicketExport() {
    const [isExporting, setIsExporting] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const exportTickets = useCallback(
        (format: ExportFormat, tickets: TicketListItem[], labels: ExportLabels) => {
            if (tickets.length === 0) return

            setIsExporting(true)
            setShowExportDropdown(false)

            const rows = tickets.map((ticket) => [
                ticket.id,
                ticket.ticket_number,
                ticket.subject,
                ticket.department,
                ticket.contact,
                ticket.status,
                ticket.priority,
                ticket.last_reply || "-",
                ticket.submitted_date,
            ])

            if (format === "csv") {
                const csvRows = rows.map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
                )
                const csv = [labels.headers.join(","), ...csvRows].join("\n")
                downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "tickets.csv")
            } else if (format === "excel") {
                const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'
                const workbookStart =
                    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Tickets"><Table>'
                const workbookEnd = "</Table></Worksheet></Workbook>"
                const headerRow =
                    "<Row>" +
                    labels.headers
                        .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
                        .join("") +
                    "</Row>"
                const dataRows = rows
                    .map(
                        (row) =>
                            "<Row>" +
                            row
                                .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
                                .join("") +
                            "</Row>",
                    )
                    .join("")
                downloadBlob(
                    new Blob([xmlHeader + workbookStart + headerRow + dataRows + workbookEnd], {
                        type: "application/vnd.ms-excel",
                    }),
                    "tickets.xls",
                )
            } else {
                const printContent = `
                <html><head><title>${labels.reportTitle}</title><style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #10b981; color: white; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style></head><body>
                  <h1>${labels.reportHeading}</h1>
                  <table><thead><tr>${labels.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
                    <tbody>${rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
                  </table>
                </body></html>`
                const printWindow = window.open("", "_blank")
                if (printWindow) {
                    printWindow.document.write(printContent)
                    printWindow.document.close()
                    setTimeout(() => {
                        printWindow.print()
                        printWindow.close()
                    }, 250)
                }
            }

            setTimeout(() => setIsExporting(false), 300)
        },
        [],
    )

    return { isExporting, showExportDropdown, setShowExportDropdown, dropdownRef, exportTickets }
}

/** Alur bulk update status/priority untuk tiket terpilih. */
export function useTicketBulkUpdate(onDone: () => void | Promise<void>) {
    const [isOpen, setIsOpen] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [status, setStatus] = useState("")
    const [priority, setPriority] = useState("")

    const reset = () => {
        setStatus("")
        setPriority("")
    }

    const close = () => {
        setIsOpen(false)
        reset()
    }

    const confirm = useCallback(
        async (ticketIds: number[]) => {
            const updates: TicketUpdates = {}
            if (status) updates.status = status
            if (priority) updates.priority = priority

            try {
                if (Object.keys(updates).length > 0) {
                    await bulkUpdateTickets(ticketIds, updates)
                }
                setIsOpen(false)
                reset()
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 2000)
                await onDone()
            } catch (error) {
                console.error("[useTicketBulkUpdate] Bulk action error:", error)
            }
        },
        [status, priority, onDone],
    )

    return { isOpen, setIsOpen, showSuccess, status, setStatus, priority, setPriority, close, confirm }
}