import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  barberShopName: string;
  barberShopCnpj: string;
  barberShopPhone: string;
  barberShopAddress: string;
  barberShopEmail: string;
  adminEmail: string;
  adminPassword: string;
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
    'Invalid CNPJ format': 'Formato de CNPJ inválido',
    'Invalid phone format': 'Formato de telefone inválido',
    'Network error': 'Erro de conexão. Verifique sua internet',
    'Server error': 'Erro no servidor. Tente novamente mais tarde',
  };

  // Procura por correspondências parciais nas mensagens de erro
  for (const [key, value] of Object.entries(mensagens)) {
    if (erro.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Se não encontrar uma tradução específica, retorna uma mensagem genérica
  return 'Ocorreu um erro durante o cadastro. Por favor, tente novamente.';
};

export default function CadastroBarbearia() {
  const { register, handleSubmit, reset } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Primeiro, tenta criar o usuário no Supabase sem confirmar
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          emailRedirectTo: window.location.origin + '/auth'
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Erro ao criar usuário');

      try {
        // 2. Tenta criar a barbearia
        await api.post('/barber-shops/onboarding', {
          barber_shop: {
            name: data.barberShopName,
            cnpj: data.barberShopCnpj,
            phone: data.barberShopPhone,
            address: data.barberShopAddress,
            email: data.barberShopEmail,
            admin_id: signUpData.user.id,
          },
          admin: {
            email: data.adminEmail,
            user_id: signUpData.user.id,
          },
        });

        // Se chegou aqui, tudo deu certo
        setSuccess(true);
        reset();
      } catch (err) {
        // Se falhou ao criar a barbearia, tenta deletar o usuário criado
        await supabase.auth.admin.deleteUser(signUpData.user.id);
        throw new Error('Erro ao salvar os dados da barbearia. Por favor, tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro durante o cadastro:', err);
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
          <h1 className="text-2xl font-bold mb-6">Cadastro da Barbearia</h1>
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
            <Label htmlFor="barberShopName">Nome da Barbearia</Label>
            <Input id="barberShopName" {...register('barberShopName', { required: true })} />
          </div>
          <div>
            <Label htmlFor="barberShopCnpj">CNPJ</Label>
            <Input id="barberShopCnpj" {...register('barberShopCnpj', { required: true })} />
          </div>
          <div>
            <Label htmlFor="barberShopPhone">Telefone</Label>
            <Input id="barberShopPhone" {...register('barberShopPhone', { required: true })} />
          </div>
          <div>
            <Label htmlFor="barberShopAddress">Endereço</Label>
            <Input id="barberShopAddress" {...register('barberShopAddress', { required: true })} />
          </div>
          <div>
            <Label htmlFor="barberShopEmail">E-mail da Barbearia</Label>
            <Input id="barberShopEmail" type="email" {...register('barberShopEmail', { required: true })} />
          </div>
          <div className="pt-4 border-t">
            <Label htmlFor="adminEmail">E-mail para login</Label>
            <Input id="adminEmail" type="email" {...register('adminEmail', { required: true })} />
          </div>
          <div>
            <Label htmlFor="adminPassword">Senha</Label>
            <Input 
              id="adminPassword" 
              type="password" 
              {...register('adminPassword', { required: true })}
              placeholder="Mínimo de 6 caracteres"
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