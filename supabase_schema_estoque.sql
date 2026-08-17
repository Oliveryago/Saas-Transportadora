create table if not exists itens_estoque (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome text not null,
  categoria text not null check (categoria in ('oleo','pneu','filtro','peca_motor','eletrica','outro')),
  unidade_medida text not null check (unidade_medida in ('litro','unidade','kit')),
  estoque_minimo numeric(10,2) default 0,
  estoque_atual numeric(10,2) default 0,
  custo_medio numeric(10,2) default 0,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome text not null,
  contato text
);

create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references itens_estoque(id),
  tipo text not null check (tipo in ('entrada','saida')),
  quantidade numeric(10,2) not null,
  valor_unitario numeric(10,2),
  fornecedor_id uuid references fornecedores(id),
  vehicle_id uuid references vehicles(id),
  maintenance_id uuid references maintenance_records(id),
  observacao text,
  data_movimento timestamptz default now(),
  usuario_id uuid references auth.users(id)
);

create table if not exists manutencao_itens (
  id uuid primary key default gen_random_uuid(),
  maintenance_id uuid not null references maintenance_records(id),
  item_id uuid not null references itens_estoque(id),
  quantidade numeric(10,2) not null,
  custo_alocado numeric(10,2) not null
);

alter table itens_estoque enable row level security;
alter table fornecedores enable row level security;
alter table movimentacoes_estoque enable row level security;
alter table manutencao_itens enable row level security;

create policy "itens_estoque_por_empresa" on itens_estoque
  for all using (tenant_id in (select tenant_id from users where id = auth.uid()));

create policy "fornecedores_por_empresa" on fornecedores
  for all using (tenant_id in (select tenant_id from users where id = auth.uid()));

create policy "movimentacoes_por_empresa" on movimentacoes_estoque
  for all using (
    item_id in (
      select id from itens_estoque
      where tenant_id in (select tenant_id from users where id = auth.uid())
    )
  );

create policy "manutencao_itens_por_empresa" on manutencao_itens
  for all using (
    item_id in (
      select id from itens_estoque
      where tenant_id in (select tenant_id from users where id = auth.uid())
    )
  );

create or replace function registrar_entrada_estoque(
  p_item_id uuid,
  p_quantidade numeric,
  p_valor_unitario numeric,
  p_fornecedor_id uuid default null,
  p_observacao text default null
) returns void as $$
declare
  v_estoque_atual numeric;
  v_custo_medio numeric;
  v_novo_custo_medio numeric;
begin
  select estoque_atual, custo_medio into v_estoque_atual, v_custo_medio
  from itens_estoque where id = p_item_id for update;

  v_novo_custo_medio := case
    when (v_estoque_atual + p_quantidade) = 0 then 0
    else ((v_estoque_atual * v_custo_medio) + (p_quantidade * p_valor_unitario)) / (v_estoque_atual + p_quantidade)
  end;

  update itens_estoque
  set estoque_atual = v_estoque_atual + p_quantidade,
      custo_medio = v_novo_custo_medio
  where id = p_item_id;

  insert into movimentacoes_estoque (item_id, tipo, quantidade, valor_unitario, fornecedor_id, observacao, usuario_id)
  values (p_item_id, 'entrada', p_quantidade, p_valor_unitario, p_fornecedor_id, p_observacao, auth.uid());
end;
$$ language plpgsql security definer;

create or replace function registrar_saida_estoque(
  p_item_id uuid,
  p_quantidade numeric,
  p_vehicle_id uuid default null,
  p_maintenance_id uuid default null,
  p_observacao text default null
) returns void as $$
declare
  v_estoque_atual numeri2=e=c;
  v_custo_medio numeric;
  v_custo_alocado numeric;
begin
  select estoque_atual, custo_medio into v_estoque_atual, v_custo_medio
  from itens_estoque where id = p_item_id for update;

  if v_estoque_atual < p_quantidade then
    raise exception 'Estoque insuficiente. Disponivel: %, solicitado: %', v_estoque_atual, p_quantidade;
  end if;

  v_custo_alocado := p_quantidade * v_custo_medio;

  update itens_estoque
  set estoque_atual = v_estoque_atual - p_quantidade
  where id = p_item_id;

  insert into movimentacoes_estoque (item_id, tipo, quantidade, vehicle_id, maintenance_id, observacao, usuario_id)
  values (p_item_id, 'saida', p_quantidade, p_vehicle_id, p_maintenance_id, p_observacao, auth.uid());

  if p_maintenance_id is not null then
    insert into manutencao_itens (maintenance_id, item_id, quantidade, custo_alocado)
    values (p_maintenance_id, p_item_id, p_quantidade, v_custo_alocado);
  end if;
end;
$$ language plpgsql security definer;
