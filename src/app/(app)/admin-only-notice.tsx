// 관리자 전용 화면에 작업자가 들어왔을 때 보이는 안내와 돌아갈 링크
import Link from "next/link";
import { cardCls, linkCls } from "./items/common";

export function AdminOnlyNotice({
  href = "/",
  linkLabel = "대시보드로 가기",
}: {
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className={`${cardCls} mx-auto max-w-xl space-y-2`}>
      <p role="alert" className="text-sm font-medium text-ink">
        관리자만 사용할 수 있는 화면입니다.
      </p>
      <Link href={href} className={`${linkCls} inline-flex min-h-11 items-center`}>
        {linkLabel}
      </Link>
    </div>
  );
}
