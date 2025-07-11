// Serviço mock para simulação de pagamentos PIX (apenas para desenvolvimento)

interface PixPaymentData {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  external_reference?: string;
}

interface PixPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
}

export class PaymentServiceMock {
  /**
   * Gera dados simulados para desenvolvimento
   */
  static createPixPayment(data: PixPaymentData): PixPaymentResponse {
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    // Gerar um QR Code PIX válido (formato EMV QR Code)
    const qrCodeData = PaymentServiceMock.generateMockPixQRCode(data.transaction_amount, mockId);
    return {
      id: mockId,
      status: 'pending',
      status_detail: 'pending_waiting_payment',
      point_of_interaction: {
        transaction_data: {
          qr_code: qrCodeData,
          qr_code_base64: btoa(qrCodeData), // Base64 do QR Code
        },
      },
    };
  }

  /**
   * Gera um QR Code PIX válido no formato EMV
   */
  private static generateMockPixQRCode(amount: number, transactionId: string): string {
    const pixKey = '12345678901'; // Chave PIX mock
    const merchantName = 'Barbearia Sistema';
    const merchantCity = 'Sao Paulo';
    // Montar o payload do PIX
    const payload = [
      '000201',
      '010212',
      '2658',
      '0014',
      'br.gov.bcb.pix',
      '0136',
      pixKey,
      '52040000',
      '5303986',
      `54${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}`,
      '5802BR',
      `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`,
      `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`,
      '62070503***',
      `6304${PaymentServiceMock.calculateCRC16(transactionId)}`,
    ].join('');
    return payload;
  }

  /**
   * Calcula o CRC16 para o QR Code PIX
   */
  private static calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }
}

export type { PixPaymentData, PixPaymentResponse }; 