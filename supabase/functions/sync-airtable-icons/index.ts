import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnvValue(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  if (!value) return null;
  return value.replace(/^['"]|['"]$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = getEnvValue('AIRTABLE_API_KEY');
    const baseId = getEnvValue('AIRTABLE_BASE_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!apiKey || !baseId) {
      return new Response(
        JSON.stringify({ error: 'Airtable credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all records from Airtable
    const tableName = 'tblNPJDonQwlhTADO';
    let allRecords: any[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(
          JSON.stringify({ error: 'Airtable fetch failed', details: err }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    // Check existing icons to avoid duplicates
    const { data: existingIcons } = await supabase.from('icons').select('filename, category');
    const existingSet = new Set(
      (existingIcons || []).map((i: any) => `${i.category}/${i.filename}`)
    );

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of allRecords) {
      const fields = record.fields || {};
      const category = fields['Notes'] || fields['Name'] || fields['Category'] || 'Other';
      const attachments = fields['Anexos'] || fields['Attachments'] || [];

      for (const att of attachments) {
        if (!att.url || !att.filename) continue;

        const key = `${category}/${att.filename}`;
        if (existingSet.has(key)) {
          skipped++;
          continue;
        }

        try {
          // Download from Airtable
          const imgRes = await fetch(att.url);
          if (!imgRes.ok) {
            errors++;
            continue;
          }

          const blob = await imgRes.blob();
          const storagePath = `${category}/${att.filename}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('icons')
            .upload(storagePath, blob, {
              contentType: att.type || 'image/png',
              upsert: true,
            });

          if (uploadError) {
            console.error('Upload error:', storagePath, uploadError);
            errors++;
            continue;
          }

          // Insert metadata
          const { error: insertError } = await supabase.from('icons').insert({
            category,
            filename: att.filename,
            storage_path: storagePath,
          });

          if (insertError) {
            console.error('Insert error:', insertError);
            errors++;
            continue;
          }

          uploaded++;
          existingSet.add(key);
        } catch (e) {
          console.error('Error processing icon:', att.filename, e);
          errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: { total_records: allRecords.length, uploaded, skipped, errors }
      }),
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
