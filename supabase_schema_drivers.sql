-- Habilitar a tabela de motoristas (drivers)
-- Esta tabela armazena os dados dos motoristas de cada tenant
-- Compatível com a arquitetura Multi-Tenant do projeto

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    data_nascimento DATE,
    cpf TEXT UNIQUE,
    numero_cnh TEXT,
    categoria_cnh TEXT,
    validade_cnh DATE,
    endereco TEXT,
    cnh_url TEXT, -- Link para o documento no Supabase Storage
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para isolamento por tenant_id

-- 1. Política de Visualização: Usuários só veem motoristas do seu próprio tenant
CREATE POLICY "Users can view drivers from their tenant" 
ON public.drivers
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
);

-- 2. Política de Inserção: Usuários só inserem motoristas no seu próprio tenant
CREATE POLICY "Users can insert drivers to their tenant" 
ON public.drivers
FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
);

-- 3. Política de Atualização: Usuários só atualizam motoristas do seu próprio tenant
CREATE POLICY "Users can update drivers from their tenant" 
ON public.drivers
FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
);

-- 4. Política de Exclusão: Usuários só excluem motoristas do seu próprio tenant
CREATE POLICY "Users can delete drivers from their tenant" 
ON public.drivers
FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
);

-- 5. Política de Bypass para SuperAdmin (se necessário)
-- Nota: O SuperAdmin geralmente ignora RLS dependendo da configuração do projeto,
-- mas é recomendável ter uma política explícita se o bypass não for global.

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Comentários da Tabela
COMMENT ON TABLE public.drivers IS 'Tabela central de motoristas gerenciados por empresa (multi-tenant).';
