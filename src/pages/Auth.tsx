import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionExpired = location.state?.sessionExpired;
  const loggedOut = location.state?.loggedOut;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log("Auth.tsx: Tentando fazer login com:", { email });
      await signIn({ email, password });
      console.log("Auth.tsx: Login realizado com sucesso.");
      navigate("/");
    } catch (error) {
      console.error("Auth.tsx: Erro durante o login:", error);
      toast({
        title: "Erro ao fazer login",
        description: error instanceof Error ? error.message : "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("Auth.tsx: Finalizando loading.");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, insira seu email para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      console.log("Auth.tsx: Iniciando processo de recuperação de senha para:", email);
      await resetPassword(email);
      console.log("Auth.tsx: Email de recuperação enviado com sucesso");
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para instruções de recuperação de senha. Se não encontrar o email, verifique também a pasta de spam.",
        duration: 5000, // 5 segundos
      });
    } catch (error) {
      console.error("Auth.tsx: Erro ao enviar email de recuperação:", error);
      toast({
        title: "Erro ao enviar email",
        description: error instanceof Error ? error.message : "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
        duration: 5000, // 5 segundos
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Entre com suas credenciais para acessar o sistema
          </p>
          {sessionExpired && (
            <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded">
              Sua sessão expirou. Por favor, faça login novamente.
            </div>
          )}
          {loggedOut && (
            <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">
              Você saiu do sistema com sucesso.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isResettingPassword}
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isResettingPassword}
              />
              <button
                type="button"
                onClick={() => navigate('/auth/request-reset')}
                disabled={isLoading || isResettingPassword}
                className="text-sm text-blue-600 hover:underline mt-1"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isResettingPassword}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="text-center mt-4">
          <span className="text-sm text-gray-600">Ainda não tem Cadastro?</span>
          <br />
          <Link to="/cadastro-barbearia" className="text-blue-600 hover:underline text-sm">
            Cadastre sua Barbearia
          </Link>
        </div>
      </div>
    </div>
  );
}
