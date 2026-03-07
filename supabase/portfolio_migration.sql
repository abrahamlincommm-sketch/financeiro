-- ============================================================
-- CARTEIRA DE INVESTIMENTOS - cole no SQL Editor do Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker     TEXT NOT NULL,
  name       TEXT,
  quantity   DECIMAL(12, 4) NOT NULL CHECK (quantity > 0),
  avg_price  DECIMAL(12, 4) NOT NULL CHECK (avg_price > 0),
  asset_type TEXT DEFAULT 'stock' CHECK (asset_type IN ('stock','fii','etf','bdr','crypto')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio: select own" ON public.portfolio;
DROP POLICY IF EXISTS "portfolio: insert own" ON public.portfolio;
DROP POLICY IF EXISTS "portfolio: update own" ON public.portfolio;
DROP POLICY IF EXISTS "portfolio: delete own" ON public.portfolio;

CREATE POLICY "portfolio: select own" ON public.portfolio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "portfolio: insert own" ON public.portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio: update own" ON public.portfolio FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio: delete own" ON public.portfolio FOR DELETE USING (auth.uid() = user_id);
