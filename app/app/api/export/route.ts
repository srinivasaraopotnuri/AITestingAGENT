import { NextRequest, NextResponse } from 'next/server'
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx'
import { TEMPLATE_SECTIONS } from '@/lib/template'
import type { TestPlanSections } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { testPlan, ticketId, format }: { testPlan: TestPlanSections; ticketId: string; format: 'docx' | 'pdf' } =
      await req.json()

    if (format === 'docx') {
      const children: Paragraph[] = [
        new Paragraph({
          text: `Test Plan — ${ticketId}`,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ]

      for (const section of TEMPLATE_SECTIONS) {
        const content = testPlan[section.key]

        children.push(
          new Paragraph({
            text: section.label,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        )

        if (section.humanOnly) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '[To be completed by authorized personnel]',
                  italics: true,
                  color: '999999',
                }),
              ],
            })
          )
        } else {
          const lines = (content || '').split('\n')
          for (const line of lines) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: line })],
                spacing: { after: 100 },
              })
            )
          }
        }
      }

      const doc = new Document({ sections: [{ children }] })
      const buffer = await Packer.toBuffer(doc)
      const uint8 = new Uint8Array(buffer)

      return new NextResponse(uint8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="test-plan-${ticketId}.docx"`,
        },
      })
    }

    return NextResponse.json({ error: 'PDF export: use client-side jsPDF' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    )
  }
}
