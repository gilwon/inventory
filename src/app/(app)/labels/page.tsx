// QR·바코드 라벨 선택·출력 형식·미리보기·인쇄 페이지 (로그인 확인은 (app) 레이아웃이 한다)
import { Suspense } from "react";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { LabelPicker } from "./label-picker";

// 선택 목록은 사용 중인 품목·위치만 쓴다. 한 번에 읽는 상한은 Supabase 기본(1000행)이다.
async function LabelsContent() {
  const supabase = await createClient();
  const [itemsRes, locsRes] = await Promise.all([
    supabase.from("items").select("id,sku,name").eq("active", true).order("sku"),
    supabase.from("locations").select("id,parent_id,code,name,active"),
  ]);
  if (itemsRes.error || locsRes.error) {
    return (
      <InlineAlert>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</InlineAlert>
    );
  }
  const allLocs = locsRes.data ?? [];
  const paths = buildLocationPaths(allLocs);
  const items = (itemsRes.data ?? []).map((i) => ({ id: i.id, title: i.name, code: i.sku }));
  const locations = allLocs
    .filter((l) => l.active)
    .map((l) => ({ id: l.id, title: paths.get(l.id) ?? l.name, code: l.code }))
    .sort((a, b) => a.code.localeCompare(b.code, "ko"));
  return <LabelPicker items={items} locations={locations} />;
}

export default function LabelsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="label-noprint text-xl font-bold">라벨 인쇄</h1>
      <Suspense fallback={<ListSkeleton />}>
        <LabelsContent />
      </Suspense>
    </div>
  );
}
