"""Servidor de teste para a rede local (Fermentados da Maurinha).

Uso: python servidor.py [porta]      (padrão: 8000)
Abra o endereço mostrado aqui no celular, com o celular no mesmo Wi-Fi.
"""
import http.server
import os
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    # Sem cache: toda alteração aparece ao recarregar a página no celular.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def ips():
    found = []
    try:  # IP da placa de rede em uso (não envia nenhum dado)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        found.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip not in found and not ip.startswith("127."):
                found.append(ip)
    except OSError:
        pass
    return found


if __name__ == "__main__":
    print("=" * 56)
    print(" Servidor de teste - Fermentados da Maurinha")
    print("=" * 56)
    print(" No computador:  http://localhost:%d" % PORT)
    print(" No celular (mesmo Wi-Fi), tente nesta ordem:")
    for ip in ips():
        print("                 http://%s:%d" % (ip, PORT))
    print()
    print(" Para parar: feche esta janela ou aperte Ctrl+C")
    print("=" * 56)
    try:
        http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
    except OSError as e:
        print("\nNão consegui abrir a porta %d: %s" % (PORT, e))
        print("Provavelmente já tem um servidor rodando. Feche-o ou use outra porta:")
        print("  python servidor.py 8001")
        input("\nAperte Enter para sair.")
    except KeyboardInterrupt:
        print("\nServidor parado.")
