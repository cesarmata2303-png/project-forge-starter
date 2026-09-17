import { BottomNav } from "@/components/layout/BottomNav";
import { SideMenu } from "@/components/layout/SideMenu";
import { RestTimer } from "@/components/workout/RestTimer";
import { DesktopNav } from "@/components/layout/DesktopNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64">
      <SideMenu />
      <DesktopNav />
      <RestTimer />
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 pt-14 sm:px-6 lg:px-8 lg:py-8 lg:pt-8 xl:px-10">{children}</main>
      <BottomNav />
    </div>
  );
}
