-- Thiệp 20/10: bảng cards + RPC. Không có tài khoản người dùng; quyền sửa/xoá = edit token bí mật.
-- Trạng thái: CHƯA chạy thử trên Postgres/Supabase thật.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique check (share_id ~ '^[A-Za-z0-9_-]{11}$'),
  edit_token_hash text not null,
  recipient_name text not null check (char_length(recipient_name) between 1 and 60),
  sender_name text not null check (char_length(sender_name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 3000),
  theme text not null default 'rose' check (theme in ('rose','sage','peach')),
  content jsonb not null default '{}' check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 8192),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);
-- RLS bật và KHÔNG có policy nào: anon/authenticated không đọc/ghi trực tiếp được bảng.
alter table public.cards enable row level security;
revoke all on table public.cards from public, anon, authenticated;

create table private.create_log (ip_hash text not null, at timestamptz not null default now());
create index on private.create_log (at);
create index on private.create_log (ip_hash, at);

create function private.validate_card(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare r text; s text; m text; t text; c jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'invalid_card'; end if;
  r := btrim(coalesce(p->>'recipient_name','')); s := btrim(coalesce(p->>'sender_name',''));
  m := btrim(coalesce(p->>'message','')); t := coalesce(p->>'theme','rose');
  if char_length(r) not between 1 and 60 or char_length(s) not between 1 and 60
     or char_length(m) not between 1 and 3000 or t not in ('rose','sage','peach') then
    raise exception 'invalid_card'; end if;
  c := coalesce(p->'content','{}'::jsonb);
  if jsonb_typeof(c) is distinct from 'object' then raise exception 'invalid_card'; end if;
  c := jsonb_build_object(  -- chỉ giữ các khoá được phép (chống mass assignment)
    'title', left(coalesce(c->>'title',''),160), 'close', left(coalesce(c->>'close',''),160),
    'ps', left(coalesce(c->>'ps',''),160), 'fin', left(coalesce(c->>'fin',''),160),
    'ph', case when jsonb_typeof(c->'ph') = 'object' then c->'ph' else '{}'::jsonb end,
    'st', case when jsonb_typeof(c->'st') = 'array' and jsonb_array_length(c->'st') <= 30 then c->'st' else '[]'::jsonb end);
  if octet_length(c::text) > 8192 then raise exception 'invalid_card'; end if;
  return jsonb_build_object('recipient_name',r,'sender_name',s,'message',m,'theme',t,'content',c);
end $$;

create function private.owned_card(p_share_id text, p_token text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if p_token is null or char_length(p_token) not between 16 and 64 then raise exception 'forbidden'; end if;
  select id into v from public.cards where share_id = p_share_id
    and edit_token_hash = encode(extensions.digest(convert_to(p_token,'utf8'),'sha256'),'hex');
  if v is null then raise exception 'forbidden'; end if;
  return v;
end $$;

create function public.create_card(p_card jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := private.validate_card(p_card); h text; tok text; sid text; n int := 0;
begin
  -- Giới hạn tốc độ theo IP (x-forwarded-for, best-effort) + ngưỡng toàn cục.
  h := encode(extensions.digest(convert_to(split_part(coalesce(
         nullif(current_setting('request.headers', true),'')::json->>'x-forwarded-for','unknown'),',',1),'utf8'),'sha256'),'hex');
  delete from private.create_log where at < now() - interval '1 day';
  if (select count(*) from private.create_log where ip_hash = h and at > now() - interval '1 hour') >= 10
     or (select count(*) from private.create_log where at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited'; end if;
  insert into private.create_log(ip_hash) values (h);
  tok := translate(encode(extensions.gen_random_bytes(24),'base64'),'+/=','-_');
  loop
    sid := rtrim(translate(encode(extensions.gen_random_bytes(8),'base64'),'+/','-_'),'=');
    begin
      insert into public.cards(share_id, edit_token_hash, recipient_name, sender_name, message, theme, content)
      values (sid, encode(extensions.digest(convert_to(tok,'utf8'),'sha256'),'hex'),
              v->>'recipient_name', v->>'sender_name', v->>'message', v->>'theme', v->'content');
      exit;
    exception when unique_violation then
      n := n + 1; if n >= 3 then raise exception 'unavailable'; end if;
    end;
  end loop;
  return jsonb_build_object('share_id', sid, 'edit_token', tok);
end $$;

-- Công khai: chỉ thiệp đã publish và chưa hết hạn. Thiệp nháp/không có/hết hạn đều trả null (không lộ sự tồn tại).
create function public.get_card(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('share_id',share_id,'recipient_name',recipient_name,'sender_name',sender_name,
    'message',message,'theme',theme,'content',content,'updated_at',updated_at)
  from public.cards
  where share_id = p_share_id and status = 'published' and (expires_at is null or expires_at > now())
  limit 1;
$$;

create function public.get_card_for_edit(p_share_id text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := private.owned_card(p_share_id, p_token);
begin
  return (select jsonb_build_object('share_id',share_id,'recipient_name',recipient_name,'sender_name',sender_name,
    'message',message,'theme',theme,'content',content,'status',status,'updated_at',updated_at)
    from public.cards where id = v);
end $$;

create function public.update_card(p_share_id text, p_token text, p_card jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := private.validate_card(p_card); id_ uuid := private.owned_card(p_share_id, p_token);
begin
  update public.cards set recipient_name = v->>'recipient_name', sender_name = v->>'sender_name',
    message = v->>'message', theme = v->>'theme', content = v->'content', updated_at = now()
  where id = id_;
  return jsonb_build_object('ok', true);
end $$;

create function public.set_card_status(p_share_id text, p_token text, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare id_ uuid := private.owned_card(p_share_id, p_token);
begin
  if p_status not in ('draft','published') then raise exception 'invalid_card'; end if;
  update public.cards set status = p_status, updated_at = now() where id = id_;
  return jsonb_build_object('status', p_status);
end $$;

create function public.delete_card(p_share_id text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare id_ uuid := private.owned_card(p_share_id, p_token);
begin
  delete from public.cards where id = id_;
  return jsonb_build_object('ok', true);
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.create_card(jsonb), public.get_card(text), public.get_card_for_edit(text,text),
  public.update_card(text,text,jsonb), public.set_card_status(text,text,text), public.delete_card(text,text)
  from public, anon, authenticated;
grant execute on function public.create_card(jsonb), public.get_card(text), public.get_card_for_edit(text,text),
  public.update_card(text,text,jsonb), public.set_card_status(text,text,text), public.delete_card(text,text)
  to anon, authenticated;
