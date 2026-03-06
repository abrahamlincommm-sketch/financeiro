-- ============================================================
-- MIGRAÇÃO: adiciona tipo 'investment' ao campo type
-- Execute este script no SQL Editor do seu projeto Supabase
-- (só é preciso rodar uma vez, depois do schema inicial)
-- ============================================================

-- 1. Remover as constraints de CHECK antigas
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.categories   DROP CONSTRAINT IF EXISTS categories_type_check;

-- 2. Adicionar as constraints de CHECK novas com 'investment'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'investment'));

ALTER TABLE public.categories ADD CONSTRAINT categories_type_check
  CHECK (type IN ('income', 'expense', 'investment'));

-- 3. Inserir categorias de investimento para usuários existentes
-- (usuários novos já receberão pelo trigger)
INSERT INTO public.categories (user_id, name, type)
SELECT id, 'FIIs / Fundos Imobiliários', 'investment' FROM auth.users
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = auth.users.id AND c.type = 'investment'
  );

INSERT INTO public.categories (user_id, name, type)
SELECT id, 'Ações',       'investment' FROM auth.users
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = auth.users.id AND c.name = 'Ações'
  );

INSERT INTO public.categories (user_id, name, type)
SELECT id, 'Renda Fixa',  'investment' FROM auth.users
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = auth.users.id AND c.name = 'Renda Fixa'
  );

INSERT INTO public.categories (user_id, name, type)
SELECT id, 'Cripto',      'investment' FROM auth.users
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = auth.users.id AND c.name = 'Cripto'
  );

INSERT INTO public.categories (user_id, name, type)
SELECT id, 'Poupança',    'investment' FROM auth.users
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = auth.users.id AND c.name = 'Poupança'
  );

-- 4. Atualizar o trigger para incluir categorias de investimento em novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type)
  VALUES
    (new.id, 'Salário',                     'income'),
    (new.id, 'Renda Passiva/FIIs',           'income'),
    (new.id, 'Alimentação',                  'expense'),
    (new.id, 'Moradia',                      'expense'),
    (new.id, 'Construção/Obras',             'expense'),
    (new.id, 'Manutenção de Moto',           'expense'),
    (new.id, 'Importações',                  'expense'),
    (new.id, 'Lazer',                        'expense'),
    (new.id, 'FIIs / Fundos Imobiliários',   'investment'),
    (new.id, 'Ações',                        'investment'),
    (new.id, 'Renda Fixa',                   'investment'),
    (new.id, 'Cripto',                       'investment'),
    (new.id, 'Poupança',                     'investment');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
