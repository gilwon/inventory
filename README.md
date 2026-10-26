# 재고 관리 웹앱

1. Node.js 20 이상과 Supabase 프로젝트를 준비한다.
2. `npm install`
3. `.env.example` 을 `.env.local` 로 복사해 Supabase URL과 publishable 키를 채운다.
4. `supabase/migrations/` 의 SQL을 순서대로 Supabase에 적용한다.
5. Supabase 대시보드에서 "Allow new users to sign up" 을 끄고 첫 계정을 만든다.
6. `npm run dev` 후 http://localhost:3000 에서 로그인한다.
7. 검사는 `npm run lint`, `npx tsc --noEmit`, `npm run build`.
