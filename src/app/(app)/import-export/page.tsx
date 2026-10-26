// 엑셀 가져오기·내보내기 화면의 서버 쪽 틀
import { Suspense } from "react";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { getRole } from "@/lib/auth";
import { ImportPanel } from "./import-panel";

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-ink-3 bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

async function ImportExportContent() {
  const isAdmin = (await getRole()) === "admin";
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <h1 className="text-xl font-bold">가져오기 / 내보내기</h1>

      <section aria-labelledby="export-title" className="space-y-3">
        <h2 id="export-title" className="text-lg font-semibold">
          내보내기
        </h2>
        <p className="text-sm text-ink-2">
          현재 재고와 이력을 엑셀 파일 하나로 받습니다. 이력은 최신 50,000행까지 담깁니다.
        </p>
        <a href="/api/export" download className={btn}>
          엑셀로 내보내기
        </a>
      </section>

      {isAdmin ? (
      <section aria-labelledby="import-title" className="space-y-3">
        <h2 id="import-title" className="text-lg font-semibold">
          가져오기
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>양식 파일에 위치와 품목을 채워 올립니다. 파일은 5MB 이하, 5,000행 이하입니다.</li>
          <li>오류가 하나라도 있으면 아무것도 가져오지 않습니다.</li>
          <li>이미 있는 SKU는 품목 정보를 갱신하며, 빈 칸은 기존 값을 그대로 둡니다.</li>
          <li>이미 수량이 있는 품목과 위치 조합의 수량은 무시됩니다.</li>
        </ul>
        <a href="/api/import/template" download className={btn}>
          양식 받기
        </a>
        <ImportPanel />
      </section>
      ) : (
        <p className="text-sm text-ink-2">가져오기는 관리자만 사용할 수 있습니다.</p>
      )}
    </div>
  );
}

// 권한 확인은 Suspense 안에서 해서 화면 이동이 막히지 않게 한다.
export default function ImportExportPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ImportExportContent />
    </Suspense>
  );
}
