import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  await requireRole(CAN_EDIT_CONTENT);
  return <>{children}</>;
}
