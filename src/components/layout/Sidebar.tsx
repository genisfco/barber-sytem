import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  DollarSign,
  BarChart,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/barbeiros", label: "Barbeiros", icon: Scissors },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign },
    { href: "/relatorio-mensal", label: "Relatório Mensal", icon: BarChart },
    { href: "/relatorio-anual", label: "Relatório Anual", icon: TrendingUp },
  ];

  return (
    <aside className="w-64 min-h-screen bg-secondary border-r border-primary/10">
      <div className="h-16 flex items-center px-6 border-b border-primary/10">
        <Link to="/" className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="font-display text-xl text-primary">BarberPro</span>
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive(link.href)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-primary/10"
            )}
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </Link>
        ))}

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </nav>
    </aside>
  );
}