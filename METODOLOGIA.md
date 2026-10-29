# Metodologia e proveniência

Inspirada em https://www.politicometro.org/sobre. Não reproduz código ou identidade visual do portal original.

## Universo

Município IBGE 4304606, TSE 85898, Canoas/RS. A lista inicial contém 23 eleitos em 2024: prefeito, vice e 21 vereadores. Resultado eleitoral e exercício corrente são informações distintas. Os nomes aparecem em ordem alfabética, sem ranking ou tonalidade partidária.

## Eleições de 2024

No primeiro turno, 259.585 aptos, 176.956 comparecimentos, 82.629 abstenções; para prefeito, 16.588 votos brancos, 14.382 nulos e 145.986 nominais válidos. Os votos nominais de vereador não incluem os votos de legenda.

Segundo turno: 259.585 aptos, 166.869 comparecimentos, 92.716 abstenções, 10.434 brancos, 11.229 nulos, 75.688 votos para Airton Souza e 69.518 para Jairo Jorge. Soma dos dois candidatos = 145.206 votos nominais válidos. As barras mostram frações deste total, e não do eleitorado apto. O vice integra a mesma chapa, sem votos individualizados.

## Recortes eleitorais e granularidade

O módulo de análise eleitoral disponibiliza seis candidaturas a prefeito no primeiro turno de 2024 (total nominal 145.986 votos), duas no segundo turno (145.206 votos) e os 21 vereadores eleitos no primeiro turno. Os resultados municipais correspondem à totalização TRE-RS; ordenar por votos não deve ser confundido com status de eleito na eleição proporcional.

O coletor scripts/collect_tre.py lê as páginas oficiais de cada candidatura e agrega apenas os pares "zona / seção / votação" publicados pelo TRE-RS. Cada zona precisa fechar com o número do respectivo cabeçalho; todos os votos das zonas devem somar exatamente os votos nominais municipais da candidatura. Falhas, divergências, duplicidades de seção e recortes incompletos não são exibidos como resultados oficiais. Fotografia anterior aprovada é preservada.

A zona e a seção são identificadores eleitorais; **não são endereços, bairros, coordenadas ou áreas residenciais.** A plataforma não produz mapas coropléticos por bairro com esses resultados sem georreferenciamento e metodologia explícita.

## Dados TSE e patrimônio

O script acessa o catálogo CKAN oficial, localiza os arquivos ZIP consulta_cand_2024 e bem_candidato_2024 e lê os CSVs do RS. A conciliação exige município, cargo, número e partido, e rejeita ambiguidades entre SQ_CANDIDATO. Sem fuzzy matching ou CPF. Se menos de 19 perfis forem conciliados, preserva-se o arquivo anterior.

A soma patrimonial agrega VR_BEM_CANDIDATO por candidatura, sem divulgar descrições, endereços ou dados de terceiros. Os valores são autodeclarados em 2024 e não representam valor atual de mercado. Declaração sem itens e indisponibilidade da fonte são estados distintos.

## Atividade legislativa

Presença só deve ser calculada com sessões deliberativas encerradas, listas de presença publicadas e períodos de efetivo exercício, excluindo licenças e afastamentos. Não se deve inferir presença de votos nominais. Na ausência de fonte municipal individualizada, o portal indica **não disponível** para presença, votações, proposições e despesas.

A API da Câmara dos Deputados oferece informações parciais, apresentadas sem extrapolar valores para totais anuais. Deputados federais por RS também representam Canoas, mas não foram eleitos exclusivamente no município.

## Cartografia

A malha inicial do projeto é um polígono **muito simplificado**, recuperado do repositório webgis-empreender-canoas. O coletor tenta baixar o GeoJSON oficial do IBGE na qualidade máxima, verificando Polygon/MultiPolygon, bounding box, quantidade de vértices e código 4304606. Registra qualidade, origem e data da coleta. Sem pontos de residências de políticos, sem votação por bairro inventada.

## Atualizações e lacunas

A cada deploy, a rotina coleta IBGE e TSE quando acessíveis. Falhas não devem apagar fotografias anteriores; o frontend mostra a data de origem de cada dado adicional.

Ainda não integrados integralmente: suplentes atualmente em exercício, Presidência, Governo do RS, Senado, Assembleia Legislativa, candidaturas históricas, presença e votações nominais de vereadores, despesas municipais e homologação visual em celulares reais. Esses módulos demandam fontes oficiais com IDs verificáveis.

A interface não usa notas, rankings, recomendação eleitoral ou análise política por IA.
