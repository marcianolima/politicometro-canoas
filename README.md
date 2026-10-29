# Politicômetro Canoas

Observatório cívico independente para **Canoas / RS (IBGE 4304606)**, inspirado nos princípios de acesso a dados públicos, rastreabilidade e neutralidade do [Politicômetro](https://www.politicometro.org/sobre). Código e identidade visual próprios; sem afiliação ao portal original.

**Endereço configurado no projeto (publicação ainda precisa ser confirmada em Settings → Pages):** https://marcianolima.github.io/politicometro-canoas/

## Funcionalidades implementadas

- 23 eleitos no pleito de 2024 (prefeito, vice e 21 vereadores), com cargo, partido, votação e número quando confirmado. **São eleitos em 2024, não uma relação certificada de exercício em 2026.**
- Busca por nome sem acentuação, filtros por cargo e partido, listagem alfabética, CSV do recorte, ficha individual e links compartilháveis.
- Abas resumo, eleição, bens, presença, votações, proposições e gastos. Dados ausentes são **não disponíveis**, nunca zero.
- Dados oficiais TRE-RS dos dois turnos de 2024, com transparência sobre comparecimento, brancos e nulos.
- Explorador interativo de todas as seis candidaturas à Prefeitura no 1º turno e duas no 2º turno, além dos 21 vereadores eleitos, com barras de votação nominal neutras, seleção individual, links diretos à fonte e filtros de zona e seção.
- Pipeline experimental de coleta por zona e seção TRE-RS, com validação obrigatória de totais contra cada candidatura. Sem números validados, a aba indica indisponibilidade, mas mantém o link à consulta oficial; sem geocodificar seções.
- Cartografia SVG a partir de GeoJSON. A geometria inicialmente versionada é **muito simplificada**, copiada do projeto WebGIS Empreender, e o workflow tenta substituí-la pela malha oficial IBGE antes de publicar.
- Consulta sob demanda à API v2 da Câmara dos Deputados para deputados federais do RS, com primeiras páginas de proposições e lançamentos de despesa. **Essas páginas não são totais anuais.**
- Enriquecimento automático do TSE 2024 para candidaturas e total dos bens autodeclarados, com conciliação exata e sem publicar CPF, descrições de imóveis ou endereços.
- Fotografia separada da composição apresentada pela Câmara de Canoas em outubro de 2026, sem confundir eleitos com quem aparece na relação institucional.
- Bancada de três senadores em exercício pelo RS, com mandatos e partidos segundo fonte do Congresso Nacional; representantes estaduais, não exclusivamente municipais.
- Site estático, responsivo, sem backend pago ou chaves de API; GitHub Actions para testes, coleta de fontes e publicação.

## Finanças públicas, investimentos, contratos e obras

**Página específica:** [Orçamento e Obras](https://marcianolima.github.io/politicometro-canoas/financas.html) — `financas.html`.

- **RREO parcial de 2026 (até agosto, 4º bimestre):** quadro especial com arrecadação, previsão, dotação, empenhos, liquidação, pagamento e **grupo de investimentos empenhados**. Os valores são aproximadamente arredondados e reproduzidos de consultas independentes que citam SICONFI como fonte; dados ainda não foram conciliados ao arquivo primário. Não são valores fechados do exercício nem série diretamente aditiva com o RREO consolidado.
- **RREO consolidado da Prefeitura:** cinco fotografias oficiais de 2024–2025, com receita prevista/realizada, dotação inicial/atualizada, créditos adicionais, despesas empenhadas/liquidadas/pagas e suas razões. Fechamento de 2024 inclui despesa de capital líquida, receita corrente líquida, restos a pagar e aplicação constitucional em Saúde, Educação e FUNDEB. Fonte individual de cada fotografia ligada diretamente ao PDF municipal. Dados não são atualizados em tempo real.
- **DCA/SICONFI anual (base distinta do RREO):** histórico nominal 2015–2025 de receitas e despesas **exceto intraorçamentárias**, último ano com liquidações e pagamentos; gráfico anual e 19 funções de despesa em 2025. **Status: reprodução secundária da DCA**, de fontes que identificam o SICONFI; conferência direta automática com o Tesouro ainda pendente. As funções de 2025 são arredondadas. Não juntar RREO consolidado e DCA exceto intraorçamentárias na mesma série.
- **Contratos públicos PNCP:** coleta programada de todas as páginas publicadas no exercício de 2026 pelo CNPJ 88.577.416/0001-18. O coletor tenta todas as janelas mensais de 2026 com retentativas. Se uma janela expirar, pode publicar **apenas os meses inteiros previamente concluídos**, com `status: parcial`, período exato, número de meses e aviso de incompletude; jamais apresenta esses contratos como total do ano. Uma fotografia anterior com cobertura mais longa não é substituída por uma mais curta. Busca por objeto e fornecedor, filtro de objetos de obras, ordenação, CSV e fonte individual. Estado inicial `aguardando-coleta` até êxito da API.
- **Projetos e obras:** identificação lexical de objetos relacionados a obras nos contratos PNCP, sem confundir contratação, pagamento, medição física e entrega; links diretos ao mapa, lista e medições do Licitacon Obras Cidadão do TCE-RS. Não existe ainda cadastro consolidado de obras com etapas, geometrias e medições — é lacuna expressa, não substituída por inferências.
- **Usabilidade:** página independente responsiva, tabelas e gráficos, acesso pela navegação e CTA da página inicial, exportação CSV, testes Python de integridade, verificação JS e testes Chromium desktop/mobile.

**Fontes:** [Contas Prefeitura](https://www.canoas.rs.gov.br/contas/), [Dados abertos TCE-RS](https://dados.tce.rs.gov.br/), [API SICONFI](https://apidatalake.tesouro.gov.br/docs/siconfi/), [API PNCP](https://pncp.gov.br/api/consulta/swagger-ui/index.html). Reprodução de DCA: [Prefeituras em Números](https://prefeiturasemnumeros.com.br/municipios/canoas-rs) e [Dados do Brasil](https://dadosdobrasil.com/prefeitura/canoas-rs/).

**Interpretação:** dotação é autorização; empenho não é pagamento; liquidação não é empenho; despesa de capital não é sinônimo de obra; e contrato não comprova execução ou entrega física. Um valor ausente não é tratado como zero. Não se atribui despesa agregada a políticos individualmente sem vinculação documental.

## Publicação no GitHub Pages

A branch principal é main. Workflow: .github/workflows/deploy.yml. Dispara em push, manualmente e semanalmente.

1. Abra Settings → Pages → Build and deployment.
2. Em Source, selecione **GitHub Actions**, caso ainda não esteja configurado.
3. Confira a execução de Actions: Publicar Politicômetro Canoas (Pages). O pipeline roda unittest Python, check de sintaxe Node, coleta TSE/IBGE/TRE, e smoke tests de verdade em Chromium desktop/mobile com screenshots anexados.
4. A URL do projeto será https://marcianolima.github.io/politicometro-canoas/

**Visibilidade:** o repositório foi verificado como **público em 29/10/2026**. Isso permite GitHub Pages no plano Free; ainda é obrigatório habilitar/configurar Pages em Settings caso não esteja ativo. O conector de GitHub disponível nesta conversa não permite alterar diretamente esta configuração.

## Executar e testar localmente

No terminal, na pasta raiz do repositório:

- Python: python -m http.server 8000
- Navegador: http://localhost:8000/
- Testes: python -m unittest discover -s tests -v
- Sintaxe JS: node --check app.js && node --check extras.js && node --check election-explorer.js
- Homologação visual: npm install --no-save playwright@1.56.1; npx playwright install chromium; sirva a pasta no localhost:8765; node tests/smoke.mjs (testes automatizados em 1365×900 e 390×844).
- Coletas (precisam de internet): python scripts/sync_sources.py e python scripts/collect_tre.py

Não é necessário instalar bibliotecas extras: o frontend usa HTML, CSS e JavaScript, e o coletor usa a biblioteca padrão Python.

## Principais fontes

| Fonte | Referência |
|---|---|
| TRE-RS 2024, primeiro turno | https://resultados.tre-rs.jus.br/eleicoes/2024/619/RS85898.html |
| TRE-RS 2024, segundo turno | https://resultados.tre-rs.jus.br/eleicoes/2024/620/RS85898.html |
| TSE, candidatos e bens | https://dadosabertos.tse.jus.br/dataset/candidatos-2024 |
| Câmara Municipal de Canoas | https://camaracanoas.rs.gov.br/ |
| Câmara dos Deputados, API v2 | https://dadosabertos.camara.leg.br/swagger/api.html |
| IBGE, malha 4304606 | https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4304606?formato=application/vnd.geo%2Bjson&qualidade=minima |
| Politicômetro, metodologia inspiradora | https://www.politicometro.org/sobre |

## Estrutura

- index.html, styles.css, app.js, favicon.svg: interface inicial.
- financas.html, financas.js, financas.css, finance-current.js: painel RREO, contas, investimentos, contratos e obras.
- dca.js e dca.css: série histórica anual e funções de despesa em 2025.
- data/politicos.json e data/eleicoes.json: base eleitoral municipal.
- data/canoas.geojson: geometria provisória; atualizada pelo IBGE no deploy se validada.
- data/tse-2024.json: enriquecimento de candidaturas e bens; pode permanecer pendente.
- data/composicao-camara.json: fotografia institucional da Câmara municipal.
- data/financas-rreo.json: RREO municipal oficial por bimestre e exercício.
- data/financas-2026-referencia.json: recorte 2026 aproximado, não conciliado com o arquivo primário.
- data/financas-dca.json: DCA 2015–2025 com atribuição de fontes e ressalvas de reprodução secundária.
- data/contratos-pncp.json: fotografia integral do PNCP (pendente até coleta completa).
- scripts/sync_pncp.py: consulta pública PNCP por exercício com identificação de órgão e gravação atômica.
- data/prefeito-2024.json e data/secoes-2024.json: seis candidaturas do 1º turno, duas do 2º turno e eventual coleta TRE validada por zona/seção.
- data/senadores-rs.json: senadores em exercício pelo RS em outubro de 2026.
- extras.js, extras.css: telas de exercício municipal e Senado.
- election-explorer.js, election-explorer.css: análise eleitoral, seções e CSV.
- scripts/collect_tre.py: coleta detalhada por zona/seção; só publica verificações por total exato.
- tests/smoke.mjs: verificação em Chromium e screenshots de homologação das páginas eleitoral e financeira.
- tests/test_financas.py: testes de consistência fiscal, DCA e integridade de contratos.
- scripts/sync_sources.py: pipeline oficial de atualização atômica.
- tests/test_project.py: testes de integridade e coerência.
- METODOLOGIA.md: regras e lacunas.

## Limitações ainda abertas

O portal original integra informações de todos os níveis federativos. O painel financeiro amplia significativamente o escopo, mas ainda não substitui o TCE-RS, o Tesouro Nacional nem o controle municipal. Aqui foi implementado o **núcleo eleitoral municipal 2024**, com consulta federal complementar. Não estão concluídos os perfis detalhados dos senadores (a lista dos três senadores do RS está implementada), deputados estaduais, governador, presidente, o histórico de candidaturas anteriores a 2024, a situação efetiva das cadeiras municipais em cada data, nem os indicadores individualizados de presença, votos e despesas municipais.

Não foi confirmada API aberta da Câmara Municipal com todas essas métricas; por isso a aplicação não atribui dados por aproximação de nomes nem chama de ausência uma sessão sem lista. Para ampliar a cobertura serão necessárias fontes oficiais, identificadores estáveis e conferência de qualidade. O resultado por zona/seção do TRE é somado por eleitorado e não representa um mapa de origem residencial ou um polígono de bairro.

**Sem notas, ranking, classificação político-ideológica ou recomendação eleitoral.**

## Licença

MIT para código próprio. Dados e geometrias seguem termos oficiais de origem. Projeto independente do Politicômetro original.
