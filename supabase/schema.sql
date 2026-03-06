-- ============================================================
-- SETUP COMPLETO - PERSONAL FINANCE APP  
-- Cole tudo isso no SQL Editor do Supabase e execute
-- ============================================================

-- 1. TABELAS (IF NOT EXISTS = seguro para rodar novamente)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  icon TEXT DEFAULT '📌',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Remover constraints antigas e recriar com 'investment'
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check
  CHECK (type IN ('income', 'expense', 'investment'));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'investment'));

-- 3. RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Dropar policies existentes antes de recriar
DROP POLICY IF EXISTS "categories: select own" ON public.categories;
DROP POLICY IF EXISTS "categories: insert own" ON public.categories;
DROP POLICY IF EXISTS "categories: update own" ON public.categories;
DROP POLICY IF EXISTS "categories: delete own" ON public.categories;
DROP POLICY IF EXISTS "transactions: select own" ON public.transactions;
DROP POLICY IF EXISTS "transactions: insert own" ON public.transactions;
DROP POLICY IF EXISTS "transactions: update own" ON public.transactions;
DROP POLICY IF EXISTS "transactions: delete own" ON public.transactions;

-- 5. Recriar policies
CREATE POLICY "categories: select own" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories: insert own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: update own" ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: delete own" ON public.categories FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "transactions: select own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions: insert own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions: update own" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions: delete own" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 6. TRIGGER ATUALIZADO com categorias expandidas + emojis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, icon) VALUES
    -- RECEITAS
    (new.id, '💼 Salário',                    'income',     '💼'),
    (new.id, '📈 Renda Passiva / FIIs',        'income',     '📈'),
    (new.id, '💻 Freelance / Bico',            'income',     '💻'),
    (new.id, '🛍️ Vendas Online',               'income',     '🛍️'),
    (new.id, '🏠 Aluguel Recebido',            'income',     '🏠'),
    (new.id, '💰 Dividendos / Rendimentos',    'income',     '💰'),
    (new.id, '🎁 Bônus / 13º Salário',         'income',     '🎁'),
    (new.id, '🤝 Presente / Doação Recebida',  'income',     '🤝'),
    -- DESPESAS
    (new.id, '🍽️ Alimentação',                 'expense',    '🍽️'),
    (new.id, '🏠 Moradia / Aluguel',           'expense',    '🏠'),
    (new.id, '💡 Luz / Água / Gás',            'expense',    '💡'),
    (new.id, '📱 Internet / Telefone',         'expense',    '📱'),
    (new.id, '🚗 Transporte / Combustível',    'expense',    '🚗'),
    (new.id, '🏍️ Manutenção de Moto',          'expense',    '🏍️'),
    (new.id, '🏥 Saúde / Médico',              'expense',    '🏥'),
    (new.id, '💊 Farmácia',                    'expense',    '💊'),
    (new.id, '📚 Educação / Cursos',           'expense',    '📚'),
    (new.id, '🎮 Lazer / Entretenimento',      'expense',    '🎮'),
    (new.id, '👕 Roupas / Vestuário',          'expense',    '👕'),
    (new.id, '🔨 Construção / Obras',          'expense',    '🔨'),
    (new.id, '📦 Importações / Compras Online','expense',    '📦'),
    (new.id, '📺 Assinaturas (Netflix, etc.)', 'expense',    '📺'),
    (new.id, '🐾 Pet',                         'expense',    '🐾'),
    (new.id, '✈️ Viagem',                      'expense',    '✈️'),
    (new.id, '🎁 Presentes / Doações',         'expense',    '🎁'),
    (new.id, '🏦 Impostos / IPTU / IPVA',      'expense',    '🏦'),
    (new.id, '🍺 Bar / Restaurante',           'expense',    '🍺'),
    (new.id, '💈 Beleza / Higiene',            'expense',    '💈'),
    -- INVESTIMENTOS
    (new.id, '🏢 FIIs / Fundos Imobiliários',  'investment', '🏢'),
    (new.id, '📊 Ações / BDRs',               'investment', '📊'),
    (new.id, '💵 Renda Fixa (CDB/LCI/LCA)',   'investment', '💵'),
    (new.id, '🏛️ Tesouro Direto',             'investment', '🏛️'),
    (new.id, '₿ Cripto',                      'investment', '₿'),
    (new.id, '💰 Poupança',                   'investment', '💰'),
    (new.id, '🌎 ETFs',                       'investment', '🌎'),
    (new.id, '📁 Fundos de Investimento',     'investment', '📁'),
    (new.id, '🛡️ Previdência Privada',        'investment', '🛡️');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
