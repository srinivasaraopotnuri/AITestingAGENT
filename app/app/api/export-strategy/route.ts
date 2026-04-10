import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Paragraph, TextRun, HeadingLevel, Packer,
  AlignmentType, BorderStyle, ShadingType,
} from 'docx'
import type { TestStrategyResult } from '@/types'

interface ExportStrategyBody {
  strategy: TestStrategyResult
  projectName: string
  generatedAt: string
}

function sectionHeading(title: string, accentHex: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 26, color: accentHex.replace('#', '') })],
    spacing: { before: 360, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: accentHex.replace('#', '') },
    },
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 120 },
  })
}

function bulletItem(text: string, accentHex: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '● ', bold: true, color: accentHex.replace('#', ''), size: 22 }),
      new TextRun({ text: text.trim(), size: 22 }),
    ],
    spacing: { after: 80 },
    indent: { left: 360 },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { strategy: s, projectName, generatedAt }: ExportStrategyBody = await req.json()

    const children: Paragraph[] = [
      // Title
      new Paragraph({
        children: [new TextRun({ text: `Test Strategy`, bold: true, size: 52, color: '5B21B6' })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: projectName, size: 36, color: '7C3AED' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Generated: ${new Date(generatedAt).toLocaleString()}`, size: 20, color: '888888', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),

      // 1. Testing Objectives
      sectionHeading('1. Testing Objectives', '#5B21B6'),
      ...s.testingObjectives.split('\n').filter(Boolean).map(l => bodyParagraph(l)),

      // 2. Testing Types
      sectionHeading('2. Testing Types', '#0284c7'),
      ...(s.testingTypes || []).map(t => bulletItem(t, '#0284c7')),

      // 3. Tools & Frameworks
      sectionHeading('3. Tools & Frameworks', '#059669'),
      ...s.toolsAndFrameworks.split(/\n|;|,/).filter(t => t.trim()).map(t => bulletItem(t, '#059669')),

      // 4. Automation Approach
      sectionHeading('4. Automation Approach', '#7C3AED'),
      ...s.automationApproach.split('\n').filter(Boolean).map(l => bodyParagraph(l)),

      // Automation coverage summary
      new Paragraph({
        children: [new TextRun({ text: 'Estimated Coverage Targets:', bold: true, size: 22, color: '7C3AED' })],
        spacing: { before: 120, after: 80 },
        indent: { left: 360 },
      }),
      bulletItem('Unit Tests: ~80%', '#7C3AED'),
      bulletItem('Integration Tests: ~70%', '#7C3AED'),
      bulletItem('E2E Tests: ~60%', '#7C3AED'),

      // 5. Risk Assessment
      sectionHeading('5. Risk Assessment', '#E11D48'),
      ...s.riskAssessment.split('\n').filter(Boolean).map(l => bodyParagraph(l)),

      // 6. Entry / Exit Criteria
      sectionHeading('6. Entry / Exit Criteria', '#ca8a04'),
      ...s.entryExitCriteria.split('\n').filter(Boolean).map(l => bodyParagraph(l)),

      // 7. Metrics & Reporting
      sectionHeading('7. Metrics & Reporting', '#0284c7'),
      ...s.metricsAndReporting.split('\n').filter(Boolean).map(l => bodyParagraph(l)),
    ]

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)
    const filename = `test-strategy-${projectName.replace(/\s+/g, '-').toLowerCase()}.docx`

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    )
  }
}
