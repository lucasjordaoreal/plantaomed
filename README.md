# PlantãoMed

Aplicação web de consulta clínica em React, TypeScript e Vite. O catálogo atual separa temas clínicos legados, termos de apresentação, metadados bibliográficos e informações farmacológicas; a existência de um termo ou documento no catálogo não representa validação clínica.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Verificação e build

```sh
npm run lint
npm run test
npm run build
```

O build valida e gera os arquivos estáticos do catálogo antes de executar o Vite.

## Publicação no Netlify

O arquivo `netlify.toml` define `npm run build` como comando de build e `dist` como diretório publicado. A regra de fallback entrega `index.html` para rotas da SPA, permitindo URLs diretas e limpas. O repositório conectado continua sendo a origem do deploy; não é necessário criar outro site ou repositório.

## Dados e limitações

- Documentos oficiais são indexados como metadados e links; a vigência de cada item deve ser consultada na fonte.
- A listagem PCDT da Conitec é importada integralmente por `npm run catalog:import:conitec`; os títulos, citações e links catalogados não representam protocolos completos revisados.
- O catálogo de medicamentos é gerado a partir do CSV aberto mensal da Anvisa por `npm run catalog:import:anvisa`. A busca carrega um índice estático sob demanda e detalhes por pacote; situação e campos de validade são exibidos como publicados, sem inferir disponibilidade comercial.
- Registros importados da Anvisa não são conferências individuais no sistema de consulta, bulas, disponibilidade no SUS ou conteúdo para prescrição. O contador de registros individualmente confirmados permanece separado.
- A verificação mensal de fontes produz um artefato para revisão; não publica alterações clínicas nem envia mudanças automaticamente ao repositório.
- As apresentações clínicas desta versão são termos de índice; não contêm associações diagnósticas, algoritmos ou condutas.
- Não há protocolos clínicos completos revisados nem calculadoras clínicas implementadas.
- Os protocolos legados mantêm seus estados editoriais e não exibem instruções terapêuticas não verificadas como condutas.
- Favoritos e histórico são locais ao dispositivo. O cache offline de documentos é limitado e não substitui a consulta à fonte atual.

As alterações locais não são enviadas ao GitHub automaticamente.
