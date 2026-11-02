# Cobertura do catálogo médico brasileiro

Relatório gerado a partir dos dados de importação estáticos em 2026-11-02. Os totais descrevem apenas registros presentes no projeto; não representam cobertura da medicina brasileira.

## Contagens verificáveis

| Métrica | Total |
|---|---:|
| Assuntos ligados a documentos oficiais catalogados | 137 |
| Registros legados sem vínculo documental verificado | 6 |
| Documentos oficiais catalogados com metadados | 137 |
| Documentos com permissão de reprodução confirmada | 0 |
| Documentos com vigência individualmente verificada | 0 |
| Protocolos completos com revisão clínica | 0 |
| Medicamentos com registro Anvisa individualmente confirmado | 0 |
| Medicamentos catalogados | 42660 |
| Medicamentos com número de registro preenchido na base | 35229 |
| Números de registro distintos na base | 32800 |
| Registros pendentes de verificação individual | 42797 |

Os assuntos ligados a documentos representam registros bibliográficos derivados do catálogo de PCDTs do Ministério da Saúde/Conitec. Os seis temas legados permanecem separados e não foram considerados documentos oficiais nem conteúdo clínico validado. Seus vínculos individuais com os documentos catalogados ainda não foram verificados; portanto, o relatório não afirma ausência de documentos oficiais correspondentes.

## Documentos por especialidade

| Especialidade atribuída para navegação | Assuntos ligados | Documentos |
|---|---:|---:|
| Anestesiologia / Medicina da Dor | 1 | 1 |
| Cardiologia | 3 | 3 |
| Clínica Médica | 7 | 7 |
| Dermatologia | 4 | 4 |
| Endocrinologia | 18 | 18 |
| Gastroenterologia | 8 | 8 |
| Ginecologia e Obstetrícia | 4 | 4 |
| Hematologia | 11 | 11 |
| Imunologia e Alergologia | 2 | 2 |
| Infectologia | 15 | 15 |
| Nefrologia | 5 | 5 |
| Neurologia | 12 | 12 |
| Oftalmologia | 4 | 4 |
| Oncologia | 15 | 15 |
| Pediatria | 6 | 6 |
| Pneumologia | 6 | 6 |
| Psiquiatria | 5 | 5 |
| Reumatologia | 8 | 8 |
| Toxicologia | 2 | 2 |
| Urologia | 1 | 1 |

As especialidades são uma organização de navegação do projeto, não uma classificação clínica oficial.

## Instituições e fontes consultadas

O catálogo oficial de PCDTs do Ministério da Saúde/Conitec foi consultado para os metadados bibliográficos e links. Também foram consultados portais do Ministério da Saúde, Anvisa, Dados Abertos do SUS, Sociedade Brasileira de Cardiologia, Sociedade Brasileira de Pediatria, Sociedade Brasileira de Pneumologia e Tisiologia e Sociedade Brasileira de Diabetes. Algumas páginas foram acessíveis, mas não expuseram listagens estruturadas; isso está indicado em `sources.json`.

## Limites e próximos passos

- 137 registros têm título, especialidade, data listada e link oficial extraídos do catálogo; os documentos individuais não foram reabertos um a um para verificar vigência, integridade ou anexos.
- Nenhum texto de PCDT foi copiado. A permissão de reprodução de conteúdo integral ou resumido não foi verificada.
- Não há conteúdo clínico completo aprovado nesta entrega. Os seis registros legados não contam como protocolos verificados.
- Nenhuma DCB, apresentação, bula, registro Anvisa ou inclusão na Rename foi conferida individualmente; não há medicamento verificado no catálogo.
- A próxima etapa é conferir cada documento individualmente, validar o vínculo assunto-documento, avaliar licenças e submeter qualquer resumo clínico a revisão profissional documentada.
