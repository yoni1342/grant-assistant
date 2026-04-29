import { NextResponse } from 'next/server'

interface PreviewBody {
  website_url?: string
}

interface NarrativeItem {
  ai_category: string
  title: string
  content: string
}

const PREVIEW_TIMEOUT_MS = 90_000

export async function POST(request: Request) {
  let body: PreviewBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const websiteUrl = (body.website_url || '').trim()
  if (!websiteUrl) {
    return NextResponse.json({ error: 'website_url is required' }, { status: 400 })
  }

  const baseUrl = process.env.N8N_WEBHOOK_URL
  if (!baseUrl) {
    return NextResponse.json({ error: 'Narrative generation is not configured' }, { status: 503 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)

  try {
    const resp = await fetch(`${baseUrl}/org-website-narrative`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({ website_url: websiteUrl, preview: true }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('[preview-from-website] n8n error:', resp.status, text.slice(0, 500))
      return NextResponse.json(
        { error: 'Could not reach the narrative generator. Please try again.' },
        { status: 502 }
      )
    }

    const data = await resp.json()
    const narratives: NarrativeItem[] = Array.isArray(data?.narratives) ? data.narratives : []
    if (narratives.length === 0) {
      return NextResponse.json(
        { error: 'No narratives could be generated from this website.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      narratives,
      pages_scraped: data?.pages_scraped ?? null,
      website_url: data?.website_url ?? websiteUrl,
    })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    console.error('[preview-from-website] fetch failed:', err)
    return NextResponse.json(
      {
        error: aborted
          ? 'Generation timed out. Please try again or skip and fill out manually.'
          : 'Could not reach the narrative generator. Please try again.',
      },
      { status: aborted ? 504 : 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
