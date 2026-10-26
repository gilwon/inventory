// 연결이 끊겼을 때 서비스 워커가 보여 주는 정적 안내 페이지 (로그인 불필요, 데이터 없음)
import type { Metadata } from "next";
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = { title: "연결이 끊겼습니다" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-page px-4 py-8">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-ink">연결이 끊겼습니다</h1>
        <p className="text-sm text-ink-2">
          인터넷에 연결되면 다시 시도해 주세요. 재고 데이터는 연결된 상태에서만 볼 수 있습니다.
        </p>
        <ReloadButton />
      </div>
    </main>
  );
}
