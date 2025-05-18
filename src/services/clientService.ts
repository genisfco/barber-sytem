import { api } from './api';

export interface Client {
  id: string;
  barber_shop_id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const clientService = {
  // Buscar todos os clientes da barbearia
  async getAllClients(barberShopId: string): Promise<Client[]> {
    const response = await api.get(`/clients?barber_shop_id=${barberShopId}`);
    return response.data;
  },

  // Buscar um cliente específico
  async getClientById(id: string): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Buscar clientes por nome ou telefone
  async searchClients(barberShopId: string, searchTerm: string): Promise<Client[]> {
    const response = await api.get(`/clients/search?barber_shop_id=${barberShopId}&q=${searchTerm}`);
    return response.data;
  },

  // Criar novo cliente
  async createClient(
    barberShopId: string,
    client: Omit<Client, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>
  ): Promise<Client> {
    const response = await api.post('/clients', {
      ...client,
      barber_shop_id: barberShopId,
    });
    return response.data;
  },

  // Atualizar cliente
  async updateClient(
    id: string,
    client: Partial<Omit<Client, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>>
  ): Promise<Client> {
    const response = await api.put(`/clients/${id}`, client);
    return response.data;
  },

  // Desativar/Ativar cliente
  async toggleClientStatus(id: string, active: boolean): Promise<Client> {
    const response = await api.patch(`/clients/${id}/status`, { active });
    return response.data;
  }
}; 