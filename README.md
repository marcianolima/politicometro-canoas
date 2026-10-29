# Politicômetro Canoas

Observatório cívico independente para **Canoas / RS (IBGE 4304606)**, inspirado nos princípios de acesso a dados públicos, rastreabilidade e neutralidade do [Politicômetro](https://www.politicometro.org/sobre). Código e identidade visual próprios; sem afiliação ao portal original.

**Endereço previsto:** https://marcianolima.github.io/politicometro-canoas/

## Funcionalidades implementadas

- 23 eleitos no pleito de 2024 (prefeito, vice e 21 vereadores), com cargo, partido, votação e número quando confirmado. **São eleitos em 2024, não uma relação certificada de exercício em 2026.**
- Busca por nome sem acentuação, filtros por cargo e partido, listagem alfabética, CSV do recorte, ficha individual e links compartilháveis.
- Abas resumo, eleição, bens, presença, votações, proposições e gastos. Dados ausentes são **não disponíveis**, nunca zero.
- Dados oficiais TRE-RS dos dois turnos de 2024, com transparência sobre comparecimento, brancos e nulos.
- Cartografia SVG a partir de GeoJSON. A geometria inicialmente versionada é **muito simplificada**, copiada do projeto WebGIS Empreender, e o workflow tenta substituí-la pela malha oficial IBGE antes de publicar.
- Consulta sob demanda à API v2 da Câmara dos Deputados para deputados federais do RS, com primeiras páginas de proposições e lançamentos de despesa. **Essas páginas não são totais anuais.**
- Enriquecimento automático do TSE 2024 para candidaturas e total dos bens autodeclarados, com conciliação exata e sem publicar CPF, descrições de imóveis ou endereços.
- Fotografia separada da composição apresentada pela Câmara de Canoas em outubro de 2026, sem confundir eleitos com quem aparece na relação institucional.
- Bancada de três senadores em exercício pelo RS, com mandatos e partidos segundo fonte do Congresso Nacional; representantes estaduais, não exclusivamente municipais.
- Site estático, responsivo, sem backend pago ou chaves de API; GitHub Actions para testes, coleta de fontes e publicação.

## Publicação no GitHub Pages

A branch principal é main. Workflow: .github/workflows/deploy.yml. Dispara em push, manualmente e semanalmente.

1. Abra Settings → Pages → Build and deployment.
2. Em Source, selecione **GitHub Actions**, caso ainda não esteja configurado.
3. Confira a execução de Actions: Publicar Politicômetro Canoas (Pages).
4. A URL do projeto será https://marcianolima.github.io/politicometro-canoas/

**Importante:** este repositório estava **privado** quando consultado. O GitHub Pages em repositórios privados exige planos ou permissões compatíveis; no GitHub Free somente repositórios públicos podem usar Pages. Este projeto não altera automaticamente a visibilidade.

## Executar e testar localmente

No terminal, na pasta raiz do repositório:

- Python: python -m http.server 8000
- Navegador: http://localhost:8000/
- Testes: python -m unittest discover -s tests -v
- Sintaxe JS: node --check app.js
- Coleta (precisa de internet): python scripts/sync_sources.py

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

- index.html, styles.css, app.js, favicon.svg: interface.
- data/politicos.json e data/eleicoes.json: base eleitoral municipal.
- data/canoas.geojson: geometria provisória; atualizada pelo IBGE no deploy se validada.
- data/tse-2024.json: enriquecimento de candidaturas e bens; pode permanecer pendente.
- data/composicao-camara.json: fotografia institucional da Câmara municipal.
- data/senadores-rs.json: senadores em exercício pelo RS em outubro de 2026.
- extras.js, extras.css: telas de exercício municipal e Senado.
- scripts/sync_sources.py: pipeline oficial de atualização atômica.
- tests/test_project.py: testes de integridade e coerência.
- METODOLOGIA.md: regras e lacunas.

## Limitações ainda abertas

O portal original integra informações de todos os níveis federativos. Aqui foi implementado o **núcleo eleitoral municipal 2024**, com consulta federal complementar. Não estão concluídos os perfis detalhados dos senadores (a lista dos três senadores do RS está implementada), deputados estaduais, governador, presidente, o histórico de candidaturas anteriores a 2024, a situação efetiva das cadeiras municipais em cada data, nem os indicadores individualizados de presença, votos e despesas municipais.

Não foi confirmada API aberta da Câmara Municipal com todas essas métricas; por isso a aplicação não atribui dados por aproximação de nomes nem chama de ausência uma sessão sem lista. Para ampliar a cobertura serão necessárias fontes oficiais, identificadores estáveis e conferência de qualidade.

**Sem notas, ranking, classificação político-ideológica ou recomendação eleitoral.**

## Licença

MIT para código próprio. Dados e geometrias seguem termos oficiais de origem. Projeto independente do Politicômetro original.
