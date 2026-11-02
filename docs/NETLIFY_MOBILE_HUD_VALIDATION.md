# Validação mobile do Netlify HUD

O PlantãoMed detecta iframes e elementos externos fixos que se sobrepõem à navegação inferior. A medição usa o retângulo externo do elemento, sem acessar ou alterar o conteúdo do iframe. Se não houver interseção, a posição original da barra é mantida.

## Evidência do site publicado antes da correção

Em `https://plantaomeds.netlify.app/inicio`, no modo visitante, foi encontrado `#nl-badge-frame`, fixo no canto inferior direito, com `z-index: 2147483645` e dimensões de 191 × 64 px em um viewport de 390 × 844 px. O iframe interceptava os centros dos botões “Favoritos” e “Mais”. O conteúdo de dentro do iframe não foi inspecionado.

## Verificação local

Para simular o elemento externo no DevTools, adicione um iframe ao `document.body`:

```js
const frame = document.createElement('iframe')
frame.id = 'nl-badge-frame'
Object.assign(frame.style, {
  position: 'fixed',
  right: '0',
  bottom: '0',
  width: '191px',
  height: '64px',
  border: '0',
  zIndex: '2147483645',
})
document.body.append(frame)
```

Confirme que `--mobile-tab-obstruction` é positivo, a barra não intersecta o retângulo do iframe e os cinco alvos continuam clicáveis. Remova a simulação com `document.querySelector('#nl-badge-frame')?.remove()` e confirme que a barra retorna à posição original.

## Conferência após uma publicação autorizada

Sem alterar configurações do Netlify ou os iframes, abra o domínio publicado como visitante e, se houver acesso autorizado, repita autenticado. Após recarregar a página:

- Teste 320, 360, 375, 390, 430, 600, 680, 768, 820 e 915 px; repita em retrato e paisagem.
- Toque em Início, Biblioteca, Sintomas, Favoritos e Mais; confirme que Mais abre e fecha.
- Em cada largura, verifique que nenhum centro de botão está dentro do retângulo do HUD e que não há rolagem horizontal.
- Repita em zoom de navegador e, quando disponíveis, Safari no iOS e Chrome no Android.
- Abra calculadoras longas e o Assistente Clínico; role até o final e confirme que campos e ações finais continuam acessíveis.
- Recarregue sem o HUD, quando aplicável, e confirme que a Tab Bar conserva sua posição original.

Se `#nl-hud-frame`, um drawer ou outro elemento Netlify aparecer, registre seu retângulo externo, posição e `z-index`. A aplicação não deve ocultar o selo, desativar eventos no iframe ou editar estilos internos do provedor.
