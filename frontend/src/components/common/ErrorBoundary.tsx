import { useRouteError } from "react-router";
import toast from "react-hot-toast";

export function ErrorBoundary() {
  const error = useRouteError() as any;
  toast.error(error?.message || 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.');
  return (
    <div className="p-4 bg-red-100 text-red-900 border border-red-300 rounded">
      <h1 className="font-bold">Đã xảy ra lỗi hệ thống!</h1>
      <p className="mt-2 text-sm">Vui lòng tải lại trang hoặc liên hệ quản trị viên.</p>
    </div>
  );
}