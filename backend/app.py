from flask import Flask, jsonify, request, session
from flask_cors import CORS
from datetime import timedelta
from database import db, configurar_base_datos
from routes.auth import auth_bp
from routes.usuarios import usuarios_bp
from routes.libros import libros_bp
from routes.busqueda import busqueda_bp
from routes.ejemplares import ejemplares_bp
from routes.categorias import categorias_bp
from routes.admin import admin_bp
from routes.prestamos import prestamos_bp 

def crear_app():
    app = Flask(__name__)
    
    # CONFIGURACIÓN MEJORADA DE SESIONES - CRÍTICA
    app.config.update(
        SECRET_KEY='clave_secreta_biblioteca_nur_2025',
        SESSION_COOKIE_NAME='biblioteca_nur_session',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=False,  # False en desarrollo
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_DOMAIN=None,
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        SESSION_REFRESH_EACH_REQUEST=True
    )
    
    # CONFIGURACIÓN CORS MÁS PERMISIVA
    CORS(app, 
         supports_credentials=True,
         origins=["http://localhost:3000", "http://127.0.0.1:3000"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         expose_headers=["Content-Type"],
         allow_credentials=True
    )
    
    configurar_base_datos(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(libros_bp)
    app.register_blueprint(busqueda_bp)
    app.register_blueprint(ejemplares_bp)
    app.register_blueprint(categorias_bp, url_prefix='/api')
    app.register_blueprint(admin_bp)
    app.register_blueprint(prestamos_bp)
    
    # MIDDLEWARE MEJORADO
    @app.before_request
    def log_session_info():
        if 'api' in request.path:
            print(f"🔐 [SESSION] {request.method} {request.path}")
            print(f"🔐 [SESSION] Usuario ID: {session.get('usuario_id')}")
            print(f"🔐 [SESSION] Usuario Rol: {session.get('usuario_rol')}")
            print(f"🔐 [SESSION] Autenticado: {'usuario_id' in session}")
            print(f"🔐 [SESSION] Cookies recibidas: {list(request.cookies.keys())}")
            print(f"🔐 [SESSION] Origin: {request.headers.get('Origin')}")

    
    # Endpoints de debug mejorados
    @app.route('/api/debug', methods=['GET'])
    def debug_completo():
        return jsonify({
            'session': dict(session),
            'cookies_recibidas': dict(request.cookies),
            'headers_origin': request.headers.get('Origin'),
            'user_agent': request.headers.get('User-Agent')
        }), 200

    return app

if __name__ == '__main__':
    app = crear_app()
    app.run(debug=True, port=5000, host='0.0.0.0')