<div align="center">
  <br />
  <h1>✨ Organizador Pessoal</h1>
  <p>
    Um aplicativo de calendário moderno, rápido e com design premium para gerenciar seus compromissos. Construído com foco na experiência do usuário (UX), animações fluidas e integração com o Google Agenda.
  </p>
</div>

---

## 🚀 Funcionalidades Principais

- **Visualização Flexível**: Alterne instantaneamente entre visualizações de Mês, Semana e Dia.
- **Roleta de Tempo Personalizada**: Selecionador de horas estilo "slot-machine" fluido com suporte a "duplo clique" para digitação manual, substituindo os elementos genéricos do navegador.
- **Integração com Google Agenda**: Sincronização em via de mão única (somente leitura) usando OAuth 2.0 via _Google Identity Services_.
- **Validação de Tempo Inteligente**: Regras anti-viagem no tempo (a data/hora de fim ajusta-se automaticamente de acordo com o início).
- **Armazenamento 100% Local**: Funciona totalmente offline com `localStorage` mantendo sua privacidade intacta.
- **Design Premium**: Interface _Dark Mode_ exclusiva com paleta de cores balanceadas e efeitos translúcidos/vidro.

## 🛠️ Tecnologias Utilizadas

- **[React 18](https://react.dev/)** + **[Vite](https://vitejs.dev/)**: Para a construção ultra rápida e componentização.
- **[React Big Calendar](https://github.com/jquense/react-big-calendar)**: Motor robusto para a grade de eventos.
- **[Date-FNS](https://date-fns.org/)**: Manipulação e formatação super leve de datas no padrão brasileiro (`pt-BR`).
- **[Lucide React](https://lucide.dev/)**: Ícones minimalistas e vetoriais.
- **Vanilla CSS**: Estilização flexível e customizada, usando _CSS Variables_ e pseudo-elementos em vez de frameworks pesados.

## ⚙️ Como rodar o projeto localmente

Siga as instruções abaixo para obter uma cópia do projeto e executá-lo na sua máquina.

### Pré-requisitos
- Ter o **[Node.js](https://nodejs.org/en)** instalado.
- Ter configurado a sua conta e gerado o seu *Client ID* no **Google Cloud Console**.

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as Variáveis de Ambiente**
Crie um arquivo chamado `.env` na raiz do projeto e insira o seu ID de Cliente do Google:
```env
VITE_GOOGLE_CLIENT_ID=seu-codigo-do-google-aqui.apps.googleusercontent.com
```
*(Nota: O arquivo `.env` já está no `.gitignore` para garantir sua segurança)*

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O aplicativo estará rodando e disponível em `http://localhost:5173`. 

---

<div align="center">
  <i>Desenvolvido e polido para garantir a melhor experiência de gestão de tempo.</i>
</div>
