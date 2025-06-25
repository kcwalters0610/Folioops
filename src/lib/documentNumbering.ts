import { supabase } from './supabase';

export interface NumberingSettings {
  work_order_prefix: string;
  work_order_format: string;
  work_order_next_number: number;
  purchase_order_prefix: string;
  purchase_order_format: string;
  purchase_order_next_number: number;
  estimate_prefix: string;
  estimate_format: string;
  estimate_next_number: number;
  invoice_prefix: string;
  invoice_format: string;
  invoice_next_number: number;
}

const defaultNumberingSettings: NumberingSettings = {
  work_order_prefix: 'WO',
  work_order_format: 'WO-{YYYY}-{####}',
  work_order_next_number: 1,
  purchase_order_prefix: 'PO',
  purchase_order_format: 'PO-{YYYY}-{####}',
  purchase_order_next_number: 1,
  estimate_prefix: 'EST',
  estimate_format: 'EST-{YYYY}-{####}',
  estimate_next_number: 1,
  invoice_prefix: 'INV',
  invoice_format: 'INV-{YYYY}-{####}',
  invoice_next_number: 1,
};

export const generateDocumentNumber = (format: string, nextNumber: number): string => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentDay = String(new Date().getDate()).padStart(2, '0');
  
  return format
    .replace('{YYYY}', currentYear.toString())
    .replace('{YY}', currentYear.toString().slice(-2))
    .replace('{MM}', currentMonth)
    .replace('{DD}', currentDay)
    .replace('{####}', nextNumber.toString().padStart(4, '0'))
    .replace('{###}', nextNumber.toString().padStart(3, '0'))
    .replace('{##}', nextNumber.toString().padStart(2, '0'));
};

export const getCompanyNumberingSettings = async (companyId: string): Promise<NumberingSettings> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const numbering = data?.settings?.numbering;
    return numbering ? { ...defaultNumberingSettings, ...numbering } : defaultNumberingSettings;
  } catch (error) {
    console.error('Error fetching numbering settings:', error);
    return defaultNumberingSettings;
  }
};

export const getNextDocumentNumber = async (
  companyId: string, 
  documentType: 'work_order' | 'purchase_order' | 'estimate' | 'invoice'
): Promise<string> => {
  const settings = await getCompanyNumberingSettings(companyId);
  
  switch (documentType) {
    case 'work_order':
      return generateDocumentNumber(settings.work_order_format, settings.work_order_next_number);
    case 'purchase_order':
      return generateDocumentNumber(settings.purchase_order_format, settings.purchase_order_next_number);
    case 'estimate':
      return generateDocumentNumber(settings.estimate_format, settings.estimate_next_number);
    case 'invoice':
      return generateDocumentNumber(settings.invoice_format, settings.invoice_next_number);
    default:
      return `DOC-${Date.now()}`;
  }
};

export const incrementDocumentNumber = async (
  companyId: string,
  documentType: 'work_order' | 'purchase_order' | 'estimate' | 'invoice'
): Promise<void> => {
  try {
    const settings = await getCompanyNumberingSettings(companyId);
    
    const fieldName = `${documentType}_next_number` as keyof NumberingSettings;
    const currentNumber = settings[fieldName] as number;
    
    const updatedSettings = {
      ...settings,
      [fieldName]: currentNumber + 1,
    };

    // Get current company settings
    const { data: companyData, error: fetchError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchError) throw fetchError;

    const currentCompanySettings = companyData?.settings || {};
    
    // Update with new numbering settings
    const updatedCompanySettings = {
      ...currentCompanySettings,
      numbering: updatedSettings,
    };

    const { error: updateError } = await supabase
      .from('companies')
      .update({ settings: updatedCompanySettings })
      .eq('id', companyId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error incrementing document number:', error);
  }
};