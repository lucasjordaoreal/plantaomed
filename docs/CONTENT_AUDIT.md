# Auditoria da biblioteca clínica

## Escopo e resultado

Auditoria realizada em 2 de novembro de 2026 sobre os seis registros atualmente presentes em `src/data/protocols.ts`. A biblioteca contém textos demonstrativos com afirmações potencialmente acionáveis, mas nenhum registro possui referência bibliográfica individual verificável, versão de documento, data de consulta à fonte ou identificação de revisor clínico.

Por segurança, os textos clínicos não são exibidos enquanto esses requisitos não forem atendidos. Os itens permanecem disponíveis apenas como títulos, status editorial e dados de organização; busca, favoritos e histórico continuam funcionando.

## Registros identificados

| Identificador | Tema | Status atual | Achados editoriais |
|---|---|---|---|
| `sindrome-coronariana-aguda` | Síndrome coronariana aguda | Rascunho | Referências genéricas à SBC, ACC/AHA e protocolo local; sem título, versão, URL ou consulta documentada. |
| `avc` | Acidente vascular cerebral | Aguardando revisão | Referências genéricas e estrangeiras; conteúdo sem documento brasileiro específico associado. |
| `asma-aguda` | Asma aguda | Aguardando revisão | Referências à GINA, SBPT e protocolo local sem identificar versões ou documentos. |
| `sepse` | Sepse | Rascunho | Referências genéricas e estrangeiras; conteúdo terapêutico sem fonte verificável associada. |
| `hipoglicemia` | Hipoglicemia | Desatualizado | Referências genéricas à ADA e protocolos locais; requer revisão e fonte brasileira vigente. |
| `anafilaxia` | Anafilaxia | Rascunho | Referências genéricas a organizações e protocolos sem identificação documental. |

## Problemas transversais

- Nenhum dos seis registros está aprovado; todos estão em rascunho, aguardando revisão ou desatualizados.
- Os campos de referência são texto livre e não permitem verificar título, instituição, URL, versão ou data de consulta.
- As datas legadas em `lastReviewed` não identificam revisor e não são tratadas como prova de revisão clínica.
- Há referências internacionais ou protocolos locais não identificados; não foi possível confirmar adaptação ao contexto brasileiro.
- População e contexto existem em alguns registros, mas não há documentação estruturada de fonte, aprovação ou revisão.
- Não há biblioteca de medicamentos no código atual. Nenhuma DCB, situação de registro Anvisa, bula profissional, Rename ou fornecimento pelo SUS foi confirmada nesta auditoria.
- Categorias referenciam identificadores que não existem na lista atual de protocolos; não foram removidas para preservar possíveis vínculos futuros.
- Não há ferramenta editorial/importador, testes ou pipeline de validação de conteúdo no estado anterior.

## Fontes oficiais consultadas

Os portais abaixo foram acessados em 2 de novembro de 2026 e catalogados em `src/data/sources.ts`. A consulta verificou a disponibilidade e o escopo institucional das páginas, não a vigência ou o conteúdo de documentos clínicos específicos.

- [Ministério da Saúde — PCDT](https://www.gov.br/saude/pt-br/assuntos/pcdt): página institucional descreve PCDT, DDT, protocolos de uso, diretrizes e linhas de cuidado.
- [Conitec](https://www.gov.br/conitec/pt-br): portal institucional para avaliação e incorporação de tecnologias no SUS.
- [Anvisa](https://www.gov.br/anvisa/pt-br): portal institucional regulatório; nenhum medicamento foi pesquisado individualmente.
- [Dados Abertos do SUS](https://dadosabertos.saude.gov.br/): portal de dados públicos de saúde; os dados não constituem validação clínica automática.

Um acesso bem-sucedido ao portal não equivale à verificação de uma recomendação. Nenhuma das fontes acima foi vinculada como evidência clínica a um protocolo nesta atualização.

## Próximos passos editoriais

1. Obter diretrizes brasileiras vigentes e permitidas para uso, registrando título, entidade, versão, URL, publicação e data de consulta.
2. Revisar cada registro por profissional qualificado, com escopo de população e contexto explícitos.
3. Atualizar ou retirar conteúdo que não possa ser sustentado por fonte adequada.
4. Preencher `sourceReferences`, `reviewedAt` e `reviewedBy`; a aplicação exige esses campos antes de exibir conteúdo com status aprovado.
5. Se uma biblioteca farmacológica for adicionada, validar cada apresentação e situação regulatória nas fontes oficiais, distinguindo registro Anvisa de fornecimento pelo SUS.

Esta auditoria não é uma validação médica e não transforma os conteúdos existentes em recomendação assistencial.
