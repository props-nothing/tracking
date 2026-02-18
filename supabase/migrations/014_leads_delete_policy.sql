-- Allow owners/admins to delete leads for their sites
create policy "Users can delete leads for their own sites"
  on public.leads for delete using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
