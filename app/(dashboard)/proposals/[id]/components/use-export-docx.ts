'use client'

import { useState, useCallback } from 'react'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TabStopPosition,
  TabStopType,
} from 'docx'
import { saveAs } from 'file-saver'

interface ChapterItem {
  chapter: string
  sort_order: number
  type?: string
}

interface Section {
  id: string
  title: string
  sort_order: number
  content: ChapterItem[] | null
  header1: ChapterItem[] | null
  header2: ChapterItem[] | null
  tabulation: ChapterItem[] | null
}

// Color constants matching the PDF export
const NAVY = '1B3A5C'
const GOLD = 'C5960C'
const TEXT_COLOR = '1a1a1a'
const GRAY = '555555'

function formatInlineRuns(text: string, baseOpts: object = {}): TextRun[] {
  const runs: TextRun[] = []
  const parts = text.split(/(\*\*.+?\*\*)/)
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, ...baseOpts }))
    } else if (part) {
      runs.push(new TextRun({ text: part, ...baseOpts }))
    }
  }
  return runs
}

function parseTabulationRows(text: string): string[][] {
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => line.split('|').map((cell) => cell.trim()))
}

function buildTable(rows: string[][]): Table {
  const colCount = rows[0]?.length || 0
  const isKv = colCount <= 2

  if (isKv) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: NAVY },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row[0] || '',
                        bold: true,
                        color: 'ffffff',
                        font: 'Calibri',
                        size: 20,
                      }),
                    ],
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row[1] || '',
                        color: TEXT_COLOR,
                        font: 'Calibri',
                        size: 20,
                      }),
                    ],
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              }),
            ],
          })
      ),
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
      },
    })
  }

  // Multi-column table with header row
  const [headerRow, ...bodyRows] = rows
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerRow.map(
          (cell) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: NAVY },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      bold: true,
                      color: 'ffffff',
                      font: 'Calibri',
                      size: 18,
                      allCaps: true,
                    }),
                  ],
                  spacing: { before: 40, after: 40 },
                }),
              ],
              borders: {
                bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
              },
            })
        ),
      }),
      ...bodyRows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          color: TEXT_COLOR,
                          font: 'Calibri',
                          size: 18,
                        }),
                      ],
                      spacing: { before: 40, after: 40 },
                    }),
                  ],
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
                    left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
                    right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
                  },
                })
            ),
          })
      ),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  })
}

function buildBulletParagraphs(text: string): Paragraph[] {
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const cleaned = line.replace(/^[•\-]\s*/, '').trim()
      return new Paragraph({
        children: formatInlineRuns(cleaned, {
          font: 'Calibri',
          size: 21,
          color: TEXT_COLOR,
        }),
        indent: { left: 450, hanging: 220 },
        spacing: { before: 40, after: 40 },
        tabStops: [{ type: TabStopType.LEFT, position: TabStopPosition.MAX }],
        bullet: { level: 0 },
      })
    })
}

export function useExportDocx() {
  const [isExporting, setIsExporting] = useState(false)

  const exportDocx = useCallback(async (sections: Section[], proposalTitle: string) => {
    if (sections.length === 0) return

    setIsExporting(true)
    try {
      const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order)
      const docChildren: (Paragraph | Table)[] = []

      // Derive cover info
      const coverSection = sorted[0]
      const coverItems = (coverSection?.content || []).sort((a, b) => a.sort_order - b.sort_order)
      const orgName = coverItems[0]?.chapter || ''
      const projectTitle = coverItems[1]?.chapter || ''
      const metaItems = coverItems.slice(2)
      const footerText = orgName ? `${orgName} | Grant Proposal` : proposalTitle

      // ── Cover ──
      docChildren.push(
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'GRANT PROPOSAL',
              font: 'Calibri',
              size: 26,
              bold: true,
              color: 'ffffff',
              allCaps: true,
              characterSpacing: 120,
            }),
          ],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, fill: NAVY },
          spacing: { before: 800, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: orgName,
              font: 'Georgia',
              size: 44,
              bold: true,
              color: GOLD,
            }),
          ],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, fill: NAVY },
          spacing: { before: 100, after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: projectTitle,
              font: 'Calibri',
              size: 22,
              color: 'ffffff',
            }),
          ],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, fill: NAVY },
          spacing: { after: 600 },
        })
      )

      // Meta items (date, submitted to, etc.)
      for (const meta of metaItems) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: meta.chapter,
                font: 'Calibri',
                size: 18,
                color: GRAY,
                italics: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 20, after: 20 },
          })
        )
      }

      // ── Body sections ──
      for (let idx = 1; idx < sorted.length; idx++) {
        const section = sorted[idx]
        if (/table of contents/i.test(section.title)) continue

        // Section title (h1 equivalent)
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.title.toUpperCase(),
                font: 'Georgia',
                size: 28,
                bold: true,
                color: NAVY,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 4 } },
          })
        )

        // Collect and sort all tagged items
        type TaggedItem = ChapterItem & { type: string }
        const tagged: TaggedItem[] = []
        const add = (arr: ChapterItem[] | null, fallbackType: string) => {
          if (!Array.isArray(arr)) return
          arr.forEach((item) => tagged.push({ ...item, type: item.type || fallbackType }))
        }
        add(section.header1, 'header1')
        add(section.header2, 'header2')
        add(section.content, 'content')
        add(section.tabulation, 'tabulation')
        tagged.sort((a, b) => a.sort_order - b.sort_order)

        for (const item of tagged) {
          switch (item.type) {
            case 'header1':
              docChildren.push(
                new Paragraph({
                  children: formatInlineRuns(item.chapter, {
                    font: 'Georgia',
                    size: 26,
                    bold: true,
                    color: NAVY,
                  }),
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 280, after: 80 },
                  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 3 } },
                })
              )
              break
            case 'header2':
              docChildren.push(
                new Paragraph({
                  children: formatInlineRuns(item.chapter, {
                    font: 'Calibri',
                    size: 22,
                    bold: true,
                    italics: true,
                    color: TEXT_COLOR,
                  }),
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 200, after: 40 },
                })
              )
              break
            case 'tabulation':
            case 'table': {
              const rows = parseTabulationRows(item.chapter)
              if (rows.length > 0) {
                docChildren.push(buildTable(rows))
                docChildren.push(new Paragraph({ spacing: { before: 80 } }))
              }
              break
            }
            default: {
              const lines = item.chapter.split('\n').filter((l) => l.trim())
              const isBulletList = lines.length > 0 && lines.every((l) => /^[•\-]\s/.test(l.trim()))

              if (isBulletList) {
                docChildren.push(...buildBulletParagraphs(item.chapter))
              } else if (item.chapter.startsWith('Respectfully Submitted')) {
                // Signature block
                docChildren.push(new Paragraph({ spacing: { before: 360 } }))
                for (const line of lines) {
                  docChildren.push(
                    new Paragraph({
                      children: formatInlineRuns(line, {
                        font: 'Calibri',
                        size: 21,
                        color: TEXT_COLOR,
                      }),
                      spacing: { before: 30, after: 30 },
                    })
                  )
                }
              } else {
                docChildren.push(
                  new Paragraph({
                    children: formatInlineRuns(item.chapter, {
                      font: 'Calibri',
                      size: 21,
                      color: TEXT_COLOR,
                    }),
                    spacing: { before: 60, after: 60 },
                    alignment: AlignmentType.JUSTIFIED,
                  })
                )
              }
              break
            }
          }
        }
      }

      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'default-bullet',
              levels: [
                {
                  level: 0,
                  format: NumberFormat.BULLET,
                  text: '\u2022',
                  alignment: AlignmentType.LEFT,
                  style: {
                    paragraph: {
                      indent: { left: 450, hanging: 220 },
                    },
                  },
                },
              ],
            },
          ],
        },
        styles: {
          default: {
            document: {
              run: {
                font: 'Calibri',
                size: 21,
                color: TEXT_COLOR,
              },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
              },
            },
            headers: {
              default: new Header({ children: [] }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${footerText} | Page `,
                        font: 'Calibri',
                        size: 14,
                        color: GRAY,
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: 'Calibri',
                        size: 14,
                        color: GRAY,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 4 } },
                  }),
                ],
              }),
            },
            children: docChildren,
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const filename = proposalTitle
        ? `${proposalTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.docx`
        : 'proposal.docx'
      saveAs(blob, filename)
    } catch (error) {
      console.error('DOCX export failed:', error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [])

  return { exportDocx, isExporting }
}
