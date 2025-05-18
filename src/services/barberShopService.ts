import { api } from './api';
import { BarberShop, BarberShopHours } from '../types/barberShop';

export const barberShopService = {
  // Buscar todas as barbearias
  async getAllBarberShops(): Promise<BarberShop[]> {
    const response = await api.get('/barber-shops');
    return response.data;
  },

  // Buscar uma barbearia específica
  async getBarberShopById(id: string): Promise<BarberShop> {
    const response = await api.get(`/barber-shops/${id}`);
    return response.data;
  },

  // Buscar horários de funcionamento de uma barbearia
  async getBarberShopHours(barberShopId: string): Promise<BarberShopHours[]> {
    const response = await api.get(`/barber-shops/${barberShopId}/hours`);
    return response.data;
  },

  // Atualizar horários de funcionamento
  async updateBarberShopHours(
    barberShopId: string,
    hours: Omit<BarberShopHours, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>[]
  ): Promise<BarberShopHours[]> {
    const response = await api.put(`/barber-shops/${barberShopId}/hours`, { hours });
    return response.data;
  },

  // Criar nova barbearia
  async createBarberShop(
    barberShop: Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BarberShop> {
    const response = await api.post('/barber-shops', barberShop);
    return response.data;
  },

  // Atualizar barbearia
  async updateBarberShop(
    id: string,
    barberShop: Partial<Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<BarberShop> {
    const response = await api.put(`/barber-shops/${id}`, barberShop);
    return response.data;
  }
}; 