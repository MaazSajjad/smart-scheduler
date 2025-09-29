import { supabase } from './supabase'

export interface Rule {
  id: string
  name: string
  type: string
  payload: any
  created_at: string
  updated_at: string
}

export interface CreateRuleData {
  name: string
  type: string
  payload: any
}

export interface UpdateRuleData extends Partial<CreateRuleData> {
  id: string
}

export class RuleService {
  static async getAllRules(): Promise<Rule[]> {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getRuleById(id: string): Promise<Rule | null> {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async createRule(ruleData: CreateRuleData): Promise<Rule> {
    const { data, error } = await supabase
      .from('rules')
      .insert(ruleData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateRule(ruleData: UpdateRuleData): Promise<Rule> {
    const { id, ...updateData } = ruleData
    const { data, error } = await supabase
      .from('rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async getRulesByType(type: string): Promise<Rule[]> {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
