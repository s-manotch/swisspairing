import { AdminPage } from "@/components/admin-page";

import { AdminPageV2 } from "@/components/admin-page-v2";
import { AdminPageV3 } from "@/components/admin-page-v3";
void AdminPage;
void AdminPageV3;
export default function AdminRoutePage() {
  return (
    <main className="px-6 py-10 sm:px-8 lg:px-12">
      <AdminPageV2 />
    </main>
  );
}
