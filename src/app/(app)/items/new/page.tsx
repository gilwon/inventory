// 새 품목 등록 화면
import Link from "next/link";
import { ItemForm } from "../item-form";
import { linkCls } from "../common";

export default function NewItemPage() {
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
