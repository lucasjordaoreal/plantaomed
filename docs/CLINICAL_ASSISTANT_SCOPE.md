# Assistente Clínico — auditoria e prontidão

## Status

A interface do Assistente Clínico está disponível em produção somente para usuários autenticados com o papel `clinical-assistant`. Não está liberada para atendimento real. A implementação técnica não substitui validação clínica independente nem determina prontidão para uso assistencial.

## Auditoria das lacunas

- **Formulário:** recebe sintomas, idade, contexto, sinais vitais, exame físico e dados laboratoriais/de imagem em memória; ainda não cobre uma entrevista clínica completa nem valida intervalos de laboratório ou referências específicas.
- **Motor:** havia apenas um retorno vazio. Agora existe um avaliador de regras declarativas com condições, escopo de população/contexto, perguntas contextuais, predicados de exclusão, achados ausentes, associação rastreável a hipóteses/investigações/terapias e controle de unidades sem conversões.
- **Base executável:** continua sem regras, hipóteses, investigações ou tratamentos clínicos. O conteúdo existente na Biblioteca não tem referências e revisão aptas para o motor.
- **Terapêutica:** qualquer relação que venha a ser cadastrada exige critérios de aplicabilidade, entradas de segurança conhecidas e revisão explícita de contraindicações, interações e restrições populacionais. Nenhum produto/dose é sugerido atualmente.
- **Privacidade:** os campos da avaliação ficam em memória e não são salvos automaticamente. Ao solicitar estruturação, somente a descrição clínica é enviada à Function e ao provedor Gemini. A integração deve usar exclusivamente casos sintéticos; não há comprovação de conformidade para dados reais.
- **Produção:** a interface pode ser acessada por usuários autorizados, mas cada recurso depende de sua disponibilidade e dos controles de servidor. Não foi executada avaliação regulatória, de segurança clínica ou de validação profissional.

## Conteúdo e fonte efetivamente auditados

- O registro atual contém **0 regras clínicas; 0 hipóteses; 0 investigações; 0 opções terapêuticas; 0 regras revisadas por profissionais habilitados**.
- Foi aberto e extraído texto do PCDT de AVC isquêmico agudo, Portaria Conjunta SAES/SECTICS nº 29, de 12/12/2023, publicação de 15/12/2023. Foram inspecionados trechos de diagnóstico (3.1–3.4), critérios de inclusão/exclusão (4–5), tratamento/fármaco e monitorização (6–8). Isso não é uma revisão integral, extração validada nem confirmação de vigência. O PDF está no link oficial registrado em `src/features/clinical-assistant/knowledgeSources.ts`.
- A fonte é marcada como acesso/metadados auditados, mas seu status de revisão clínica é **não revisado**. O catálogo da Conitec marca sua validade individual como não verificada; a consulta do documento não resolveu a vigência em 2026 nem revisou clinicamente sua transcrição.
- Nenhum critério, sinal de gravidade, exame, dose ou tratamento desse PCDT foi codificado como regra ativa. Nenhum caso clínico de referência independente foi aprovado. Assim, o número de fluxos clínicos operacionais segue **zero**.
- O portal do Ministério da Saúde explica que PCDTs definem critérios diagnósticos e terapêuticos, posologias e acompanhamento, e são baseados em evidências; essa caracterização geral não aprova automaticamente regras derivadas de um documento individual.

O relatório anterior `CONTENT_AUDIT.md` identificou seis protocolos demonstrativos sem referências individualizadas e revisão documentada. Não são usados pelo motor. Os catálogos Conitec e Anvisa são bases de metadados/regulação e não comprovam, por si só, a validade de relação clínica, indicação individual, posologia ou fornecimento pelo SUS.

## Requisitos para uma regra ser executável

O motor só considera conteúdo marcado como revisão clínica, com revisor/qualificação/data, pelo menos um caso de teste independente, referências HTTPS com título, instituição, seção, versão, datas, status de conferência da fonte e status de revisão clínica. Relações a hipóteses, investigação e tratamento precisam resolver para entidades existentes com evidência própria. Regras numéricas precisam de unidades explícitas; unidades diferentes não são convertidas. Predicados de exclusão desconhecidos geram perguntas e suspendem a regra. Opções terapêuticas também exigem dados de elegibilidade e revisão documentada de contraindicações, interações e população.

Esses campos e gates são controles de integridade do código e do conteúdo estático; não autenticam a qualificação de uma pessoa, não provam que uma revisão ocorreu e não substituem processo editorial com aprovação humana, rastreabilidade e controle de publicação.

## Plano de trabalho clínico/regulatório antes de assistência real

1. Definir e documentar finalidade pretendida, usuário, cenário, população, saídas e consequências clínicas de cada fluxo.
2. Com responsável clínico habilitado, confirmar vigência e escopo das fontes brasileiras; especificar regras, populações, exclusões, limitações, perguntas, investigações e referências por seção/página.
3. Manter extração e conferência da fonte separadas da normalização e aprovação clínica; registrar autoria, revisão, conflitos, versão e histórico de alteração/retirada.
4. Construir casos de teste independentes do motor, revisar por especialistas e avaliar conflitos, casos-limite e dados insuficientes antes de publicar uma regra.
5. Para terapêuticas, validar indicação, apresentação, DCB, bula profissional, contraindicações, interações, ajustes orgânicos, população, SUS e status regulatório separadamente; não habilitar por simples associação textual.
6. Obter avaliação jurídica/regulatória específica do produto e finalidade pretendida, incluindo enquadramento SaMD, RDC Anvisa 657/2022 e normas técnicas aplicáveis. Definir a rota de regularização antes de qualquer uso assistencial.
7. Concluir gestão de risco, segurança, privacidade/LGPD, usabilidade, avaliação clínica, testes com profissionais, monitoramento pós-liberação, atualização e retirada/invalidação de conteúdo offline.
8. Definir gates de release e evidências: revisores reais, plano/relatório de validação clínica, dossiê regulatório aplicável, aprovação de segurança, rastreabilidade de requisito-regra-teste-fonte e mecanismo de rollback.

Nenhuma dessas atividades de validação clínica ou avaliação regulatória é declarada concluída.

## Segurança, privacidade e limitações

- A interface não é ocultada em builds de produção. A rota exige autenticação e o papel `clinical-assistant`; a Function repete a autorização no servidor.
- Usar somente casos sintéticos. Não inserir informações de pacientes reais: ao acionar a estruturação, o texto informado é enviado ao Gemini por meio da Function. A confirmação no cliente e a detecção de padrões comuns de identificadores são controles auxiliares, não certificam que o caso é sintético ou anonimizado.
- Se a Function, a configuração Gemini ou o serviço de cotas estiver indisponível, a estruturação por IA falha de forma isolada e a interface permanece acessível; não há garantia de chamada real até validá-la no ambiente Netlify.
- A ausência de alerta não exclui risco; a interface explicita essa limitação.
- Nenhum valor de sinal vital é classificado como normal, anormal ou grave.
- A lista de sinais/sintomas é um vocabulário de organização, não uma lista de hipóteses.
- Nenhum medicamento está associado a sintomas ou diagnósticos; não há dose ou prescrição.
- O protótipo não substitui avaliação profissional, protocolos institucionais, revisão clínica, avaliação de risco ou análise de enquadramento como Software como Dispositivo Médico.

## Critérios antes de habilitar conteúdo clínico

Cada fluxo precisa de documento brasileiro vigente identificado por título, versão, população, contexto, URL e datas relevantes; regras determinísticas com critérios de inclusão e não aplicação; casos de referência validados independentemente; revisão por profissional habilitado; rastreabilidade e processo de atualização. Relações farmacológicas ainda exigem verificação independente de indicação, população, restrições, contraindicações, bula e status regulatório. Conteúdo não deve ser habilitado pela mera existência de catálogo ou por sucesso dos testes de software.

## Verificação desta etapa

Testes técnicos incluem fixtures sintéticas exclusivas do software para regras elegíveis/inativas, perguntas por dados ausentes, integridade de relações e fontes, bloqueio terapêutico com segurança desconhecida, e ausência de conversão de unidades. Testes com fixtures não são casos clínicos validados e não constituem validação clínica. Builds, lint e testes são executados conforme os scripts em `package.json`.

## Conexão Gemini e autenticação Netlify Identity

- Login, logout, callback, sessão, renovação de token e recuperação de senha usam o pacote oficial `@netlify/identity`. O Assistente Clínico é a única rota protegida; as demais páginas públicas continuam acessíveis.
- O callback Identity é processado no provider antes de redirects e onboarding; fragments de convite, recuperação, confirmação, OAuth e alteração de e-mail nunca são interpretados como rotas antigas. Um único processamento em andamento é compartilhado durante remontagens do StrictMode.
- Convites são concluídos em `/aceitar-convite` via `acceptInvite(token, password)`. O token é mantido somente em `sessionStorage` na aba atual, por até 30 minutos, para sobreviver a reloads no formulário; é removido ao concluir, falhar ou expirar. Não é colocado em `localStorage`, logs ou em uma nova URL.
- Recuperação é concluída em `/redefinir-senha`: o callback estabelece a sessão e a página só mostra o formulário quando o SDK confirma usuário autenticado. Um marcador temporário de 30 minutos em `sessionStorage` permite reconstruir o fluxo após reload sem armazenar o token; a senha só muda após `updateUser({ password })` confirmar sucesso.
- As duas páginas de senha exigem no mínimo 8 caracteres, confirmação coincidente, oferecem mostrar/ocultar senha e exibem erros sem detalhes internos. Falhas e links inválidos orientam a solicitar um novo convite ou link de recuperação.
- A Function chama `getUser()` e `refreshSession()` do SDK no servidor e exige o papel de aplicação `clinical-assistant` em `user.roles`. Esse papel deve ser atribuído pelo administrador no `app_metadata`; não há cadastro público no app.
- A Function aceita `AI_PROVIDER=gemini`, `AI_MODEL=gemini-3.8-flash` (modelo estável listado pela documentação Google consultada em 2026-11-02), `AI_PROVIDER_API_KEY` e `AI_ASSISTANT_ENABLED=true`. O modelo permanece em allowlist; o cliente não pode escolher modelo nem instrução de sistema.
- A proteção nativa Netlify é de 10 chamadas/minuto por domínio e IP. Upstash continua necessário para cotas compartilhadas: 5 chamadas/minuto e 20/dia por usuário, além de 300/dia global. A cota por IP não substitui cota global. Limite de entrada, saída/token, timeout e respostas 429 também são aplicados.
- As chamadas da UI exigem confirmação de caso fictício e enviam um marcador de teste; a Function rejeita casos sem o marcador e bloqueia padrões comuns de identificadores. Isso é defesa em profundidade, não prova de desidentificação. Não enviar casos reais sem contratos, análise de privacidade/LGPD, retenção/transferência aprovadas e regularização aplicável.
- O catálogo Conitec segue como metadados e links; não existe índice RAG de trechos. Critérios, referências e perguntas sobre documentos continuam indisponíveis. O catálogo Anvisa é regulatório e não valida indicação ou prescrição.
- Não há regras, hipóteses, investigações ou tratamentos clínicos revisados habilitados. A interpretação textual não confirma diagnóstico e não modifica o motor clínico.

## Provisionamento manual antes de uma chamada real

1. Habilitar Netlify Identity no site e desativar signup público.
2. Convidar médicos aprovados e atribuir `clinical-assistant` em `app_metadata.roles` somente após aprovação administrativa.
3. Confirmar que os templates de convite, confirmação e recuperação apontam para o domínio HTTPS do site PlantãoMed e preservam os fragmentos gerados pelo Identity; não acrescente tokens em parâmetros de query.
4. Configurar no painel Netlify as variáveis Gemini e Upstash indicadas acima; não cadastrar segredo JWT próprio.
5. Usar Node.js 22.12 ou superior no build e nas Functions, requisito do SDK oficial instalado.
6. Autenticar/vincular o Netlify CLI (`netlify login`, `netlify link`) para `netlify dev` acessar a configuração do site. A chamada real não foi executada neste workspace: o CLI informa que não está autenticado, nenhum site está vinculado e as variáveis locais não estão definidas.
