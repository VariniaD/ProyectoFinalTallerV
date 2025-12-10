import os
import subprocess
import sys
import time
import threading

def ejecutar_backend():
    """Ejecutar el servidor backend"""
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    print("🚀 Iniciando backend en http://localhost:5000")
    subprocess.call([sys.executable, "app.py"])

def ejecutar_frontend():
    """Ejecutar el servidor frontend"""
    time.sleep(2)  # Esperar a que el backend inicie
    
    frontend_dir = os.path.join(os.path.dirname(__file__))
    os.chdir(frontend_dir)
    print("🌐 Iniciando frontend en http://localhost:3000")
    subprocess.call([sys.executable, "servidor.py"])

def main():
    print("=== 🏫 SISTEMA BIBLIOTECA NUR ===")
    print("Iniciando servidores...")
    
    # Crear hilos para ejecutar ambos servidores
    backend_thread = threading.Thread(target=ejecutar_backend)
    frontend_thread = threading.Thread(target=ejecutar_frontend)
    
    backend_thread.start()
    frontend_thread.start()
    
    try:
        backend_thread.join()
        frontend_thread.join()
    except KeyboardInterrupt:
        print("\n🛑 Sistema detenido")

if __name__ == "__main__":
    main()