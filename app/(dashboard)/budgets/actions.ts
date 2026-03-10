'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBudgets() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found', data: [] }
  }

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      name,
      extracted_text,
      metadata,
      grant_id,
      created_at,
      updated_at,
      grant:grants (
        id,
        title,
        deadline
      )
    `)
    .eq('org_id', profile.org_id)
    .eq('category', 'budget')
    .not('metadata->is_template', 'eq', 'true')
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  // Map to budget shape for UI compatibility
  const budgets = (data || []).map(doc => ({
    id: doc.id,
    name: doc.title || doc.name || 'Untitled Budget',
    narrative: doc.extracted_text,
    total_amount: ((doc.metadata as Record<string, unknown>)?.total_amount as number) ?? null,
    updated_at: doc.updated_at,
    grant: Array.isArray(doc.grant) ? doc.grant[0] || null : doc.grant,
  }))

  return { data: budgets, error: null }
}

export async function getBudget(budgetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch document with grant data
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      name,
      extracted_text,
      metadata,
      grant_id,
      created_at,
      updated_at,
      grant:grants (
        id,
        title,
        deadline,
        funder_name,
        amount
      )
    `)
    .eq('id', budgetId)
    .eq('category', 'budget')
    .single()

  if (docError) {
    return { error: docError.message, data: null }
  }

  const meta = (doc.metadata as Record<string, unknown>) || {}
  const lineItems = ((meta.line_items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>, index: number) => ({
    id: `${doc.id}-${index}`,
    category: (item.category as string) || null,
    description: item.description as string,
    amount: item.amount as number,
    justification: (item.justification as string) || null,
    sort_order: index,
  }))

  return {
    data: {
      budget: {
        id: doc.id,
        name: doc.title || doc.name || 'Untitled Budget',
        narrative: doc.extracted_text,
        total_amount: (meta.total_amount as number) ?? null,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      },
      lineItems,
      grant: Array.isArray(doc.grant) ? doc.grant[0] || null : doc.grant,
    },
    error: null,
  }
}

interface BudgetLineItemInput {
  category: string
  description: string
  amount: number
  justification?: string
}

export async function createBudget(data: {
  grant_id: string
  name: string
  line_items: BudgetLineItemInput[]
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Calculate total amount from line items
  const total_amount = data.line_items.reduce((sum, item) => sum + item.amount, 0)

  // Insert as a document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      org_id: profile.org_id,
      grant_id: data.grant_id,
      title: data.name,
      name: data.name,
      category: 'budget',
      extraction_status: 'completed',
      metadata: {
        total_amount,
        is_template: false,
        line_items: data.line_items.map((item, index) => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
          justification: item.justification || null,
          sort_order: index,
        })),
      },
    })
    .select()
    .single()

  if (docError) {
    return { error: docError.message }
  }

  revalidatePath('/budgets')
  return { data: doc, error: null }
}

export async function updateBudget(
  budgetId: string,
  data: {
    name?: string
    narrative?: string
    line_items?: BudgetLineItemInput[]
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get existing document to merge metadata
  const { data: existing } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', budgetId)
    .single()

  const meta = (existing?.metadata as Record<string, unknown>) || {}

  // Build update object
  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) {
    updates.title = data.name
    updates.name = data.name
  }
  if (data.narrative !== undefined) {
    updates.extracted_text = data.narrative
  }

  if (data.line_items) {
    const total_amount = data.line_items.reduce((sum, item) => sum + item.amount, 0)
    updates.metadata = {
      ...meta,
      total_amount,
      line_items: data.line_items.map((item, index) => ({
        category: item.category,
        description: item.description,
        amount: item.amount,
        justification: item.justification || null,
        sort_order: index,
      })),
    }
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', budgetId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/budgets')
  return { success: true, error: null }
}

export async function deleteBudget(budgetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', budgetId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/budgets')
  return { success: true, error: null }
}

export async function getBudgetTemplates() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found', data: [] }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, name, metadata')
    .eq('org_id', profile.org_id)
    .eq('category', 'budget')
    .filter('metadata->is_template', 'eq', 'true')
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  const templates = (data || []).map(doc => ({
    id: doc.id,
    name: doc.title || doc.name || 'Untitled Template',
  }))

  return { data: templates, error: null }
}

export async function saveBudgetAsTemplate(budgetId: string, templateName: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Fetch the source document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', budgetId)
    .single()

  if (docError) {
    return { error: docError.message }
  }

  const meta = (doc.metadata as Record<string, unknown>) || {}

  // Insert new document as template
  const { error: templateError } = await supabase
    .from('documents')
    .insert({
      org_id: profile.org_id,
      title: templateName,
      name: templateName,
      category: 'budget',
      extraction_status: 'completed',
      metadata: {
        ...meta,
        is_template: true,
      },
    })

  if (templateError) {
    return { error: templateError.message }
  }

  revalidatePath('/budgets')
  return { success: true, error: null }
}

export async function loadBudgetTemplate(templateId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch template document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('title, name, metadata')
    .eq('id', templateId)
    .single()

  if (docError) {
    return { error: docError.message, data: null }
  }

  const meta = (doc.metadata as Record<string, unknown>) || {}

  return {
    data: {
      name: doc.title || doc.name || 'Untitled Template',
      lineItems: ((meta.line_items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
        category: item.category as string,
        description: item.description as string,
        amount: item.amount as number,
        justification: (item.justification as string) || '',
      })),
    },
    error: null,
  }
}

export async function triggerBudgetNarrative(budgetId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Get the document to find its grant_id
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('grant_id')
    .eq('id', budgetId)
    .single()

  if (docError || !doc) {
    return { error: 'Budget not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: doc.grant_id,
      workflow_name: 'generate-budget',
      status: 'running',
      webhook_url: '/webhook/generate-budget',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/generate-budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        budget_id: budgetId,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n generate-budget webhook failed:', err)
    })
  }

  return { success: true, workflowId: workflow.id }
}
