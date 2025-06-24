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
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface FormData {
  barberShopName: string;
  barberShopCnpj: string;
  barberShopPhone: string;
  barberShopEmail: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
}

interface HorarioFuncionamento {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: -23.550520, // São Paulo
  lng: -46.633308
};

export default function ConfiguracoesBarbearia() {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [errorDados, setErrorDados] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [barberShop, setBarberShop] = useState<any>(null);
  const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [errorHorarios, setErrorHorarios] = useState<string | null>(null);

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
        return;
      }

      if (barberShop) {
        setBarberShop(barberShop);
        setValue('barberShopName', barberShop.name || '');
        setValue('barberShopCnpj', barberShop.cnpj || '');
        setValue('barberShopPhone', barberShop.phone || '');
        setValue('barberShopEmail', barberShop.email || '');
        setValue('cep', barberShop.cep || '');
        setValue('latitude', barberShop.latitude || undefined);
        setValue('longitude', barberShop.longitude || undefined);
        if (barberShop.latitude && barberShop.longitude) {
          setCoordinates({ lat: barberShop.latitude, lng: barberShop.longitude });
          setMapCenter({ lat: barberShop.latitude, lng: barberShop.longitude });
        }
        // Separar o address
        if (barberShop.address) {
          // Exemplo: Avenida Aprígio Bezerra da Silva, 1335 - Chácara Agrindus - Taboão da Serra - SP
          const regex = /^(.*),\s*(\d+)\s*-\s*(.*)\s*-\s*(.*)\s*-\s*([A-Z]{2})$/;
          const match = barberShop.address.match(regex);
          if (match) {
            setValue('logradouro', match[1]);
            setValue('numero', match[2]);
            setValue('bairro', match[3]);
            setValue('cidade', match[4]);
            setValue('estado', match[5]);
          } else {
            setValue('logradouro', '');
            setValue('numero', '');
            setValue('bairro', '');
            setValue('cidade', '');
            setValue('estado', '');
          }
        }

        // Buscar horários de funcionamento
        const { data: horarios, error: horariosError } = await supabase
          .from('barber_shop_hours')
          .select('*')
          .eq('barber_shop_id', barberShop.id)
          .order('day_of_week');

        if (horariosError) {
          return;
        }

        if (horarios) {
          setHorarios(horarios);
        }
      }
    };

    checkUser();
  }, [navigate, setValue]);

  // Observa mudanças nos campos de endereço para atualizar as coordenadas
  const watchAddress = watch(['logradouro', 'numero', 'bairro', 'cidade', 'estado']);

  // Função para geocodificar o endereço usando Google Maps
  const geocodeAddress = async () => {
    const [logradouro, numero, bairro, cidade, estado] = watchAddress;
    if (!logradouro || !numero || !bairro || !cidade || !estado) {
      setCoordinates(null);
      setValue('latitude', undefined);
      setValue('longitude', undefined);
      return;
    }
    const address = `${logradouro}, ${numero} - ${bairro} - ${cidade} - ${estado}`;
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          setCoordinates({ lat, lng });
          setValue('latitude', lat);
          setValue('longitude', lng);
          setMapCenter({ lat, lng });
          setErrorDados(null);
        } else {
          setCoordinates(null);
          setValue('latitude', undefined);
          setValue('longitude', undefined);
          setErrorDados('Não foi possível obter as coordenadas do endereço.');
        }
      });
    } catch (err) {
      setCoordinates(null);
      setValue('latitude', undefined);
      setValue('longitude', undefined);
      setErrorDados('Erro ao obter coordenadas do endereço.');
    }
  };

  // Atualiza as coordenadas quando o endereço mudar (busca automática)
  useEffect(() => {
    const timer = setTimeout(() => {
      geocodeAddress();
    }, 1000); // Debounce de 1 segundo
    return () => clearTimeout(timer);
  }, [watchAddress]);

  // Função para calcular distância entre dois pontos (Haversine)
  function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      0.5 - Math.cos(dLat)/2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      (1 - Math.cos(dLon))/2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // Função para atualizar coordenadas ao arrastar o marcador
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      // Se já existe uma coordenada de referência (do endereço), calcula a distância
      if (coordinates && coordinates.lat && coordinates.lng) {
        const dist = getDistanceFromLatLonInMeters(coordinates.lat, coordinates.lng, lat, lng);
        if (dist > 500) {
          setErrorDados('O marcador foi movido para muito longe do endereço digitado. Verifique se o endereço está correto ou ajuste o marcador próximo ao endereço.');
        } else {
          setErrorDados(null);
        }
      }
      setCoordinates({ lat, lng });
      setValue('latitude', lat);
      setValue('longitude', lng);
    }
  };

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
        setErrorHorarios('O horário de fechamento deve ser maior que o horário de abertura');
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
      setErrorHorarios(err.message || 'Erro ao salvar horário');
    }
  };

  // Função para formatar o CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 8);
    return limitedNumbers.replace(/^(\d{5})(\d{3})/, '$1-$2');
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCEP(e.target.value);
    setValue('cep', formattedValue);
  };

  const handleCEPBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    if (cep.length === 9) { // 00000-000
      fetchAddressByCEP(cep);
    }
  };

  const fetchAddressByCEP = async (cep: string) => {
    try {
      const cleanCEP = cep.replace(/\D/g, '');
      if (cleanCEP.length !== 8) return;

      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        setErrorDados('CEP não encontrado');
        return;
      }

      setValue('logradouro', data.logradouro);
      setValue('bairro', data.bairro);
      setValue('cidade', data.localidade);
      setValue('estado', data.uf);
    } catch (err) {
      setErrorDados('Erro ao buscar CEP');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !barberShop) {
      setErrorDados('Erro: Usuário ou barbearia não disponível.');
      return;
    }
    
    setLoading(true);
    setErrorDados(null);

    try {
      // Montar o endereço no formato correto
      const formattedAddress = `${data.logradouro}, ${data.numero} - ${data.bairro} - ${data.cidade} - ${data.estado}`;
      const { error: updateError } = await supabase
        .from('barber_shops')
        .update({
          name: data.barberShopName,
          cnpj: data.barberShopCnpj,
          phone: data.barberShopPhone,
          address: formattedAddress,
          cep: data.cep,
          latitude: data.latitude,
          longitude: data.longitude,
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
      setErrorDados(err.message || 'Erro ao atualizar dados da barbearia');
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
                  <Label htmlFor="cep">CEP</Label>
                  <Input 
                    id="cep" 
                    {...register('cep', { required: true })} 
                    maxLength={9}
                    onChange={handleCEPChange}
                    onBlur={handleCEPBlur}
                  />
                </div>
                <div>
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input 
                    id="logradouro" 
                    {...register('logradouro', { required: true })} 
                  />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input 
                    id="numero" 
                    {...register('numero', { required: true })} 
                  />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input 
                    id="bairro" 
                    {...register('bairro', { required: true })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input 
                      id="cidade" 
                      {...register('cidade', { required: true })} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input 
                      id="estado" 
                      {...register('estado', { required: true })} 
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Localização no Mapa</Label>
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={15}
                      >
                        {coordinates && (
                          <Marker
                            position={coordinates}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                          />
                        )}
                      </GoogleMap>
                    </LoadScript>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Arraste o marcador para ajustar a localização exata da barbearia
                  </p>
                </div>
                {coordinates && (
                  <div className="text-sm text-gray-500">
                    Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </div>
                )}
                <div>
                  <Label htmlFor="barberShopEmail">E-mail da Barbearia</Label>
                  <Input 
                    id="barberShopEmail" 
                    type="email"
                    {...register('barberShopEmail', { required: true })} 
                    onChange={handleEmailChange}
                  />
                </div>
                {errorDados && (
                  <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                    {errorDados}
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
              {errorHorarios && (
                <div className="text-red-600 text-sm p-2 bg-red-50 rounded mb-4">
                  {errorHorarios}
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