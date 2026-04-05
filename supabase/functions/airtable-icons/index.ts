import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Read icons from the database (stored permanently)
    const { data: icons, error: dbError } = await supabase
      .from('icons')
      .select('category, filename, storage_path')
      .order('category');

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to read icons from database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!icons || icons.length === 0) {
      return new Response(
        JSON.stringify({ categories: [], message: 'No icons synced yet. Run sync-airtable-icons first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build public URLs and group by category
    const categoryMap: Record<string, { name: string; icons: { url: string; filename: string }[] }> = {};

    for (const icon of icons) {
      if (!categoryMap[icon.category]) {
        categoryMap[icon.category] = { name: icon.category, icons: [] };
      }

      const { data: urlData } = supabase.storage
        .from('icons')
        .getPublicUrl(icon.storage_path);

      categoryMap[icon.category].icons.push({
        url: urlData.publicUrl,
        filename: icon.filename,
      });
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
