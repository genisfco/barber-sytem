import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
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

// Funções de validação de CPF e CNPJ
function validarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function validarCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  return true;
}

export default function CadastroBarbearia() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Observa mudanças nos campos de endereço para atualizar as coordenadas
  const watchAddress = watch(['logradouro', 'numero', 'bairro', 'cidade', 'estado']);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: barberShop, error: fetchError } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
      } else if (barberShop) {
        navigate('/dashboard');
      } else {
      }
    };

    checkUser();
  }, [navigate]);

  // Função para geocodificar o endereço usando Google Maps
  const geocodeAddress = async () => {
    const [logradouro, numero, bairro, cidade, estado] = watchAddress;
    
    if (!logradouro || !numero || !bairro || !cidade || !estado) {
      setCoordinates(null);
      setValue('latitude', undefined);
      setValue('longitude', undefined);
      return;
    }

    const address = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}`;
    
    try {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          
          setCoordinates({ lat, lng });
          setValue('latitude', lat);
          setValue('longitude', lng);
          setMapCenter({ lat, lng });
          setError(null);
        } else {
          setCoordinates(null);
          setValue('latitude', undefined);
          setValue('longitude', undefined);
          setError('Não foi possível obter as coordenadas do endereço. Ajuste o marcador no mapa.');
        }
      });
    } catch (err) {
      setCoordinates(null);
      setValue('latitude', undefined);
      setValue('longitude', undefined);
      setError('Erro ao obter coordenadas do endereço. Ajuste o marcador no mapa.');
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      setCoordinates({ lat, lng });
      setValue('latitude', lat);
      setValue('longitude', lng);
      setError(null);
    }
  };

  // Atualiza as coordenadas quando o endereço mudar
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        geocodeAddress();
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timer);
    }
  }, [watchAddress, loading]);

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

  const formatCnpjOrCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 11) {
      // Máscara CPF: 000.000.000-00
      return numbers
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2')
        .slice(0, 14);
    } else {
      // Máscara CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    }
  };

  const handleCnpjOrCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCnpjOrCpf(e.target.value);
    setValue('barberShopCnpj', formattedValue);
  };

  const formatPhone = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (DDD + 8 para fixo ou 9 + 8 para celular)
    const limitedNumbers = numbers.slice(0, 11);
    
    // Verifica se é celular (começa com 9 após o DDD)
    if (limitedNumbers.length > 2 && limitedNumbers[2] === '9') {
      return limitedNumbers.replace(
        /^(\d{2})(\d{5})(\d{4})/,
        '($1) $2-$3'
      );
    }
    
    // Formato para telefone fixo
    return limitedNumbers.replace(
      /^(\d{2})(\d{4})(\d{4})/,
      '($1) $2-$3'
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setValue('barberShopPhone', formattedValue);
  };

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
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        return;
      }

      setValue('logradouro', data.logradouro);
      setValue('bairro', data.bairro);
      setValue('cidade', data.localidade);
      setValue('estado', data.uf);
    } catch (err) {
      setError('Erro ao buscar CEP');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setError('Erro: Usuário não logado.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const formattedAddress = `${data.logradouro}, ${data.numero} - ${data.bairro} - ${data.cidade} - ${data.estado}`;

      const barberShopData = {
        name: data.barberShopName,
        cnpj: data.barberShopCnpj,
        phone: data.barberShopPhone,
        address: formattedAddress,
        cep: data.cep,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        email: data.barberShopEmail,
        admin_id: user.id,
        active: true,
        logo_url: null,
      };

      const { error: createError } = await supabase
        .from('barber_shops')
        .insert([barberShopData]);

      if (createError) {
        setError(createError.message || 'Erro ao criar barbearia');
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 5000); // 5 segundos
      return;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar barbearia');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-8 rounded shadow-md bg-card text-center">
          <div className="text-green-600 text-lg font-bold p-2 bg-green-50 rounded mb-4">
            Barbearia cadastrada com sucesso! 
          </div>
          <p className="text-gray-200 text-base mb-4">
            Você será direcionado para o seu Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-4xl space-y-8 p-8 rounded shadow-md bg-card">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">Cadastro da Barbearia</h1>
          <p className="text-sm text-gray-200 mb-4">
            Complete as informações da sua Barbearia para ter acesso ao BarberPro.
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
            <Label htmlFor="barberShopCnpj">CNPJ ou CPF</Label>
            <Input 
              id="barberShopCnpj" 
              {...register('barberShopCnpj', { 
                required: true,
                validate: value => {
                  const numbers = value.replace(/\D/g, '');
                  if (numbers.length === 11) {
                    return validarCPF(numbers) || 'CPF inválido';
                  } else if (numbers.length === 14) {
                    return validarCNPJ(numbers) || 'CNPJ inválido';
                  }
                  return 'Digite um CPF ou CNPJ válido';
                }
              })} 
              onChange={handleCnpjOrCpfChange}
              maxLength={18}
              placeholder="Digite o CNPJ ou CPF"
            />
            {errors.barberShopCnpj && (
              <span className="text-red-600 text-sm">{errors.barberShopCnpj.message as string}</span>
            )}
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

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Endereço</h2>
            
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input 
                id="cep" 
                {...register('cep', { required: true })} 
                onChange={handleCEPChange}
                onBlur={handleCEPBlur}
                maxLength={9}
                placeholder="00000-000"
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
            </div>

            {coordinates && (
              <div className="text-sm text-secondary">
                Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
            )}
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
          
          <Button type="submit" className="w-full" disabled={loading || !user}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </div>
    </div>
  );
} 