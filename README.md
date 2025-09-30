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

## 🚀 Deploy e Execução

### Pré-requisitos
- Node.js 20+
- PostgreSQL
- Conta Google Cloud (para storage)
- Conta Replit (para auth)

### Método 1: Deploy na Replit (Recomendado)

O projeto está pré-configurado para deploy automatizado na plataforma Replit.

1.  **Configurar Segredos**: Adicione os segredos de ambiente (ex: `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLOUD_PROJECT`) no painel de "Secrets" do Replit.
2.  **Conectar ao GitHub**: Conecte seu repositório do GitHub ao Replit.
3.  **Deploy**: Use a funcionalidade de "Deploy" do Replit. O arquivo `.replit` no projeto já contém os comandos de build (`npm run build`) e start (`npm run start`) necessários.

### Método 2: Deploy Manual (AWS, Heroku, etc.)

Para fazer o deploy em uma plataforma de nuvem tradicional, siga estes passos:

1.  **Configurar Variáveis de Ambiente**: No painel de controle do seu provedor de hospedagem, configure todas as variáveis de ambiente necessárias. Use o `README.md` como referência para as variáveis obrigatórias.
2.  **Build da Aplicação**: Execute o comando `npm run build`. Isso irá compilar o frontend e o backend para uma pasta `dist/`.
3.  **Executar a Aplicação**: Inicie o servidor de produção com o comando `npm run start`.
4.  **Pré-requisitos do Ambiente**: Certifique-se de que o ambiente de produção tenha Node.js instalado e acesso de rede ao seu banco de dados PostgreSQL e ao Google Cloud Storage.

### Execução em Ambiente de Desenvolvimento Local

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
Crie um arquivo `.env` na raiz do projeto e adicione as variáveis necessárias:
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

5. **Execute o servidor de desenvolvimento**
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

## 📱 Fluxo de Trabalho Offline

O sistema foi projetado com uma robusta capacidade offline, permitindo que os agentes de campo trabalhem de forma eficiente em áreas sem conexão com a internet. O fluxo de trabalho é dividido em três fases:

### Fase 1: Preparação (Online)

Antes de ir a campo, o agente deve se preparar enquanto tem uma conexão estável com a internet:

1.  **Login e Cache de Sessão**: Faça login no aplicativo. Sua sessão de usuário será armazenada de forma segura no dispositivo (tablet ou celular) para permitir o acesso offline.
2.  **Download de Mapas**: Navegue até a seção "Mapas Offline" e baixe a área do mapa onde o trabalho será realizado. Isso garante que os mapas e a localização GPS funcionem sem internet.
3.  **Sincronização de Missões**: O aplicativo irá baixar e armazenar automaticamente as missões atribuídas a você e os formulários necessários.

### Fase 2: Trabalho de Campo (Offline)

Com o dispositivo preparado, o agente pode trabalhar em qualquer local, independentemente da conectividade:

1.  **Acesso Offline**: Abra o aplicativo. Ele usará a sessão em cache para autenticá-lo localmente.
2.  **Navegação no Mapa**: Utilize o mapa offline para se localizar e encontrar as propriedades de suas missões.
3.  **Coleta de Dados**: Selecione uma missão, preencha o formulário de recadastramento e capture as fotos necessárias.
4.  **Armazenamento Local**: Ao salvar, todos os dados (respostas do formulário, metadados das fotos, etc.) são armazenados de forma segura na memória interna do dispositivo (`IndexedDB`) e adicionados a uma fila de sincronização.

### Fase 3: Sincronização (Online)

Ao retornar a um local com conexão à internet (Wi-Fi ou dados móveis):

1.  **Conexão Automática**: O aplicativo detectará a conexão com a internet.
2.  **Envio dos Dados**: Navegue até a página "Sync". A partir dela, você pode iniciar o processo de sincronização, que enviará todos os dados coletados em campo para o servidor central. A interface mostrará o progresso e o status de cada item na fila.

### ⚠️ Importante: Riscos do Armazenamento Offline

Os dados coletados em modo offline são armazenados de forma segura no navegador do dispositivo (usando `IndexedDB`). No entanto, é crucial entender as limitações deste armazenamento:

-   **Perda de Dados por Ação do Usuário**: Se o usuário limpar os dados de navegação/cache do navegador, ou restaurar o dispositivo para as configurações de fábrica, **todos os dados offline que ainda não foram sincronizados serão permanentemente perdidos.**
-   **Bateria**: Uma morte súbita da bateria é geralmente segura. Os dados já salvos no dispositivo permanecerão, mas o trabalho não salvo no momento exato do desligamento pode ser perdido.

**Recomendação Essencial**: O armazenamento no dispositivo deve ser considerado **temporário**. A prática mais importante para os agentes de campo é **sincronizar os dados com o servidor assim que uma conexão com a internet estiver disponível**. Isso minimiza a quantidade de dados em risco e garante a segurança das informações coletadas.

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