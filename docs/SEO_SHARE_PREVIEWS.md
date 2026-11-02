# SEO e prévias de compartilhamento

O build gera HTML estático com metadados para cada rota pública e privada conhecida. As redes sociais e crawlers leem esses arquivos sem executar JavaScript; o React atualiza o mesmo conjunto de metadados durante a navegação no navegador.

## Endereços e imagem

- Domínio canônico: `https://plantaomeds.netlify.app`, centralizado em `src/config/publicSite.ts`.
- Imagem compartilhada: `public/social/plantao-med-og.jpg` (1200 × 630, JPEG). Para substituir a arte e invalidar caches externos, use um novo nome de arquivo e atualize `PUBLIC_SHARE_IMAGE_PATH`.
- Cada página mantém seu próprio caminho canônico; query strings e fragments de autenticação não fazem parte do canonical ou do link compartilhado.

## Build e publicação

`npm run build` executa `scripts/generate-social-pages.mjs` após o bundle Vite. O script produz documentos em `dist/<rota>/index.html`, `/sitemap.xml`, `/robots.txt` e `/_redirects`. Rewrites exatos para URLs com e sem barra final enviam cada rota conhecida ao HTML correspondente antes do fallback SPA; caminhos não listados continuam chegando ao BrowserRouter. `netlify.toml` define somente o comando de build e a pasta de publicação, sem um rewrite amplo que pudesse encobrir os arquivos pré-renderizados.

Não é necessária a instalação de uma extensão de prerenderização no painel Netlify. Publique o `dist` gerado em uma publicação autorizada para ativar os arquivos estáticos e as regras de rewrite. Rotas privadas e protocolos sem aprovação editorial são marcados `noindex`; conteúdos privados também não aparecem no sitemap.

## Verificação HTTP após publicar

Inspecione a resposta inicial, sem navegador/JavaScript:

```powershell
curl.exe -sS -A "facebookexternalhit/1.1" https://plantaomeds.netlify.app/ | findstr /i "og:title og:image canonical"
curl.exe -sS -A "Twitterbot" https://plantaomeds.netlify.app/calculadoras/qsofa | findstr /i "og:title og:url canonical"
curl.exe -sSI https://plantaomeds.netlify.app/social/plantao-med-og.jpg
curl.exe -sS https://plantaomeds.netlify.app/sitemap.xml
```

Confirme HTTP 200 para páginas/imagem, `Content-Type: image/jpeg`, dimensões declaradas 1200 × 630, um único conjunto de metadados, URLs oficiais e ausência das rotas privadas no sitemap. Em seguida use Meta Sharing Debugger e LinkedIn Post Inspector para solicitar atualização de cache; faça também compartilhamentos manuais no WhatsApp e X. O cache de cada plataforma pode exigir nova solicitação após trocar a imagem.

Nenhum conteúdo privado, resultado de calculadora ou dado do Assistente Clínico é incluído no texto compartilhado: os botões compartilham somente título, descrição pública da página e URL canônica.
