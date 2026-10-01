CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'sheets-kontrol',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--9d101627-0336-4f17-a11a-3c2dfd782f81.lovable.app/api/public/sheets-kontrol',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'LOVABLE_CRON_SECRET' LIMIT 1)),
    body := '{}'::jsonb
  );
  $$
);