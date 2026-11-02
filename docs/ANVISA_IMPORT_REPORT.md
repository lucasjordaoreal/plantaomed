# Importação do conjunto aberto de medicamentos da Anvisa

- Fonte CSV: https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv
- Dicionário: https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_de_Dados_Registros_Validos_Medicamento_V1.pdf
- Data de consulta e geração: 2026-11-02
- SHA-256 do CSV: `f0b546e2d3a737a90fbc866348356cd766344bd2f4b8f488a43d66a0d7a30877`
- Formato: Windows-1252, delimitador ponto e vírgula, aspas duplas; o CSV tem 11 campos e o PDF descreve 10. O campo SITUACAO_REGISTRO não é definido no dicionário e foi preservado literalmente.
- Linhas lidas: 228869
- Registros importados após deduplicação de linhas normalizadas: 42660
- Linhas duplicadas removidas após normalização de espaços: 186209
- Linhas rejeitadas: 0
- Registros com número de registro preenchido: 35229
- Valores brutos de SITUACAO_REGISTRO: 14501 “Ativo”, 28159 “Inativo”; o significado jurídico/operacional não foi inferido.
- Arquivo de busca: `public/data/medical-library/medicines/search-index.json`
- Pacotes de detalhes: 33 arquivos em `public/data/medical-library/medicines/packs/`.

A documentação define a base como registros sem petição de cancelamento, mas isso não significa que cada registro esteja ativo ou que o produto esteja comercialmente disponível. O campo de situação e a validade bruta são preservados sem interpretação. Indicações, doses, contraindicações e recomendações não fazem parte deste conjunto e não são inferidas.

A amostra foi comparada com os campos e definições do dicionário oficial. A conferência individual em consultas interativas de produto não é declarada como realizada neste relatório.
