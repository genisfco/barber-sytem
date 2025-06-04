import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// Função para traduzir mensagens de erro do Supabase
const traduzirErro = (erro: string): string => {
  const mensagens: { [key: string]: string } = {
    'Email already registered': 'Este e-mail já está registrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
    'Invalid email': 'E-mail inválido',
    'Missing password': 'A senha é obrigatória',
    'Missing email': 'O e-mail é obrigatório',
    'Invalid login credentials': 'Credenciais inválidas',
    'User not found': 'Usuário não encontrado',
    'Error creating user': 'Erro ao criar usuário',
    'Network error': 'Erro de conexão. Verifique sua internet',
    'Server error': 'Erro no servidor. Tente novamente mais tarde',
  };

  for (const [key, value] of Object.entries(mensagens)) {
    if (erro.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'Ocorreu um erro durante o cadastro. Por favor, tente novamente.';
};

export default function CadastroBarbearia() {
  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Observa o valor do campo password para validação
  const password = watch('password');

  const onSubmit = async (data: FormData) => {
    // Validação das senhas
    if (data.password !== data.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (data.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin + '/auth'
        }
      });

      if (signUpError) {
        throw signUpError;
      }
      
      if (!signUpData.user) {
        throw new Error('Erro ao criar usuário');
      }

      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(traduzirErro(err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-8 rounded shadow-md bg-card text-center">
          <h2 className="text-2xl font-bold text-green-600">Cadastro realizado com sucesso!</h2>
          <p className="text-gray-600 mb-4">
            Enviamos um e-mail de confirmação para você.
            Por favor, verifique sua caixa de entrada e confirme seu cadastro para poder fazer login.
            Após confirmar seu e-mail e fazer login, você será redirecionado para configurar sua barbearia.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Ir para o Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md space-y-8 p-8 rounded shadow-md bg-card">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">Cadastro de Usuário</h1>
          <Button
            variant="link"
            className="text-sm text-blue-600 hover:underline"
            onClick={() => navigate('/auth')}
          >
            Voltar para o Login
          </Button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              {...register('email', { required: true })} 
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              {...register('password', { required: true })}
              placeholder="Mínimo de 6 caracteres"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              {...register('confirmPassword', { 
                required: true,
                validate: value => value === password || "As senhas não conferem"
              })}
              placeholder="Digite a mesma senha"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
      </div>
    </div>
  );
} 