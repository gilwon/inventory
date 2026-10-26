// 비밀번호 변경 화면 (로그인한 모든 사용자)
import { PasswordForm } from "./password-form";

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">비밀번호 변경</h1>
      <PasswordForm />
    </div>
  );
}
