// 입고·출고·이동·조정을 한 화면에서 처리하는 페이지
import { Suspense } from "react";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { MoveForm } from "./move-form";

// 활성 위치만 선택지로 쓰고, 경로 문자열은 전체 위치로 만든다.
async function MoveContent() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id,parent_id,name,active");
  if (error) {
    return (
      <InlineAlert>
        위치 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </InlineAlert>
    );
  }
  const all = data ?? [];
  const paths = buildLocationPaths(all);
  const locations = all
    .filter((l) => l.active)
    .map((l) => ({ id: l.id, path: paths.get(l.id) ?? l.name }))
    .sort((a, b) => a.path.localeCompare(b.path, "ko"));
  return <MoveForm locations={locations} />;
}

export default function MovePage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">입출고</h1>
      <Suspense fallback={<ListSkeleton />}>
        <MoveContent />
      </Suspense>
    </div>
  );
}
