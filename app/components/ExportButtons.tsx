'use client'

import { useState } from 'react'
import { FileText, FileDown, Loader2 } from 'lucide-react'
import type { TestPlanSections } from '@/types'
import { TEMPLATE_SECTIONS } from '@/lib/template'

interface Props {
  testPlan: TestPlanSections
  ticketId: string
  generatedAt: string
}

export default function ExportButtons({ testPlan, ticketId, generatedAt }: Props) {
  const [loadingDocx, setLoadingDocx] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  async function downloadDocx() {
    setLoadingDocx(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPlan, ticketId, format: 'docx' }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-plan-${ticketId}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoadingDocx(false)
    }
  }

  async function downloadPdf() {
    setLoadingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`Test Plan — ${ticketId}`, 20, 20)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(`Generated: ${new Date(generatedAt).toLocaleString()}`, 20, 30)

      let y = 45
      const pageHeight = doc.internal.pageSize.height
      const margin = 20
      const lineHeight = 6

      for (const section of TEMPLATE_SECTIONS) {
        if (y > pageHeight - 40) { doc.addPage(); y = 20 }

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(60, 60, 200)
        doc.text(section.label, margin, y)
        y += 8

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(40, 40, 40)

        const content = section.humanOnly
          ? '[Human sign-off required]'
          : testPlan[section.key] || 'Not generated'

        const lines = doc.splitTextToSize(content, 170)
        for (const line of lines) {
          if (y > pageHeight - 20) { doc.addPage(); y = 20 }
          doc.text(line, margin, y)
          y += lineHeight
        }
        y += 6
      }

      doc.save(`test-plan-${ticketId}.pdf`)
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={downloadDocx}
        disabled={loadingDocx}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loadingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Download .docx
      </button>
      <button
        onClick={downloadPdf}
        disabled={loadingPdf}
        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        Download .pdf
      </button>
    </div>
  )
}
