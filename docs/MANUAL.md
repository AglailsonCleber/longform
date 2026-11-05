# Manual do Longform

Longform é um plugin do Obsidian para escrever romance, poema, conto e crônica. O manuscrito continua sendo Markdown. O que o ofício precisa — meta, versão, oficina, envio — fica ao lado do texto, em propriedades da nota ou no painel, e não reescreve a prosa.

A interface está em inglês. Os nomes de abas, botões e comandos abaixo são os que aparecem no app. Os comandos ficam na paleta do Obsidian com o prefixo **Longform:**.

## Abrir o painel

1. Abra a paleta de comandos e rode **Open Longform pane**.
2. O painel lista os projetos do vault. Escolha um no seletor no topo.
3. As abas mudam conforme o projeto. Um projeto de várias cenas tem **Scenes**. Um projeto de uma nota só não tem.

Notas que não pertencem a um projeto Longform ficam de fora do painel, da contagem e da compilação.

## Criar um projeto

Clique com o botão direito numa pasta e escolha **Create Longform Project**.

- **Multi** — romance, coletânea, série de crônicas. O plugin cria um arquivo índice. Cada cena é uma nota. A ordem das cenas mora no índice.
- **Single** — conto, poema, crônica avulsa. Uma nota só é o projeto inteiro.

Também dá para criar o índice à mão com **Insert multi-scene frontmatter** ou **Insert single-scene frontmatter**.

O bloco `longform` do índice é a espinha do projeto. Evite editá-lo direto. O plugin não apaga arquivos quando o índice muda, mas uma edição errada desorganiza a ordem.

Para apagar o projeto inteiro, use **Delete project** na aba **Project**, ou o comando **Delete this project**. O plugin pede confirmação e leva para a lixeira do sistema o índice, as cenas, e as pastas Pesquisa, Bíblia, Reading, Output e Workshop de cada rascunho desse título. Notas de pesquisa e fichas marcadas como deste projeto também saem. Arquivos seus que estejam na mesma pasta e não pertençam ao projeto ficam. A pasta do projeto só some se ficar vazia.

### Cenas

Na aba **Scenes**:

- Digite o título no campo de cena nova e confirme. A nota abre pronta para escrever.
- Arraste para reordenar. Arraste para a direita, ou use **Indent scene** / **Unindent scene**, para aninhar capítulo, parte e cena.
- **Previous scene** e **Next scene** saltam na ordem do manuscrito. As variantes “at indent level” ficam no mesmo nível.
- **Jump to scene in current project** abre uma cena pelo nome.
- **Reveal current project in navigation** mostra a pasta no explorador de arquivos.

Cena cortada, variante e apêndice continuam no projeto e saem do manuscrito compilado. Isso se marca na aba **Structure**, no papel da peça.

## A página

Estas opções valem só para notas de um projeto Longform. O resto do vault não muda.

Em **Settings → Longform → Page**:

| Opção | O que faz |
| --- | --- |
| **Hide note properties** | Esconde o bloco de propriedades no topo da nota. As propriedades continuam no arquivo. O mesmo efeito está no comando **Hide note properties**. |
| **Highlight current line** | Acende a linha do cursor. |
| **Focus mode** | Esmaece os outros parágrafos. Uma linha em branco marca o fim do parágrafo. |
| **Typewriter mode** | Mantém a linha do cursor no centro. |
| **Reading measure** | Coluna estreita, com largura, entrelinha e margem próprias. |
| **Light manuscript** | A página de escrita usa o tema oposto ao do aplicativo. |
| **Portuguese page** | Marca a página como português para o corretor. |
| Fonte e contraste | Tamanho do manuscrito e contraste mais forte, quando ligados. |

Atalhos equivalentes: **Toggle current line highlight**, **Toggle focus mode**, **Toggle typewriter mode**.

### Forma da página

Na barra da nota, ou pelos comandos:

- **Set page form to prose** — prosa corrida.
- **Set page form to verse** — a quebra de linha é do poema. O verso não reflui como parágrafo.
- **Set page form to column** — crônica de coluna, medida mais curta.
- **Set page form to script** — roteiro, em fonte monoespaçada.

Com a forma de verso, **New stanza** abre uma estrofe (linha em branco e verso novo). No roteiro: **Insert scene heading**, **Insert character cue**, **Insert parenthetical**.

### Português na página

- **Insert dialogue dash** — travessão de fala.
- **Insert hyphen** — hífen de palavra composta, sem virar travessão.
- **Insert quotes** — aspas no trecho selecionado, ou um par vazio com o cursor no meio.
- **Insert missing word** — um `TK` pesquisável no lugar da palavra que ainda não veio.
- **Insert margin note** — comentário privado na margem. Não entra na saída. **List margin notes** e **Show private comments** reúnem esses comentários.
- **Read aloud** lê a nota, com pausa de parágrafo e, no poema, de verso e de estrofe. **Stop reading** interrompe.
- **Open beside this page** abre a pesquisa, a ficha ou outra versão ao lado.
- **Restore recovered page** devolve o último estado se o aplicativo fechou no meio da escrita. O manuscrito fica no aparelho. A sincronização, se existir, espera a rede.

## Captura

Aba **Capture**. O que ainda não é manuscrito mora aqui e não entra na compilação.

- **Fragment** — frase, imagem ou verso sem decidir o livro antes. A inbox funciona mesmo sem projeto aberto, pelo comando **Capture to inbox**.
- **Title** — títulos candidatos, separados do título já decidido.
- **Sonnet**, **Flash**, **Column** — exercícios que conhecem a forma.
- **Research** — nota, foto ou citação do projeto. Fica de fora do fluxo do livro.
- **Dictate a raw draft** — dita a cena ou a crônica. O texto é rascunho para reescrever. **Stop dictation** encerra.
- **Note from passage** — a seleção vira ficha, pergunta de revisão ou fato a checar.
- **Keep in …** liga um bilhete da inbox ao projeto aberto.
- **Used in the open scene** marca o fragmento como usado na cena aberta. O bilhete passa a apontar para essa cena.

Diário de observação: ao guardar, registre o que foi visto, onde e quando. Essa matéria serve à crônica e ao romance que nasce do cotidiano.

## Arquitetura

Aba **Structure**. A ordem de leitura é o livro. A ordem de escrita segue a data de cada peça.

- **Read through** junta o manuscrito numa leitura contínua.
- **Contents** escreve o sumário.
- **Scene**, **Sonnet**, **Column** criam uma peça já com a forma certa. O soneto nasce com catorze linhas. A coluna nasce com teto de palavras.
- Filtros: estado (ideia, rascunho, revisão, pronto), ponto de vista, lugar, tempo do mundo, quem está na cena.
- **Reading order** e **Writing order** trocam a lista. **Held pieces** mostra ou esconde corte, variante e apêndice.

Cada peça pode ter sinopse, estado, ponto de vista, elenco, unidade (livro, parte, ato, capítulo, cena), papel e teto de palavras. Papel **manuscript** entra na compilação. **Cut**, **variant** e **appendix** ficam no projeto e saem do livro.

## Enredo

Aba **Plot**.

- **Scenes** — propósito da cena, mudança, tensão, distância do narrador (perto, relato, câmera).
- **Threads** — fios que atravessam o livro.
- **Time** — quando a cena acontece no mundo.
- **Arcs** — quem muda, e em quê.
- **Scaffold** — andaime de atos, jornada ou batidas. É um apoio, não uma camisa de força.
- **Plants** — o que foi plantado e onde paga.
- **Who knows what** — o que cada pessoa da história já sabe.
- **What stopped being true** — o que deixou de valer.
- **Endings** — o tronco e as saídas alternativas.

**New alternate ending** pendura outro final no mesmo tronco, sem copiar o conto inteiro. A alternativa fica como variante e não entra no manuscrito enquanto for variante.

## Bíblia

Aba **Bible**. Fichas de pessoa, lugar, coisa e mundo.

- Criar e abrir fichas pelo painel.
- **Open card at cursor** abre a ficha do nome sob o cursor.
- **Replace a name in the book** troca um nome em todas as cenas do projeto. Use quando o nome do livro mudou, não para um experimento local.
- **Try a name** testa um nome antes de gravá-lo na prosa.
- **Dialogue check** olha falas contra as fichas.

Nomes da bíblia também alimentam o dicionário do livro na aba **Archive**, para o corretor não tratar o elenco como erro de inglês.

## Verso

Aba **Verse**. Antes, ponha a nota em forma de verso.

- **Classical** e **Phonetic** — contagem de sílabas na margem e na lista. O modo fonético aplica ditongo, hiato, sinérese e elisão do português. Não é a régua do inglês.
- **This line** — sílabas do verso em que está o cursor. O mesmo que **Count syllables on this line**.
- **Correct stress** — a tonicidade sugerida pode errar. A correção fica na palavra (**Correct verse stress**).
- A letra ao lado do verso é a rima: maiúscula para perfeita, família toante quando o som das vogais coincide.
- **Rhyme dictionary by sound** — rimas pela pronúncia da página, com filtro de sílabas. Perfeita e toante vêm separadas.
- **Sonnet**, **Haiku**, **Villanelle**, **Sestina**, **Redondilha**, **Décima**, **Quatrain** — andaime com uma linha por verso, a letra da rima e a cota de sílabas. O painel diz quantos versos ainda não fecharam (**Insert fixed-form scaffold**).
- **Alliteration**, **Assonance**, **Echo** — camadas de som, cada uma ligável. Com as três desligadas, o poema fica limpo.
- **Stanza** — dobra o poema numa estrofe. **Show all** reabre o resto.
- **Collection** — linhas, estrofes, esquema e irregularidade dos poemas do projeto, antes da diagramação.

A meta do dia em versos ou estrofes fica na aba **Habit**, não numa meta de mil palavras.

A exportação em **Output** preserva quebra de verso. Não transforma verso em parágrafo nem estrofe em lista.

## Conto

Aba **Story**. O conto tem teto próprio. Não herda a meta de um romance.

- **Micro**, **Flash**, **Story**, **Novelette** — piso e teto de palavras da peça (**Set short-story length**). O painel avisa se passou do teto ou não chegou ao piso.
- **Pin edges** — guarda o primeiro e o último parágrafos enquanto o meio é reescrito (**Pin opening and closing paragraphs**).
- **Mark revealed / secret** — o que o leitor já sabe e o que ainda é segredo (**Mark what the reader knows**).
- **Set effect** — uma frase sobre o que o conto quer fazer. Trechos longos que não tocam essa frase aparecem como diluição (**Set the central effect**).
- **Hang alternate ending** — outra saída no mesmo tronco.
- **Collection motifs** e **Piece motifs** — um fio (objeto, lugar, frase) e onde ele aparece (**Edit story motifs**).
- **Open Life for submissions** — envios, prazos e aceites da peça. A coletânea não apaga essa história.
- O tempo de leitura é o da peça inteira, como o leitor a encontraria (**Estimate reading time for one sitting**).

## Crônica

Aba **Chronicle**. A crônica tem prazo, veículo e fato. Não precisa de arco de romance.

- **Weekly**, **Biweekly**, **One-off** — a grade da coluna. O buraco aparece antes de alguém cobrar (**Set column cadence**).
- **Series & desk** — nome da série e editoria.
- **Set ceiling** — palavras, caracteres ou laudas do jornal, da revista ou do site. A peça avisa quando passa (**Set vehicle ceiling**).
- **Set due date** — prazo desta crônica, separado da meta de palavras do dia (**Set delivery due date**).
- **Edit persona** — tom, tratamento e o que o narrador da coluna costuma notar (**Edit column persona**).
- **Edit fact sheet** — data, lugar, o que foi visto e o que foi inventado em cima do visto (**Edit chronicle fact sheet**).
- **Link versions** — a crônica do veículo e a reescrita para o livro ficam as duas, ligadas.
- **Archive by venue** — filtre por jornal, editoria e ano. Não depende só da pasta.
- **Mark names** — gente real para uma leitura de cuidado antes do envio (**Mark real people to check**).
- **Set narrator** — narrador estável da série, sem clímax de romance.
- **Record publication** — data e veículo. A primeira publicação não é apagada quando a crônica sai de novo em outro lugar.

## Revisão

Aba **Revision**. Versão existe para o corte ficar barato.

- **Name this version** — nomeia o momento em que um capítulo, um poema ou uma crônica fechou.
- **Earlier wording of this paragraph** — a redação anterior do parágrafo em que está o cursor. Dá para restaurar.
- **Set revision mark** — um marco. **Since the mark** mostra o que mudou depois.
- **Propose a change** — uma proposta ao lado do texto. Aceitar grava no manuscrito. Recusar guarda a proposta.
- **Read as a reader** — leitura sem as marcas de oficina.
- **Prose** — uma leitura de eco, frase longa, clichê e advérbio. Configurável. Não reescreve nada.
- **Treatment** — o tratamento da peça, separado da prosa.
- **Errands** — pendências (checar um fato, cortar uma cena).
- **Trash** — cena, poema ou crônica apagados esperam aqui. Esvaziar a lixeira é um ato separado.
- **Other drafts** — outros rascunhos do mesmo projeto, sem misturar com o manuscrito aberto.

**Open beside this page** serve para ver a versão anterior ao lado da atual.

## Hábito

Aba **Habit**. A meta fala a unidade do ofício.

Em **Settings → Word Counts & Sessions**:

- **Session goal** e **Session goal unit** — palavras, minutos, linhas ou estrofes. A sessão avisa quando a meta chega, se **Notify on goal reached** estiver ligado.
- **Goal applies to** — quando a unidade é palavras: tudo o que foi escrito, cada projeto, ou cada cena.
- **Count deletions against goal** — apagar conta como negativo, sem passar de zero.
- **Start new writing sessions each day** — sessão nova a cada dia. **Start new writing session** abre uma na hora.
- **Reading words per minute** — só para a estimativa de quem vai ler, não para o que você produziu hoje.

No painel:

- **Session goal** — barra da sessão na unidade escolhida.
- **Set project goal** — meta do livro, separada do dia. O formato é quantidade, unidade e data opcional, por exemplo `80000 words 2027-06-01`. Oitenta mil palavras do romance não competem com a crônica de quinta. O comando é **Set project goal**.
- **Sprint** — 5, 10 ou 25 minutos, ou **Start a writing sprint** com outro número. **Stop the writing sprint** encerra. Não há ranking.
- **Calendar** — dias em que houve texto. Uma pausa é um quadrado vazio. O painel mostra a sequência recente e a mais longa já feita. A pausa não apaga a mais longa.
- **Counts** — palavras do manuscrito. Pesquisa não entra. Contagem de projeto, rascunho e cena também aparece na barra de status, se **Show word counts in status bar** estiver ligado.
- **Reading time** — minutos para ler a página aberta ou a seleção.

## Oficina

Aba **Workshop**. Uma rodada tem cópia congelada, papéis e conversa sobre um trecho. O manuscrito de trabalho continua editável. A cópia da rodada não.

- **Open a workshop round** abre a rodada.
- **Roles** — coautor, editor, beta e leitura de sensibilidade. Cada papel vê e mexe no que lhe cabe.
- **View as** — ver a rodada com o alcance daquele papel.
- **Conversation on the passage** — **Comment on a workshop passage**.
- **Suggestions** — **Suggest a workshop change**. Aceitar aplica. Recusar guarda.
- **Questions for the betas** — perguntas que a rodada faz, sem entregar a resposta pronta.
- **Where reading cooled** — onde a leitura esfriou.
- **Reading swap** — fila de troca: quem lê quem, por gênero.

Fechar a rodada não apaga o que foi dito. A cópia congelada continua abrível.

## Saída

Aba **Output**. Manuscrito de editora e livro para ler são saídas diferentes. Poesia, conto e crônica guardam a forma.

- **Book opening** — páginas de abertura, dedicatória, epígrafe (**Edit book opening**).
- **Between scenes** — o que separa uma cena da outra no livro para ler.
- **Formats** — Markdown e os outros formatos instalados (**Export as Markdown**, **Export in a format**).
- **Install publisher and reading workflows** — instala a saída de editora e a saída de leitura.
- **Page as it will print** — mancha, quebra de página e, no poema, a quebra de verso (**Page as it will print**).
- **Import** — pasta Markdown (**Import Markdown folder**), DOCX (**Import DOCX**) e projeto Scrivener (**Import Scrivener project**). A importação cria notas. Não reescreve o que você já tem.

A aba **Compile** é o fluxo antigo de passos: escolha o workflow e compile o projeto aberto (**Compile current project with current workflow**) ou escolha projeto e workflow (**Compile project…**). Passos de script do usuário vêm da pasta configurada em Settings. Um erro de script aparece no console de desenvolvimento, não dentro do manuscrito.

## Vida literária

Aba **Life**. O rascunho continua. O que foi enviado fica congelado.

- **Venues** — revista, concurso, editora, agente, coluna. Dá para marcar se o veículo aceita envio simultâneo e por quantos dias pede exclusividade.
- **Submissions** — **Prepare a submission** gera a cópia congelada da peça. Enviar, marcar como em leitura, aceito, recusado ou publicado não altera o manuscrito de trabalho. Cada conto ou poema guarda os próprios envios.
- **Deadlines** — prazos de concurso e de exclusividade.
- **Contracts** — **Record a contract**: com quem, valor, quando.
- **Cover and EPUB** — **Build cover and EPUB** monta a edição ao lado do manuscrito. A capa é um arquivo. O corpo é a lista de notas que entram.

## Confiança, língua e acervo

Aba **Archive**.

- **Search** — busca no projeto.
- **Back up this project** — cópia do projeto.
- **Export this project** — leva os arquivos embora. O autor não fica preso ao plugin.
- **Encrypt a copy** e **Decrypt a copy** — uma cópia cifrada. O manuscrito aberto não é cifrado no lugar.
- **Book dictionary** — **Add this word to the book** ensina uma palavra ao dicionário deste livro (nome, lugar, invenção). **Count syllables** conta as sílabas portuguesas da seleção ou da página.
- **Announce this page** — leitura de tela da página.
- **Ask about this passage** — uma pergunta sobre o trecho. A resposta não entra na prosa.
- **Suggestions** — sugestões ficam desligadas até você ligar em Settings. O endereço, o modelo e a chave ficam nas configurações. A chave não é escrita no manuscrito.

## O que não entra no livro

Isto fica fora da compilação, de propósito:

- Pesquisa e inbox.
- Comentário de margem e `TK`.
- Cena cortada, variante e apêndice.
- Cópia congelada de oficina ou de envio.
- Propostas recusadas e versões nomeadas. Elas existem para voltar, não para ir ao prelo.

## Propriedades

Quase tudo o que o painel grava é uma propriedade ao lado do bloco `longform`, no índice ou na cena. **Hide note properties** só esconde esse bloco na tela. Apagar a propriedade na nota apaga o dado.

Não edite o bloco `longform` para mudar ordem de cenas, papel ou forma. Use as abas. Se precisar inspecionar, as propriedades continuam no arquivo com o arquivo em modo fonte, ou com **Hide note properties** desligado.

## Um dia de trabalho

1. Abra o painel e o projeto.
2. Se a frase ainda não tem cena, guarde em **Capture**.
3. Escreva na cena. Se for poema, forma **Verse**. Se for coluna, forma **Column**.
4. A meta do dia está em **Habit**. A meta do livro também, separada.
5. Corte com **Revision** aberto, para a frase boa não se perder.
6. Na hora de sair: **Output** para o arquivo, **Life** para o envio, **Archive** para a cópia que você leva embora.
