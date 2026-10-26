// 새 품목 등록 화면 (관리자 전용)
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { getRole } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { AdminOnlyNotice } from "../../admin-only-notice";
import { ItemForm } from "../item-form";
import { btnSecondary } from "../common";

async function NewItemContent() {
  if ((await getRole()) !== "admin")
    return <AdminOnlyNotice href="/items" linkLabel="품목 목록으로 가기" />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/items" className={btnSecondary}>
        품목 목록
      </Link>
      <h1 className="text-xl font-bold">새 품목</h1>
      <ItemForm demo={await isDemo()} />
    </div>
  );
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NewItemContent />
    </Suspense>
  );
}
