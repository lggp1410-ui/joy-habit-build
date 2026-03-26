import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('AIRTABLE_API_KEY');
    const baseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!apiKey || !baseId) {
      return new Response(
        JSON.stringify({ error: 'Airtable credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tableName = 'tblNPJDonQwlhTADO';
    let allRecords: any[] = [];
    let offset: string | undefined;

    // Paginate through all records
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Airtable error:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch from Airtable', details: err }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    // Group records by category (Notes field)
    const categoryMap: Record<string, { name: string; icons: { url: string; filename: string }[] }> = {};

    for (const record of allRecords) {
      const fields = record.fields || {};
      const category = fields['Notes'] || fields['Name'] || fields['Category'] || 'Other';
      const attachments = fields['Anexos'] || fields['Attachments'] || [];

      if (!categoryMap[category]) {
        categoryMap[category] = { name: category, icons: [] };
      }

      for (const att of attachments) {
        if (att.url) {
          categoryMap[category].icons.push({
            url: att.url,
            filename: att.filename || '',
          });
        }
      }
    }

    const categories = Object.values(categoryMap).filter(c => c.icons.length > 0);

    return new Response(
      JSON.stringify({ categories }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
