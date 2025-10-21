# BarberPro System - Sistema de Gestão para Barbearias

## 📋 Sobre o Projeto

O **BarberPro System** é uma plataforma completa de gestão para barbearias, desenvolvida para modernizar e simplificar o gerenciamento de estabelecimentos de barbearia. O sistema oferece funcionalidades abrangentes para administração de agendamentos, clientes, barbeiros, serviços, produtos e finanças.

## 🌐 Acesso ao Sistema

**URL da Aplicação**: [https://barberpro-system.vercel.app/](https://barberpro-system.vercel.app/)

## ✨ Principais Funcionalidades

### 🗓️ Gestão de Agendamentos
- Sistema completo de agendamento de clientes
- Calendário interativo para visualização de horários
- Controle de disponibilidade por barbeiro
- Finalização de atendimentos com registro de serviços e produtos

### 👥 Gestão de Pessoas
- **Clientes**: Cadastro completo com dados pessoais e histórico
- **Barbeiros**: Gerenciamento de equipe com controle de comissões e horários de trabalho
- Sistema de comissões configurável por barbeiro

### 🏪 Gestão de Estabelecimento
- **Serviços**: Catálogo de serviços oferecidos pela barbearia
- **Produtos**: Controle de estoque e vendas de produtos
- **Configurações**: Personalização de horários de funcionamento e dados da barbearia

### 💰 Gestão Financeira
- Controle completo de receitas e despesas
- Relatórios mensais e anuais detalhados
- Sistema de assinaturas para clientes
- Integração com PIX para pagamentos
- Sistema de pagamentos da plataforma

### 📊 Relatórios e Análises
- Dashboard com métricas em tempo real
- Relatórios de desempenho por barbeiro
- Análise financeira detalhada
- Controle de comissões e pagamentos

### 🔐 Sistema de Autenticação
- Login seguro com Supabase Auth
- Controle de acesso baseado em usuários
- Sistema de recuperação de senha

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca para interface de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool e servidor de desenvolvimento
- **React Router DOM** - Roteamento da aplicação
- **TanStack Query** - Gerenciamento de estado do servidor

### UI/UX
- **Tailwind CSS** - Framework de CSS utilitário
- **shadcn/ui** - Componentes de interface modernos
- **Radix UI** - Componentes primitivos acessíveis
- **Lucide React** - Ícones modernos
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### Backend e Banco de Dados
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security (RLS)** - Segurança a nível de linha

### Integrações
- **MercadoPago** - Processamento de pagamentos
- **Google Maps API** - Integração de mapas e geolocalização
- **PIX** - Sistema de pagamentos instantâneos brasileiro

### Ferramentas de Desenvolvimento
- **ESLint** - Linting de código
- **PostCSS** - Processamento de CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### Instalação

1. **Clone o repositório**
```bash
git clone <URL_DO_REPOSITORIO>
cd barber-sytem
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Crie um arquivo .env.local na raiz do projeto
# Configure as variáveis necessárias para Supabase e outras integrações
```

4. **Execute o projeto em modo de desenvolvimento**
```bash
npm run dev
```

5. **Acesse a aplicação**
```
http://localhost:5173
```

### Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── forms/          # Formulários específicos
│   ├── layout/         # Componentes de layout
│   └── ui/             # Componentes de interface
├── contexts/           # Contextos do React
├── hooks/              # Hooks customizados
├── integrations/       # Integrações externas
├── pages/              # Páginas da aplicação
├── services/           # Serviços de API
├── types/              # Definições de tipos TypeScript
└── utils/              # Utilitários gerais
```

## 🔧 Configuração do Banco de Dados

O projeto utiliza Supabase como backend. As migrações estão localizadas em:
```
supabase/migrations/
```

Execute as migrações no seu projeto Supabase para configurar o banco de dados.

## 📱 Responsividade

O sistema é totalmente responsivo e funciona perfeitamente em:
- 📱 Dispositivos móveis
- 💻 Tablets
- 🖥️ Desktops

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através dos canais oficiais do projeto.

