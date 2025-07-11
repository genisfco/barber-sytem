const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function gerarPixQrCode({ amount, description, payer }) {
  const response = await fetch(`${API_BASE_URL}/api/pagamento/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description, payer }),
  });
  if (!response.ok) throw new Error('Erro ao gerar QR Code PIX');
  return await response.json();
} 