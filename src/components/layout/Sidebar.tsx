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
  ListTodo,
  Package,
  CreditCard,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isOpen, toggle, close } = useSidebar();
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const links = [
    { href: "/", label: "Dashboard Principal", icon: LayoutDashboard },
    { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/barbeiros", label: "Barbeiros", icon: Scissors },
    { href: "/servicos", label: "Serviços", icon: ListTodo },
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/assinaturas", label: "Assinaturas", icon: CreditCard },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign },
    { href: "/relatorio-mensal", label: "Relatório Mensal", icon: BarChart },
    { href: "/relatorio-anual", label: "Relatório Anual", icon: TrendingUp },
    { href: "/configuracoes-barbearia", label: "Configurações", icon: Settings },
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      close();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-secondary border-r border-primary/10 transform transition-transform duration-300 ease-in-out",
          isMobile
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-primary/10">
          <Link to="/" className="flex items-center gap-2" onClick={handleLinkClick}>
            <Scissors className="h-10 w-10 text-primary" />
            <span className="font-display text-xl text-primary">BarberPro</span>
          </Link>
          
          {/* Botão de fechar para mobile */}
          {isMobile && (
            <button
              onClick={close}
              className="lg:hidden p-2 rounded-md hover:bg-primary/10"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={handleLinkClick}
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
            onClick={() => {
              signOut();
              handleLinkClick();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </nav>
      </aside>
    </>
  );
}