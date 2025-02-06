import { Home, Calendar, Users, Scissors, DollarSign, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Calendar, label: "Agendamentos", path: "/agendamentos" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: Scissors, label: "Barbeiros", path: "/barbeiros" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  ];

  return (
    <div className={cn(
      "h-screen bg-barber-dark text-white transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="p-4 flex justify-between items-center">
        {!collapsed && <h2 className="font-display text-xl text-barber-gold">BarberPro</h2>}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:text-barber-gold"
        >
          <Menu />
        </Button>
      </div>
      <nav className="mt-8">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center px-4 py-3 text-sm hover:bg-barber-brown/20 transition-colors"
          >
            <item.icon className="h-5 w-5 text-barber-gold" />
            {!collapsed && <span className="ml-4">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}