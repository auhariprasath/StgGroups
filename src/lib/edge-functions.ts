import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase;
}

interface SendQuotationEmailParams {
  to: string;
  quotationId: string;
  leadId: string;
  subject: string;
  htmlBody: string;
  pdfBase64: string;
  fileName: string;
}

interface SendQuotationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendQuotationEmail(
  params: SendQuotationEmailParams
): Promise<SendQuotationEmailResult> {
  const { data, error } = await client().functions.invoke(
    "send-quotation-email",
    { body: params }
  );
  if (error) return { success: false, error: error.message };
  return data as SendQuotationEmailResult;
}
