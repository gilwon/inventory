-- 사진 덮어쓰기 정책 제거 (보안 검토 Medium)
-- 앱은 항상 새 경로에 upsert:false 로 올리므로 update 정책이 필요 없다.
-- 이 정책이 있으면 로그인한 누구든 다른 품목의 사진 객체를 덮어쓸 수 있었다.
drop policy if exists item_photos_update on storage.objects;
