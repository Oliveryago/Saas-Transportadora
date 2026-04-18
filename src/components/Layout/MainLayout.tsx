import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { GlobalSearch } from "../shared/GlobalSearch";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            <Sidebar />
            <main className="flex-1 md:ml-64 transition-all duration-300 relative">
                {children}
            </main>
            <BottomNav />
            <GlobalSearch />
        </div>
    );
}
