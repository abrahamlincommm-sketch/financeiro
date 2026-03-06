-- ============================================================
-- SCHEMA COMPLETO - PERSONAL FINANCE APP
-- Execute este script no SQL Editor do seu novo projeto Supabase
-- ============================================================

-- 1. CRIAR TABELAS
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR RLS (Row Level Security)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES DE RLS - CATEGORIES
CREATE POLICY "categories: select own" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "categories: insert own" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: update own" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: delete own" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- 4. POLICIES DE RLS - TRANSACTIONS
CREATE POLICY "transactions: select own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions: insert own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: update own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: delete own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 5. TRIGGER: criar categorias padrão ao cadastrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type)
  VALUES
    (new.id, 'Salário',              'income'),
    (new.id, 'Renda Passiva/FIIs',   'income'),
    (new.id, 'Alimentação',           'expense'),
    (new.id, 'Moradia',               'expense'),
    (new.id, 'Construção/Obras',      'expense'),
    (new.id, 'Manutenção de Moto',    'expense'),
    (new.id, 'Importações',           'expense'),
    (new.id, 'Lazer',                 'expense');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo caso exista e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
