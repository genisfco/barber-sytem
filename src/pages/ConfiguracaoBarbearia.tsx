import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  barberShopName: string;
  barberShopCnpj: string;
  barberShopPhone: string;
  barberShopAddress: string;
  barberShopEmail: string;
}

export default function ConfiguracaoBarbearia() {
  const { register, handleSubmit, reset, setValue } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      console.log("ConfiguracaoBarbearia: Verificando usuário logado...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("ConfiguracaoBarbearia: Usuário não logado, redirecionando para /auth");
        navigate('/auth');
        return;
      }
      console.log("ConfiguracaoBarbearia: Usuário logado encontrado:", user.id);
      setUser(user);

      // Verifica se o usuário já tem uma barbearia
      console.log("ConfiguracaoBarbearia: Verificando se usuário já possui barbearia...");
      const { data: barberShop, error: fetchError } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
         console.error("ConfiguracaoBarbearia: Erro ao buscar barbearia:", fetchError);
         // Podemos decidir o que fazer aqui, talvez exibir um erro ou tentar novamente
      } else if (barberShop) {
        console.log("ConfiguracaoBarbearia: Barbearia encontrada, redirecionando para /dashboard");
        navigate('/dashboard'); // Redireciona para o dashboard se já tiver barbearia
      } else {
        console.log("ConfiguracaoBarbearia: Nenhuma barbearia encontrada para este usuário.");
      }
    };

    checkUser();
  }, [navigate]);

  const formatBarberShopName = (value: string) => {
    // Se o texto estiver todo em maiúsculo, mantém assim
    if (value === value.toUpperCase()) {
      return value;
    }
    // Caso contrário, aplica o formato padrão (primeira letra maiúscula)
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleBarberShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatBarberShopName(e.target.value);
    setValue('barberShopName', formattedValue);
  };

  const formatEmail = (value: string) => {
    return value.toLowerCase();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatEmail(e.target.value);
    setValue('barberShopEmail', formattedValue);
  };

  const formatAddress = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatAddress(e.target.value);
    setValue('barberShopAddress', formattedValue);
  };

  const onSubmit = async (data: FormData) => {
    console.log("ConfiguracaoBarbearia: Formulário submetido. Dados:", data);
    if (!user) {
      console.log("ConfiguracaoBarbearia: Usuário não disponível ao submeter, abortando.");
      setError('Erro: Usuário não logado.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const barberShopData = {
        name: data.barberShopName,
        cnpj: data.barberShopCnpj,
        phone: data.barberShopPhone,
        address: data.barberShopAddress,
        email: data.barberShopEmail,
        admin_id: user.id,
        active: true,
        logo_url: null,
      };

      console.log("ConfiguracaoBarbearia: Tentando inserir dados da barbearia:", barberShopData);

      const { error: createError } = await supabase
        .from('barber_shops')
        .insert([barberShopData]); // Note: insert expects an array

      if (createError) {
        console.error("ConfiguracaoBarbearia: Erro ao criar barbearia no Supabase:", createError);
        throw createError;
      }

      console.log("ConfiguracaoBarbearia: Barbearia criada com sucesso!");

      setSuccess(true);
      reset();
      
      // Redireciona para o dashboard após um pequeno delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error("ConfiguracaoBarbearia: Erro durante a submissão do formulário:", err);
      setError(err.message || 'Erro ao criar barbearia');
    } finally {
      setLoading(false);
      console.log("ConfiguracaoBarbearia: Finalizando loading.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-8 rounded shadow-md bg-card text-center">
          <h2 className="text-2xl font-bold text-green-600">Barbearia configurada com sucesso!</h2>
          <p className="text-gray-600 mb-4">
            Você será redirecionado para o dashboard em instantes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md space-y-8 p-8 rounded shadow-md bg-card">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">Configuração da Barbearia</h1>
          <p className="text-sm text-gray-600 mb-4">
            Complete as informações da sua barbearia para começar a usar o sistema.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="barberShopName">Nome da Barbearia</Label>
            <Input 
              id="barberShopName" 
              {...register('barberShopName', { required: true })}
              onChange={handleBarberShopNameChange}
            />
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
            <Input 
              id="barberShopAddress" 
              {...register('barberShopAddress', { required: true })} 
              onChange={handleAddressChange}
            />
          </div>
          <div>
            <Label htmlFor="barberShopEmail">E-mail da Barbearia</Label>
            <Input 
              id="barberShopEmail" 
              type="email"
              {...register('barberShopEmail', { required: true })} 
              onChange={handleEmailChange}
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </div>
    </div>
  );
} 