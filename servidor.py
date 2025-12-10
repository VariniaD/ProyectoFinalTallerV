import http.server
import socketserver
import webbrowser
import os

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers para CORS
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

# Cambiar al directorio del frontend
frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
os.chdir(frontend_dir)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"🚀 Servidor frontend ejecutándose en: http://localhost:{PORT}")
    print("📖 Abriendo en el navegador...")
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")