# Testar o site no celular (rede local)

Você precisa de: computador e celular **no mesmo Wi-Fi**.

## Jeito mais fácil (1 clique)

1. Dê dois cliques em **`iniciar-rede-local.bat`**. Abre uma janela preta, e ela precisa ficar aberta.
2. A janela mostra endereços como `http://192.168.0.15:8000`.
3. No celular, abra o navegador e digite esse endereço. Se mostrar mais de um, tente um por vez.
4. Para parar, feche a janela preta.

Precisa de Python instalado. Se não tiver, o .bat avisa. Instale em python.org e marque **"Add python.exe to PATH"**.

## Se o celular não abrir (Firewall do Windows)

O motivo mais comum é o Firewall bloqueando. Resolva de um destes jeitos:

- Quando o Windows perguntar "Permitir acesso?", marque **Redes privadas** e confirme.
- Ou clique com o botão direito em **`liberar-firewall.bat`** > **Executar como administrador**. Isso é feito uma vez só.

## Alternativa: Live Server do VS Code

1. Abra a pasta `site` inteira no VS Code (File > Open Folder). A pasta `.vscode` já traz a configuração certa.
2. Feche e abra o Live Server de novo (Go Live).
3. No celular, abra `http://SEU-IP:5500`. Para descobrir o IP, abra o Prompt de Comando, digite `ipconfig` e olhe o "Endereço IPv4".

## Se ainda não funcionar

- Wi-Fi diferente? Computador no cabo e celular no Wi-Fi às vezes ficam em redes separadas, e Wi-Fi de visitantes isola os aparelhos.
- Rede configurada como **Pública** no Windows: mude para **Privada** (Configurações > Rede e Internet > Propriedades).
- VPN ligada no computador ou no celular: desligue para o teste.
- Antivírus com firewall próprio: libere as portas 8000 e 5500.
- A página abre, mas sem fotos: a pasta `img` precisa estar ao lado do `index.html`.
- Mudou algo e não apareceu: no celular, recarregue a página (o servidor já vem sem cache).

## Observação

Este modo é só para teste: só funciona para quem está no seu Wi-Fi e enquanto o computador estiver ligado com o servidor rodando.
