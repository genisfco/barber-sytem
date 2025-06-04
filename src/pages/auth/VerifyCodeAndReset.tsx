import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

export function VerifyCodeAndReset() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyAndResetPassword } = useAuth();
  const email = location.state?.email;

  if (!email) {
    navigate('/auth/request-reset');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      await verifyAndResetPassword(email, code, newPassword);
      toast.success('Senha alterada com sucesso');
      setLoading(false);
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar código ou alterar senha');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Confirmar Código</CardTitle>
          <CardDescription>
            Digite o código recebido em seu email e sua nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Código de verificação"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/auth/request-reset')}
            >
              Voltar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 