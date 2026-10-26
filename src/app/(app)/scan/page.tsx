// QR·바코드 스캔 페이지 (로그인 확인은 (app) 레이아웃이 한다)
import { ScanClient } from "./scan-client";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">스캔</h1>
      <ScanClient />
    </div>
  );
}
