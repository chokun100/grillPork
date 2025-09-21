import { Link } from "@heroui/link";
import { AppNavbar } from "@/components/AppNavbar";
import { AppSidebar } from "@/components/AppSidebar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <AppNavbar />
        <main className="container mx-auto max-w-7xl px-6 flex-grow overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
