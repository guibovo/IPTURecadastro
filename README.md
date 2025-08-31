# Sistema de Recadastramento IPTU

Sistema municipal completo para coleta de dados de propriedades com IA integrada para aprendizado automático de padrões BIC (Boletim de Informações Cadastrais).

## 📋 Visão Geral

Este é um sistema web full-stack desenvolvido para prefeituras realizarem o recadastramento de propriedades urbanas. O sistema oferece funcionalidades offline-first, autenticação dupla (Replit + Local), e IA que aprende padrões municipais automaticamente.

### Principais Funcionalidades

- **Coleta de Dados de Propriedades**: Formulários dinâmicos configuráveis
- **IA com Aprendizado Contínuo**: Sistema que aprende padrões BIC específicos de cada município
- **Modo Offline**: Funciona sem internet, sincroniza quando conectado
- **Autenticação Dupla**: Suporte para Replit Auth e login local para administradores
- **Dashboard Administrativo**: Painel completo para gestão do sistema
- **Geolocalização**: Integração com mapas e GPS
- **Upload de Arquivos**: Sistema de fotos e documentos com Google Cloud Storage

## 🏗️ Arquitetura Técnica

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui + Radix UI + Tailwind CSS
- **Roteamento**: Wouter
- **Estado**: TanStack Query para servidor, React hooks para local
- **Mapas**: Leaflet para visualização geográfica
- **Formulários**: React Hook Form + Zod para validação

### Backend
- **Runtime**: Node.js + Express.js
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL (Neon) + Drizzle ORM
- **Autenticação**: Replit OIDC + Passport.js local
- **Armazenamento**: Google Cloud Storage
- **IA/ML**: Sistema custom de aprendizado de padrões

### Banco de Dados
```sql
-- Principais tabelas
users              -- Usuários do sistema
forms              -- Definições de formulários dinâmicos
missions           -- Tarefas de coleta
property_collections -- Dados coletados
photos             -- Metadados de imagens
municipal_data     -- Base de dados municipal (BIC)
bic_patterns       -- Padrões aprendidos pela IA
sync_queue         -- Fila de sincronização offline
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+
- PostgreSQL
- Conta Google Cloud (para storage)
- Conta Replit (para auth)

### Instalação

1. **Clone o repositório**
```bash
git clone [seu-repo]
cd recadastramento-iptu
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# .env
DATABASE_URL=postgresql://...
SESSION_SECRET=seu-secret-key
REPL_ID=seu-repl-id
GOOGLE_CLOUD_PROJECT=seu-projeto
```

4. **Configure o banco de dados**
```bash
npm run db:push
```

5. **Execute o servidor**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5000`

## 🔐 Sistema de Autenticação

### Replit Auth (Usuários Normais)
- Autenticação via OpenID Connect
- Sessões seguras no PostgreSQL
- Roles: `field_agent` (padrão)

### Login Local (Administradores)
- Usuário/senha com bcrypt
- Sessões independentes
- Role: `admin`

**Credenciais padrão do admin:**
- Usuário: `admin`
- Senha: `admin123`

## 🤖 Sistema de IA - Aprendizado BIC

### Como Funciona
O sistema usa machine learning para aprender padrões específicos de cada município:

1. **Coleta Automática**: A cada submissão de formulário, a IA analisa os dados
2. **Aprendizado Contínuo**: Algoritmos identificam padrões em endereços, códigos, proprietários
3. **Otimização Automática**: Sistema se otimiza a cada 10 submissões
4. **Sugestões Inteligentes**: Oferece preenchimento automático baseado nos padrões aprendidos

### Arquivos Principais da IA
- `server/bicPatternLearning.ts` - Core do sistema de aprendizado
- `client/src/components/BICSmartAssistant.tsx` - Interface de sugestões
- `server/routes.ts` - APIs de integração

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # React hooks customizados
│   │   ├── lib/           # Utilitários e configurações
│   │   └── contexts/      # Context providers
├── server/                # Backend Node.js
│   ├── auth/             # Configurações de autenticação
│   ├── storage.ts        # Interface de banco de dados
│   ├── routes.ts         # Definições de rotas API
│   └── bicPatternLearning.ts # Sistema de IA
├── shared/               # Código compartilhado
│   └── schema.ts         # Schemas Drizzle + validações Zod
└── attached_assets/      # Assets estáticos
```

## 🛠️ Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Executa em modo desenvolvimento
npm run build        # Build para produção
npm run db:push      # Sincroniza schema com BD
npm run db:generate  # Gera migrações
```

### Padrões de Código
- **TypeScript**: Tipagem estrita habilitada
- **ESLint + Prettier**: Formatação automática
- **Conventional Commits**: Padrão de commits
- **Component-First**: Componentes reutilizáveis e modulares

### Adicionando Novas Funcionalidades

1. **Nova API Route**:
   - Adicione em `server/routes.ts`
   - Implemente no `storage.ts` se necessário
   - Teste com as credenciais de admin

2. **Nova Página**:
   - Crie em `client/src/pages/`
   - Registre em `client/src/App.tsx`
   - Use hooks existentes (`useAuth`, `useQuery`)

3. **Novo Componente**:
   - Crie em `client/src/components/`
   - Use TypeScript + props tipadas
   - Implemente data-testid para testes

## 🔧 Configuração do Banco

### Schema Principal
O banco usa Drizzle ORM com PostgreSQL. Principais entidades:

- **users**: Sistema de usuários com roles
- **forms**: Formulários dinâmicos configuráveis  
- **missions**: Tarefas de coleta atribuídas
- **property_collections**: Dados coletados dos imóveis
- **municipal_data**: Base BIC importada
- **bic_patterns**: Padrões aprendidos pela IA

### Migrações
```bash
# Aplicar mudanças no schema
npm run db:push

# Gerar arquivo de migração
npm run db:generate
```

## 📱 Funcionalidades Offline

O sistema funciona completamente offline:

- **Cache Local**: IndexedDB para dados essenciais
- **Sincronização**: Automática quando conectado
- **Queue**: Fila de ações para sincronizar
- **Indicadores**: UI mostra status online/offline

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] OCR para digitalização de documentos
- [ ] Relatórios avançados com gráficos
- [ ] API mobile para app nativo
- [ ] Integração com sistemas municipais existentes
- [ ] Dashboard de analytics da IA

### Melhorias Técnicas
- [ ] Testes automatizados (Jest + Testing Library)
- [ ] CI/CD com GitHub Actions
- [ ] Docker para deployment
- [ ] Monitoramento com Sentry
- [ ] Cache Redis para performance

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Guidelines
- Mantenha o código TypeScript estrito
- Adicione testes para novas funcionalidades
- Documente APIs públicas
- Siga os padrões de commit convencionais

## 📞 Suporte

Para dúvidas técnicas ou problemas:

1. **Issues do GitHub**: Para bugs e feature requests
2. **Documentação**: Consulte os comentários no código
3. **Logs**: Verifique console do navegador e logs do servidor

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para detalhes.

---

**Desenvolvido para modernizar a gestão municipal brasileira** 🇧🇷