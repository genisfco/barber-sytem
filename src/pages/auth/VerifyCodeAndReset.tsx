import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

// Função para validar a força da senha
const validatePasswordStrength = (password: string) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;

  return {
    isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    hasMinLength
  };
};

export function VerifyCodeAndReset() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      toast.error('A senha não atende aos requisitos mínimos de segurança.');
      setLoading(false);
      return;
    }

    try {
      await verifyAndResetPassword(email, code, newPassword);
      setLoading(false);
      toast.success('Senha alterada com sucesso');
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar código ou alterar senha');
      setLoading(false);
    }
  };

  const passwordStrength = newPassword ? validatePasswordStrength(newPassword) : null;

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
            <div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">Requisitos da senha:</p>
                  <ul className="text-sm space-y-1">
                    <li className={`flex items-center ${passwordStrength?.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength?.hasMinLength ? '✓' : '×'} Mínimo de 8 caracteres
                    </li>
                    <li className={`flex items-center ${passwordStrength?.hasUpperCase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength?.hasUpperCase ? '✓' : '×'} Letra maiúscula
                    </li>
                    <li className={`flex items-center ${passwordStrength?.hasLowerCase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength?.hasLowerCase ? '✓' : '×'} Letra minúscula
                    </li>
                    <li className={`flex items-center ${passwordStrength?.hasNumbers ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength?.hasNumbers ? '✓' : '×'} Número
                    </li>
                    <li className={`flex items-center ${passwordStrength?.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength?.hasSpecialChar ? '✓' : '×'} Caractere especial (!@#$%^&*(),.?":{}|&lt;&gt;)
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar nova senha"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
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