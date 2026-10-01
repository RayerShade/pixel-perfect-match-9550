-- lovable-cron-fallback-reviewed: Students choose per-source check intervals as low as 5 minutes; a 15-minute poller would never honour them, so the single consolidated poller must tick every 5 minutes (288 runs/day). Google Sheets offers no webhook/event source, and only sources whose interval has elapsed are actually fetched.
ALTER TABLE public.sheets_kaynaklari DROP CONSTRAINT IF EXISTS sheets_kaynaklari_aralik_dk_check;
ALTER TABLE public.sheets_kaynaklari ADD CONSTRAINT sheets_kaynaklari_aralik_dk_check CHECK (aralik_dk >= 5 AND aralik_dk <= 10080);

SELECT cron.schedule(
  'sheets-kontrol',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--9d101627-0336-4f17-a11a-3c2dfd782f81.lovable.app/api/public/sheets-kontrol',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'LOVABLE_CRON_SECRET' LIMIT 1)),
    body := '{}'::jsonb
  );
  $$
);