# DOCUMENTAÇÃO TÉCNICA DE DESENVOLVIMENTO

Este documento detalha a arquitetura, componentes e pontos de atenção do **Sistema de Recadastramento IPTU**. O objetivo é guiar futuros desenvolvimentos, destacando áreas com código hard-coded, mocks e oportunidades de melhoria.

## 1. Visão Geral do Projeto

O projeto é um sistema full-stack para recadastramento de propriedades urbanas, voltado para prefeituras. Ele possui uma arquitetura moderna com frontend em React (Vite + TypeScript) e backend em Node.js (Express + TypeScript), com um banco de dados PostgreSQL gerenciado pelo Drizzle ORM.

### Principais Funcionalidades:
- **Coleta de Dados Offline-First**: O sistema é projetado para funcionar sem conexão com a internet, sincronizando os dados quando a conexão é restabelecida.
- **Autenticação Dupla**: Suporta autenticação via Replit (OIDC) para usuários de campo e um sistema de login local (usuário/senha) para administradores.
- **IA para Aprendizado de Padrões (BIC)**: Um serviço de inteligência artificial que aprende os padrões de dados cadastrais (BIC) de cada município para oferecer sugestões e automações.
- **Gestão de Missões e Formulários Dinâmicos**: Administradores podem criar missões de coleta e definir formulários dinâmicos.
- **Geolocalização e Mapas**: Integração com Leaflet para visualização de mapas, rastreamento de localização e geofencing.

## 2. Arquitetura

O projeto é dividido em três diretórios principais: `client`, `server`, e `shared`.

- **`client/`**: Contém o frontend da aplicação, desenvolvido em React com TypeScript.
- **`server/`**: Contém o backend, desenvolvido em Node.js com Express e TypeScript.
- **`shared/`**: Contém código compartilhado entre o frontend e o backend, principalmente os schemas do banco de dados (Drizzle).

## 3. Backend (`server/`)

O backend é responsável pela API, autenticação, lógica de negócios e comunicação com o banco de dados.

### Estrutura de Arquivos
- **`index.ts`**: Ponto de entrada do servidor Express.
- **`routes.ts`**: Define todas as rotas da API.
- **`storage.ts`**: Abstração para acesso ao banco de dados (Drizzle).
- **`db.ts`**: Configuração da conexão com o banco de dados PostgreSQL (Neon).
- **`replitAuth.ts` / `localAuth.ts`**: Lidam com os dois mecanismos de autenticação.
- **`aiMatcher.ts` / `bicPatternLearning.ts`**: Implementam a lógica de IA para matching de propriedades e aprendizado de padrões.
- **`objectStorage.ts` / `objectAcl.ts`**: Gerenciam o armazenamento de arquivos no Google Cloud Storage.

## 4. Frontend (`client/`)

O frontend é uma Single Page Application (SPA) construída com React, Vite, e TypeScript, utilizando `shadcn/ui` para componentes de UI.

### Estrutura de Arquivos
- **`App.tsx`**: Define o roteamento principal da aplicação com `wouter`.
- **`pages/`**: Contém as páginas da aplicação.
- **`components/`**: Contém componentes reutilizáveis.
- **`lib/`**: Utilitários, helpers e configurações.

## 5. Código Compartilhado (`shared/`)

- **`shared/schema.ts`**: Arquivo crucial que define o schema do banco de dados (Drizzle) e schemas de validação (Zod), garantindo consistência de tipos entre o frontend e o backend.

## 6. Fraquezas Principais e Melhorias Técnicas

Esta seção resume as principais fraquezas identificadas no código e as melhorias técnicas recomendadas.

### Fraqueza 1: Vulnerabilidades de Segurança

- **Problema**: O código possui um segredo de sessão hard-coded (`'dev-secret-key'`) como fallback em `server/localAuth.ts`. Além disso, o `README.md` promove o uso de credenciais de administrador fracas e padrão (`admin`/`admin123`).
- **Risco**: Alto. Em um ambiente de produção, isso pode levar ao sequestro de sessões e acesso não autorizado ao sistema.
- **Melhoria Recomendada**:
    1.  **Remover o Fallback do Segredo**: O servidor deve falhar ao iniciar se a variável de ambiente `SESSION_SECRET` não estiver definida.
    2.  **Remover Credenciais Padrão**: Remover as credenciais do `README.md` e instruir os administradores a criarem uma senha forte na configuração inicial.

### Fraqueza 2: Risco de Integridade de Dados na Sincronização

- **Problema**: A pipeline de sincronização não possui um mecanismo de idempotência. Se um cliente offline enviar o mesmo registro duas vezes, o backend criará entradas duplicadas no banco de dados.
- **Risco**: Alto. A duplicação de dados pode levar a relatórios incorretos, retrabalho para os agentes e inconsistências gerais no sistema.
- **Melhoria Recomendada**:
    1.  **Implementar Chaves de Idempotência**: O cliente deve gerar um UUID único para cada registro criado offline. Este UUID deve ser usado como a chave primária no banco de dados do servidor. Se o servidor receber uma solicitação de inserção com um ID que já existe, ele pode ignorá-la com segurança, prevenindo duplicatas.

### Fraqueza 3: Funcionalidades Principais Incompletas ou Simuladas

- **Problema**: Várias funcionalidades críticas do backend são apenas placeholders (mocks).
    - A rota de sincronização (`/api/sync/process`) não processa os dados.
    - O processamento de arquivos Shapefile e de dados municipais é simulado.
    - Os dashboards de administrador exibem dados estáticos.
- **Risco**: Médio. A aplicação não pode ser usada em produção em seu estado atual.
- **Melhoria Recomendada**:
    1.  **Implementar a Lógica de Sincronização**: Desenvolver o código no backend que processa a fila de sincronização e insere os dados nos endpoints corretos.
    2.  **Desenvolver o Processamento de Arquivos**: Usar bibliotecas como `shapefile-js` e `xlsx` para ler e processar os arquivos enviados.
    3.  **Conectar Dashboards ao Banco de Dados**: Substituir todos os dados mocados por consultas reais ao banco de dados.

### Fraqueza 4: IA Efêmera (Não Persistente)

- **Problema**: O serviço de aprendizado de padrões (`bicPatternLearningService`) armazena os padrões aprendidos apenas em memória. Toda a inteligência é perdida quando o servidor reinicia.
- **Risco**: Médio. O principal benefício de um sistema de "aprendizado" é perdido, limitando a eficácia da IA.
- **Melhoria Recomendada**:
    1.  **Persistir Padrões no Banco de Dados**: Criar uma nova tabela (ex: `bic_patterns`) no schema para armazenar os padrões aprendidos pela IA.
    2.  **Carregar Padrões na Inicialização**: Modificar o serviço para carregar os padrões do banco de dados quando o servidor inicia.

### Fraqueza 5: Ausência de Testes Automatizados

- **Problema**: O projeto não possui uma suíte de testes automatizados.
- **Risco**: Alto. A longo prazo, a ausência de testes torna a manutenção difícil, arriscada e cara. Novas funcionalidades podem quebrar o código existente sem que ninguém perceba.
- **Melhoria Recomendada**:
    1.  **Adotar um Framework de Testes**: Integrar o **Vitest** ou **Jest** ao projeto.
    2.  **Escrever Testes Unitários**: Começar testando a lógica de negócios crítica (ex: `aiMatcher.ts`, validações de schema).
    3.  **Escrever Testes de Integração**: Criar testes para os endpoints da API para garantir que a comunicação entre cliente e servidor funcione como esperado.