import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } }
import type { ParseDocumentResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let source: ParseDocumentResponse['source']

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value.trim()
      source = 'docx'
    } else if (ext === 'pdf') {
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      text = result.text.trim()
      source = 'docx' // reuse docx source type for PDF
    } else if (ext === 'txt') {
      text = buffer.toString('utf-8').trim()
      source = 'txt'
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF, DOCX, or TXT. For images, use the browser OCR (PNG/JPG).' },
        { status: 400 }
      )
    }

    if (!text) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 })
    }

    return NextResponse.json({ text, source } satisfies ParseDocumentResponse)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Parse failed' },
      { status: 500 }
    )
  }
}
