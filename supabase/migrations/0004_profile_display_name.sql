-- 새 사용자의 표시 이름 기본값을 이메일 앞부분으로 채운다 (이력과 필터에서 작업자를 구분하기 위해)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 첫 사용자 두 명이 동시에 생겨도 관리자가 한 명만 되도록 직렬화한다.
  perform pg_advisory_xact_lock(hashtext('public.profiles.first_admin'));

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), '')
    ),
    case when exists (select 1 from public.profiles) then 'worker' else 'admin' end
  );
  return new;
end;
$$;
