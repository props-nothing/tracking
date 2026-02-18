-- Add 'leads' to default visible_sections for shared reports
alter table public.shared_reports
  alter column visible_sections set default array[
    'metrics', 'chart', 'pages', 'referrers', 'countries',
    'devices', 'utm', 'goals', 'forms', 'leads'
  ];

-- Update existing reports that use the old default to include leads
update public.shared_reports
set visible_sections = array_append(visible_sections, 'leads')
where visible_sections @> array['metrics', 'chart', 'pages', 'referrers', 'countries', 'devices', 'utm', 'goals', 'forms']
  and not visible_sections @> array['leads'];
