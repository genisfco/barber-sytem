export async function gerarPixQrCode({ amount, description, payer }) {

  //DESENVOLVIMENTO - RODAR LOCALMENTE o backend - npm start
  const response = await fetch(`http://localhost:3001/api/pagamento/pix`, {

  //PRODUÇÃO - RODAR NO SERVIDOR da VERCEL
  //const response = await fetch(`/api/pagamento/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description, payer }),
  });
  if (!response.ok) throw new Error('Erro ao gerar QR Code PIX');
  return await response.json();
} 
