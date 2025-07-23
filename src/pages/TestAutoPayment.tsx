import { AutoPaymentTest } from "@/components/AutoPaymentTest";

const TestAutoPayment = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teste de Criação Automática de Pagamentos</h1>
        <p className="text-muted-foreground">
          Use esta página para testar o serviço de criação automática de pagamentos mensais.
        </p>
      </div>
      
      <AutoPaymentTest />
    </div>
  );
};

export default TestAutoPayment; 