# Assistente Clínico — auditoria e prontidão

## Status

O Assistente Clínico continua restrito a builds de desenvolvimento e casos. Não está liberado para atendimento real. A implementação técnica não substitui validação clínica independente nem determina prontidão para uso assistencial.

## Auditoria das lacunas

- **Formulário:** recebe sintomas, idade, contexto, sinais vitais, exame físico e dados laboratoriais/de imagem em memória; ainda não cobre uma entrevista clínica completa nem valida intervalos de laboratório ou referências específicas.
- **Motor:** havia apenas um retorno vazio. Agora existe um avaliador de regras declarativas com condições, escopo de população/contexto, perguntas contextuais, predicados de exclusão, achados ausentes, associação rastreável a hipóteses/investigações/terapias e controle de unidades sem conversões.
- **Base executável:** continua sem regras, hipóteses, investigações ou tratamentos clínicos. O conteúdo existente na Biblioteca não tem referências e revisão aptas para o motor.
- **Terapêutica:** qualquer relação que venha a ser cadastrada exige critérios de aplicabilidade, entradas de segurança conhecidas e revisão explícita de contraindicações, interações e restrições populacionais. Nenhum produto/dose é sugerido atualmente.
- **Privacidade:** dados do caso são estado transitório da página, não vão para URL, armazenamento ou serviço externo; saída e descarte limpam a avaliação. Não há retenção do caso.
- **Produção:** a avaliação está indisponível fora do ambiente de desenvolvimento; não foi executada avaliação regulatória, de segurança clínica ou de validação profissional.

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

- A avaliação em funcionamento é exibida somente quando `import.meta.env.DEV` está habilitado; no build de produção, a rota informa que o recurso está indisponível.
- Usar somente casos no ambiente de desenvolvimento. Não inserir identificadores pessoais.
- A ausência de alerta não exclui risco; a interface explicita essa limitação.
- Nenhum valor de sinal vital é classificado como normal, anormal ou grave.
- A lista de sinais/sintomas é um vocabulário de organização, não uma lista de hipóteses.
- Nenhum medicamento está associado a sintomas ou diagnósticos; não há dose ou prescrição.
- O protótipo não substitui avaliação profissional, protocolos institucionais, revisão clínica, avaliação de risco ou análise de enquadramento como Software como Dispositivo Médico.

## Critérios antes de habilitar conteúdo clínico

Cada fluxo precisa de documento brasileiro vigente identificado por título, versão, população, contexto, URL e datas relevantes; regras determinísticas com critérios de inclusão e não aplicação; casos de referência validados independentemente; revisão por profissional habilitado; rastreabilidade e processo de atualização. Relações farmacológicas ainda exigem verificação independente de indicação, população, restrições, contraindicações, bula e status regulatório. Conteúdo não deve ser habilitado pela mera existência de catálogo ou por sucesso dos testes de software.

## Verificação desta etapa

Testes técnicos incluem fixtures sintéticas exclusivas do software para regras elegíveis/inativas, perguntas por dados ausentes, integridade de relações e fontes, bloqueio terapêutico com segurança desconhecida, e ausência de conversão de unidades. Testes com fixtures não são casos clínicos validados e não constituem validação clínica. Builds, lint e testes são executados conforme os scripts em `package.json`.

## Conexão Gemini e limites atuais

- O Assistente Clínico inclui um campo de descrição livre, confirmação obrigatória de caso, estruturação editável dos achados, estado de carregamento/cancelamento e uma área de perguntas contextuais. O resultado não atualiza o motor clínico nem campos objetivos automaticamente; o profissional precisa revisar e preencher o formulário existente.
- A Function aceita somente ações de estruturação ou esclarecimento textual. Instruções de sistema são fixas no servidor; o modelo só pode ser `gemini-2.5-flash`. Respostas usam JSON estruturado, limites de tamanho e validação estrita; referências não recuperadas são rejeitadas. Falhas e erros do provedor não são repassados ao navegador.
- A Function fica fechada até que `AI_ASSISTANT_ENABLED=true`, `AI_PROVIDER=google`, `AI_PROVIDER_API_KEY`, `AI_MODEL=gemini-2.5-flash`, `NETLIFY_IDENTITY_JWT_SECRET` e `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estejam configurados no ambiente Netlify. A autenticação valida JWT HS256 assinado pelo segredo do Netlify Identity e papel `authenticated`. Este repositório não implementa login/Identity no frontend; portanto, sem essa integração e provisionamento, a chamada permanece indisponível.
- O limite atômico no Redis é de 5 chamadas/minuto e 20/dia por usuário autenticado, mais 300/dia globalmente. Cada entrada tem no máximo 12 KB, a descrição é limitada, a saída é limitada a 900 tokens e a chamada ao provedor expira em 12 segundos. Falha do Redis fecha a chamada; 429 do Redis/Gemini retorna uma resposta genérica de limite.
- A interface pede confirmação de caso e bloqueia padrões comuns de identificadores (e-mail, telefone e CPF), mas isso não garante que texto livre seja sintético. Não habilitar o provedor para casos reais sem contratos, controles de privacidade/LGPD, avaliação jurídica e conformidade aplicável.
- A integração não implementa RAG: o catálogo Conitec contém metadados e links, sem trechos documentais extraídos/indexados. Consultas de critérios, referências e conteúdo recuperado são recusadas; a IA não pode inventar fontes. O PCDT AVC já auditado não está transformado em índice RAG nem aprovado para respostas automatizadas.
- O catálogo Anvisa permite consultas regulatórias existentes, mas registros não comprovam indicação terapêutica. O assistente não consulta esse catálogo como evidência clínica e não gera prescrição ou posologia.
- Estado conhecido nesta entrega: 0 regras clínicas executáveis/revisadas, 0 hipóteses, 0 investigações e 0 opções terapêuticas habilitadas. A chamada real ao Gemini e a validação visual em navegador dependem de ambiente Netlify autenticado, Redis, chave de provedor e navegador disponíveis; testes locais usam somente caso sintético e respostas controladas.
