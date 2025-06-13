import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayOfWeek } from '@/types/barberShop';
import { HourPicker } from '@/components/ui/HourPicker';

interface FormData {
  barberShopName: string;
  barberShopCnpj: string;
  barberShopPhone: string;
  barberShopAddress: string;
  barberShopEmail: string;
}

interface HorarioFuncionamento {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function ConfiguracoesBarbearia() {
  const { register, handleSubmit, reset, setValue } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [barberShop, setBarberShop] = useState<any>(null);
  const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([]);

  const diasSemana = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Buscar dados da barbearia
      const { data: barberShop, error: fetchError } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (fetchError) {
        console.error("Erro ao buscar barbearia:", fetchError);
        return;
      }

      if (barberShop) {
        setBarberShop(barberShop);
        setValue('barberShopName', barberShop.name);
        setValue('barberShopCnpj', barberShop.cnpj);
        setValue('barberShopPhone', barberShop.phone);
        setValue('barberShopAddress', barberShop.address);
        setValue('barberShopEmail', barberShop.email);

        // Buscar horários de funcionamento
        const { data: horarios, error: horariosError } = await supabase
          .from('barber_shop_hours')
          .select('*')
          .eq('barber_shop_id', barberShop.id)
          .order('day_of_week');

        if (horariosError) {
          console.error("Erro ao buscar horários:", horariosError);
          return;
        }

        if (horarios) {
          setHorarios(horarios);
        }
      }
    };

    checkUser();
  }, [navigate, setValue]);

  const formatBarberShopName = (value: string) => {
    if (value === value.toUpperCase()) {
      return value;
    }
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

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 14);
    
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 5) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
    if (limitedNumbers.length <= 8) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
    if (limitedNumbers.length <= 12) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12)}`;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCNPJ(e.target.value);
    setValue('barberShopCnpj', formattedValue);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 11);
    
    if (limitedNumbers.length > 2 && limitedNumbers[2] === '9') {
      return limitedNumbers.replace(
        /^(\d{2})(\d{5})(\d{4})/,
        '($1) $2-$3'
      );
    }
    
    return limitedNumbers.replace(
      /^(\d{2})(\d{4})(\d{4})/,
      '($1) $2-$3'
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setValue('barberShopPhone', formattedValue);
  };

  const handleHorarioChange = async (dia: number, campo: 'start_time' | 'end_time' | 'is_active', valor: string | boolean) => {
    const horarioAtual = horarios.find(h => h.day_of_week === dia);
    
    // Validação de horários
    if (campo === 'start_time' || campo === 'end_time') {
      const startTime = campo === 'start_time' ? valor as string : horarioAtual?.start_time;
      const endTime = campo === 'end_time' ? valor as string : horarioAtual?.end_time;
      
      if (startTime && endTime && startTime >= endTime) {
        setError('O horário de fechamento deve ser maior que o horário de abertura');
        return;
      }
    }

    try {
      if (horarioAtual) {
        const { error } = await supabase
          .from('barber_shop_hours')
          .update({ [campo]: valor })
          .eq('id', horarioAtual.id);

        if (error) {
          throw error;
        }

        setHorarios(horarios.map(h => 
          h.day_of_week === dia 
            ? { ...h, [campo]: valor }
            : h
        ));

        // Feedback visual temporário
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        const { data: newHorario, error } = await supabase
          .from('barber_shop_hours')
          .insert({
            barber_shop_id: barberShop.id,
            day_of_week: dia,
            start_time: campo === 'start_time' ? valor as string : '09:00',
            end_time: campo === 'end_time' ? valor as string : '20:00',
            is_active: campo === 'is_active' ? valor : true
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (newHorario) {
          setHorarios([...horarios, {
            id: newHorario.id,
            day_of_week: dia,
            start_time: campo === 'start_time' ? valor as string : '09:00',
            end_time: campo === 'end_time' ? valor as string : '20:00',
            is_active: campo === 'is_active' ? valor as boolean : true
          }]);

          // Feedback visual temporário
          setSuccess(true);
          setTimeout(() => setSuccess(false), 2000);
        }
      }
    } catch (err: any) {
      console.error("Erro ao salvar horário:", err);
      setError(err.message || 'Erro ao salvar horário');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !barberShop) {
      setError('Erro: Usuário ou barbearia não disponível.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('barber_shops')
        .update({
          name: data.barberShopName,
          cnpj: data.barberShopCnpj,
          phone: data.barberShopPhone,
          address: data.barberShopAddress,
          email: data.barberShopEmail,
        })
        .eq('id', barberShop.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados da barbearia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Configurações da Barbearia</h1>
      
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados da Barbearia</TabsTrigger>
          <TabsTrigger value="horarios">Horários de Funcionamento</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Barbearia</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Input 
                    id="barberShopCnpj" 
                    {...register('barberShopCnpj', { required: true })} 
                    onChange={handleCNPJChange}
                    maxLength={18}
                  />
                </div>
                <div>
                  <Label htmlFor="barberShopPhone">Telefone</Label>
                  <Input 
                    id="barberShopPhone" 
                    {...register('barberShopPhone', { required: true })} 
                    onChange={handlePhoneChange}
                    maxLength={15}
                  />
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
                {success && (
                  <div className="text-green-600 text-sm p-2 bg-green-50 rounded">
                    Dados atualizados com sucesso!
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-red-600 text-sm p-2 bg-red-50 rounded mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-600 text-sm p-2 bg-green-50 rounded mb-4">
                  Horário atualizado com sucesso!
                </div>
              )}
              <div className="space-y-4">
                {diasSemana.map((dia) => {
                  const horario = horarios.find(h => h.day_of_week === dia.value);
                  return (
                    <div key={dia.value} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center space-x-4">
                        <Switch
                          checked={horario?.is_active ?? false}
                          onCheckedChange={(checked) => handleHorarioChange(dia.value, 'is_active', checked)}
                        />
                        <span className="font-medium">{dia.label}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <Label>Abertura</Label>
                          <HourPicker
                            value={horario?.start_time ?? '09:00'}
                            onChange={(value) => handleHorarioChange(dia.value, 'start_time', value)}
                            disabled={!horario?.is_active}
                          />
                        </div>
                        <div>
                          <Label>Fechamento</Label>
                          <HourPicker
                            value={horario?.end_time ?? '20:00'}
                            onChange={(value) => handleHorarioChange(dia.value, 'end_time', value)}
                            disabled={!horario?.is_active}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 