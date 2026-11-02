# Calculadoras Médicas — escopo implementado

## Status e finalidade

O catálogo contém dez ferramentas com cálculo local e determinístico: qSOFA, CRB-65, RCRI, CKD-EPI 2021 por creatinina, CKD-EPI 2021 por creatinina e cistatina C, CKD-EPI 2012 por cistatina C, Cockcroft–Gault, IMC adulto, superfície corporal de Mosteller e relação PaO₂/FiO₂. As dez têm testes automatizados para as fórmulas/critérios implementados; isso não é validação clínica independente.

As fontes identificadas estão vinculadas a cada ferramenta no catálogo. As fórmulas não fazem chamadas a Gemini ou a outro serviço. Entradas e resultados ficam apenas no estado da página e não são salvos automaticamente. O detalhe da calculadora é carregado sob demanda pelo roteamento; os assets compilados entram no precache do PWA, então cálculos já carregados podem ser executados sem chamada de rede.

Este trabalho implementa cálculos de referência, mas não conclui validação clínica independente. No catálogo, zero ferramentas têm revisão clínica documentada ou liberação assistencial. Os testes de software verificam a implementação contra equações/critérios descritos nas fontes, mas não substituem conferência clínica, validação externa, revisão regulatória ou avaliação de licenças.

Não há integração de associação automática com o Assistente Clínico: não existem relações ferramenta–achado revisadas e validadas para recomendar uma calculadora a partir de um caso.

## Limitações de aplicabilidade

- CKD-EPI 2021 e CKD-EPI 2012 são versões distintas, para adultos e com unidades e marcadores indicados; não classificam DRC nem corrigem problemas de marcadores instáveis.
- Cockcroft–Gault usa peso informado sem ajuste e não deve ser interpretado automaticamente para decisão de dose.
- IMC aplica categorias adultas apenas a partir de 20 anos e é medida de triagem, não composição corporal; não é aplicado a crianças/adolescentes.
- qSOFA não diagnostica sepse e não deve ser usado isoladamente para triagem ou exclusão.
- CRB-65 é prognóstico em pneumonia adquirida na comunidade em adultos e não escolhe sozinho local de tratamento.
- PaO₂/FiO₂ isolada não diagnostica SDRA.
- A classificação das fontes e a permissão de uso/reprodução de cada instrumento ainda precisam de análise editorial/jurídica. Nenhum instrumento é declarado liberado para assistência.

## Fontes

- NIDDK, *Glomerular Filtration Rate Equations: Adults*: [equações CKD-EPI para adultos](https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults).
- Cockcroft DW, Gault MH. *Prediction of creatinine clearance from serum creatinine*. Nephron. 1976. [PubMed 1244564](https://pubmed.ncbi.nlm.nih.gov/1244564/).
- Singer M et al. *The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)*. JAMA. 2016. [PubMed 26903338](https://pubmed.ncbi.nlm.nih.gov/26903338/).
- Lim WS et al. *Defining community acquired pneumonia severity on presentation to hospital*. Thorax. 2003. [PubMed 12728155](https://pubmed.ncbi.nlm.nih.gov/12728155/).
- Lee TH et al. *Derivation and prospective validation of a simple index for prediction of cardiac risk of major noncardiac surgery*. Circulation. 1999. [PubMed 10477528](https://pubmed.ncbi.nlm.nih.gov/10477528/).
- CDC, *About Body Mass Index (BMI)* e categorias adultas. [CDC](https://www.cdc.gov/bmi/about/index.html).
- Mosteller RD. *Simplified calculation of body-surface area*. N Engl J Med. 1987. [PubMed 3657876](https://pubmed.ncbi.nlm.nih.gov/3657876/).
- ARDS Definition Task Force. *Acute Respiratory Distress Syndrome: The Berlin Definition*. JAMA. 2012. [PubMed 22797452](https://pubmed.ncbi.nlm.nih.gov/22797452/).

## Trabalho ainda necessário

1. Revisão das fórmulas, faixas, interpretação, populações e fontes por profissionais habilitados independentes.
2. Obtenção de casos de referência independentes, com resultados esperados conferidos por fonte externa e revisão de fronteiras.
3. Análise de licença e autorização para todos os instrumentos e respectivas traduções.
4. Definição de finalidade pretendida, gestão de risco, avaliação regulatória (incluindo eventual enquadramento SaMD), aprovação e processo controlado de publicação.
5. Ampliar a cobertura somente após verificação documental semelhante para cada nova ferramenta; NEWS2, Glasgow, SOFA/SOFA-2, HEART, escalas psicométricas e ferramentas obstétricas/pediátricas não foram implementadas nesta etapa.
6. A página da ESC para as diretrizes de fibrilação atrial 2024 declara que uso em software/ferramentas requer licença formal e que materiais não podem ser utilizados comercialmente sem permissão. Por isso, não foram transformadas recomendações dessas diretrizes em calculadoras no produto. As permissões de reprodução de outras escalas também não foram verificadas.
