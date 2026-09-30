GRANT SELECT ON public.global_data TO anon;
CREATE POLICY "Dönem listesi herkese açık" ON public.global_data FOR SELECT TO anon USING (anahtar = 'donemler');