# Casarini Beach

Convite da reinauguração da Casarini Beach, unidade Guarujá, e confirmação de presença para os eventos de sexta-feira e sábado.

## Desenvolvimento

Requer Node.js 22.13 ou mais recente.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

O build estático fica em `dist/`. O desenvolvimento e a prévia informam a URL local no terminal.

## Receber respostas pelo Basin

O endpoint público do evento fica em `.env` e é usado no build. Para trocar o destino, copie o endpoint público do novo formulário em **Setup** no Basin e atualize `VITE_BASIN_ENDPOINT`. Você também pode usar `.env.local` para testes locais ou configurar a variável no ambiente da hospedagem. Variáveis `VITE_` fazem parte do código entregue ao navegador.

Ao trocar o endpoint, reinicie o servidor de desenvolvimento ou gere um novo build. A confirmação na página depende do retorno de sucesso do Basin. Para receber as respostas por e-mail, habilite as notificações em **Emails** e verifique o endereço de destino.

Cada envio contém `name`, `phone`, `email`, `reinauguracao_sexta` e `navegacao_sabado`. As duas respostas de presença são obrigatórias e chegam como **Sim** ou **Não**. Para quem participa no sábado, o envio exige o aceite do termo e inclui `termo_navegacao_aceito` e `termo_navegacao_versao`. Até configurar o endpoint, a página exibe o formulário com o envio indisponível.

Os detalhes dos eventos ficam em `src/AttendanceForm.jsx` e o termo de ciência em `src/rsvp.js`. Se a pasta `data/` existir, ela contém arquivos locais da versão anterior e fica fora do build.
