-- =============================================
-- Hostelpro Panel — Tablas nuevas (prefijo hp_)
-- Proyecto Supabase: rmjmywfaxwdgnyrocsvq
-- =============================================

-- Perfiles de socios
CREATE TABLE IF NOT EXISTS hp_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Operaciones de compra-venta de máquinas
CREATE TABLE IF NOT EXISTS hp_operations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by            uuid REFERENCES hp_profiles(id),
  client_name           text NOT NULL,
  machine_description   text NOT NULL,
  notes                 text,
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sold', 'settled')),

  -- Compra
  purchase_price        numeric(10,2) NOT NULL,
  purchase_vat_included boolean NOT NULL DEFAULT true,
  purchase_vat_rate     numeric(5,4) NOT NULL DEFAULT 0.21,
  purchase_paid_by      uuid REFERENCES hp_profiles(id),

  -- Venta
  sale_price            numeric(10,2),
  sale_vat_included     boolean NOT NULL DEFAULT true,
  sale_vat_rate         numeric(5,4) NOT NULL DEFAULT 0.21,
  sale_date             date,

  -- Beneficio calculado (guardado al momento de guardar)
  profit_net            numeric(10,2),
  partner_share         numeric(10,2),

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Gastos adicionales por operación
CREATE TABLE IF NOT EXISTS hp_operation_costs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    uuid NOT NULL REFERENCES hp_operations(id) ON DELETE CASCADE,
  description     text NOT NULL,
  amount          numeric(10,2) NOT NULL,
  vat_included    boolean NOT NULL DEFAULT false,
  vat_rate        numeric(5,4) NOT NULL DEFAULT 0.21,
  paid_by         uuid REFERENCES hp_profiles(id),
  created_at      timestamptz DEFAULT now()
);

-- Liquidaciones entre socios (inmutables — solo INSERT)
CREATE TABLE IF NOT EXISTS hp_settlements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by           uuid NOT NULL REFERENCES hp_profiles(id),
  paid_to           uuid NOT NULL REFERENCES hp_profiles(id),
  amount            numeric(10,2) NOT NULL,
  notes             text,
  settlement_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at        timestamptz DEFAULT now()
);

-- Conversaciones con el agente de IA
CREATE TABLE IF NOT EXISTS hp_ai_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES hp_profiles(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Trigger: updated_at automático en hp_operations
CREATE OR REPLACE FUNCTION hp_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hp_operations_updated_at ON hp_operations;
CREATE TRIGGER hp_operations_updated_at
  BEFORE UPDATE ON hp_operations
  FOR EACH ROW EXECUTE FUNCTION hp_set_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE hp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hp_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hp_operation_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hp_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hp_ai_conversations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si ya existen (idempotente)
DROP POLICY IF EXISTS "hp: socios leen todos los perfiles" ON hp_profiles;
DROP POLICY IF EXISTS "hp: socios actualizan su perfil" ON hp_profiles;
DROP POLICY IF EXISTS "hp: insertar propio perfil" ON hp_profiles;
DROP POLICY IF EXISTS "hp: socios leen todas las operaciones" ON hp_operations;
DROP POLICY IF EXISTS "hp: socios crean operaciones" ON hp_operations;
DROP POLICY IF EXISTS "hp: socios editan operaciones" ON hp_operations;
DROP POLICY IF EXISTS "hp: creador elimina operacion" ON hp_operations;
DROP POLICY IF EXISTS "hp: socios gestionan gastos" ON hp_operation_costs;
DROP POLICY IF EXISTS "hp: socios leen liquidaciones" ON hp_settlements;
DROP POLICY IF EXISTS "hp: socios registran pagos propios" ON hp_settlements;
DROP POLICY IF EXISTS "hp: cada socio ve sus conversaciones" ON hp_ai_conversations;
DROP POLICY IF EXISTS "hp: cada socio crea sus mensajes" ON hp_ai_conversations;
DROP POLICY IF EXISTS "hp: cada socio borra sus conversaciones" ON hp_ai_conversations;

-- hp_profiles
CREATE POLICY "hp: socios leen todos los perfiles"
  ON hp_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "hp: socios actualizan su perfil"
  ON hp_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "hp: insertar propio perfil"
  ON hp_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- hp_operations
CREATE POLICY "hp: socios leen todas las operaciones"
  ON hp_operations FOR SELECT TO authenticated USING (true);

CREATE POLICY "hp: socios crean operaciones"
  ON hp_operations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM hp_profiles));

CREATE POLICY "hp: socios editan operaciones"
  ON hp_operations FOR UPDATE TO authenticated USING (true)
  WITH CHECK (auth.uid() IN (SELECT id FROM hp_profiles));

CREATE POLICY "hp: creador elimina operacion"
  ON hp_operations FOR DELETE TO authenticated USING (created_by = auth.uid());

-- hp_operation_costs
CREATE POLICY "hp: socios gestionan gastos"
  ON hp_operation_costs FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IN (SELECT id FROM hp_profiles));

-- hp_settlements
CREATE POLICY "hp: socios leen liquidaciones"
  ON hp_settlements FOR SELECT TO authenticated USING (true);

CREATE POLICY "hp: socios registran pagos propios"
  ON hp_settlements FOR INSERT TO authenticated WITH CHECK (paid_by = auth.uid());

-- hp_ai_conversations
CREATE POLICY "hp: cada socio ve sus conversaciones"
  ON hp_ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "hp: cada socio crea sus mensajes"
  ON hp_ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "hp: cada socio borra sus conversaciones"
  ON hp_ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());
