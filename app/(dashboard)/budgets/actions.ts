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
    .from('budgets')
    .select(`
      *,
      grant:grants (
        id,
        title,
        deadline
      )
    `)
    .eq('org_id', profile.org_id)
    .eq('is_template', false)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}

export async function getBudget(budgetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch budget with grant data
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select(`
      *,
      grant:grants (
        id,
        title,
        deadline,
        funder_name,
        amount
      )
    `)
    .eq('id', budgetId)
    .single()

  if (budgetError) {
    return { error: budgetError.message, data: null }
  }

  // Fetch line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true })

  if (lineItemsError) {
    return { error: lineItemsError.message, data: null }
  }

  return {
    data: {
      budget,
      lineItems: lineItems || [],
      grant: budget.grant,
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

  // Insert budget
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .insert({
      org_id: profile.org_id,
      grant_id: data.grant_id,
      name: data.name,
      total_amount,
      is_template: false,
    })
    .select()
    .single()

  if (budgetError) {
    return { error: budgetError.message }
  }

  // Insert line items with sort_order
  const lineItemsToInsert = data.line_items.map((item, index) => ({
    budget_id: budget.id,
    category: item.category,
    description: item.description,
    amount: item.amount,
    justification: item.justification || null,
    sort_order: index,
  }))

  const { error: lineItemsError } = await supabase
    .from('budget_line_items')
    .insert(lineItemsToInsert)

  if (lineItemsError) {
    // Rollback: delete the budget if line items fail
    await supabase.from('budgets').delete().eq('id', budget.id)
    return { error: lineItemsError.message }
  }

  revalidatePath('/budgets')
  return { data: budget, error: null }
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

  // Build update object
  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.narrative !== undefined) updates.narrative = data.narrative

  // If line_items provided, recalculate total_amount
  if (data.line_items) {
    const total_amount = data.line_items.reduce((sum, item) => sum + item.amount, 0)
    updates.total_amount = total_amount

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('budget_line_items')
      .delete()
      .eq('budget_id', budgetId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    // Insert new line items
    const lineItemsToInsert = data.line_items.map((item, index) => ({
      budget_id: budgetId,
      category: item.category,
      description: item.description,
      amount: item.amount,
      justification: item.justification || null,
      sort_order: index,
    }))

    const { error: insertError } = await supabase
      .from('budget_line_items')
      .insert(lineItemsToInsert)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  // Update budget row
  const { error: updateError } = await supabase
    .from('budgets')
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
    .from('budgets')
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
    .from('budgets')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('is_template', true)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
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

  // Fetch the budget
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .single()

  if (budgetError) {
    return { error: budgetError.message }
  }

  // Fetch the line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true })

  if (lineItemsError) {
    return { error: lineItemsError.message }
  }

  // Insert new budget as template
  const { data: template, error: templateError } = await supabase
    .from('budgets')
    .insert({
      org_id: profile.org_id,
      grant_id: null,
      name: templateName,
      total_amount: budget.total_amount,
      is_template: true,
    })
    .select()
    .single()

  if (templateError) {
    return { error: templateError.message }
  }

  // Copy line items
  const lineItemsToInsert = (lineItems || []).map((item) => ({
    budget_id: template.id,
    category: item.category,
    description: item.description,
    amount: item.amount,
    justification: item.justification,
    sort_order: item.sort_order,
  }))

  if (lineItemsToInsert.length > 0) {
    const { error: copyError } = await supabase
      .from('budget_line_items')
      .insert(lineItemsToInsert)

    if (copyError) {
      // Rollback: delete the template if line items fail
      await supabase.from('budgets').delete().eq('id', template.id)
      return { error: copyError.message }
    }
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

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .single()

  if (templateError) {
    return { error: templateError.message, data: null }
  }

  // Fetch line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('budget_id', templateId)
    .order('sort_order', { ascending: true })

  if (lineItemsError) {
    return { error: lineItemsError.message, data: null }
  }

  return {
    data: {
      name: template.name,
      lineItems: lineItems || [],
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

  // Get the budget to find its grant_id
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('grant_id')
    .eq('id', budgetId)
    .single()

  if (budgetError || !budget) {
    return { error: 'Budget not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: budget.grant_id,
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
