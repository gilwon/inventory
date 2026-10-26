// 새 품목 등록 화면 (관리자 전용)
import Link from "next/link";
import { Suspense } from "react";
import { getRole } from "@/lib/auth";
import { AdminOnlyNotice } from "../../admin-only-notice";
import { ItemForm } from "../item-form";
import { linkCls } from "../common";

async function NewItemContent() {
  if ((await getRole()) !== "admin")
    return <AdminOnlyNotice href="/items" linkLabel="품목 목록으로 가기" />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/items" className={`${linkCls} inline-flex min-h-11 items-center`}>
        품목 목록
      </Link>
      <h1 className="text-xl font-bold">새 품목</h1>
      <ItemForm />
    </div>
  );
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중...</p>}>
      <NewItemContent />
    </Suspense>
  );
}
