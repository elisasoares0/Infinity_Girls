-- =====================================================================
-- AstroHealth: bucket privado das imagens de exame (ultrassom / OCT)
-- Rodar no SQL Editor do Supabase DEPOIS do schema.sql e do ajustes_api.sql.
-- Pode rodar mais de uma vez.
--
-- Regras:
--   * o astronauta só envia arquivos na pasta dele (<id do usuário>/arquivo.jpg);
--   * o astronauta vê só os próprios arquivos; o médico vê todos.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('exames-imagem', 'exames-imagem', false)
on conflict (id) do nothing;

drop policy if exists "astronauta envia na propria pasta" on storage.objects;
create policy "astronauta envia na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exames-imagem' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ver imagens proprias ou medico" on storage.objects;
create policy "ver imagens proprias ou medico" on storage.objects
  for select to authenticated
  using (bucket_id = 'exames-imagem'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_medico()));
