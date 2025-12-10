from flask import Blueprint, request, jsonify, session
from models import Usuario
from werkzeug.security import generate_password_hash, check_password_hash
from database import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def inicio():
    return jsonify({'mensaje': 'Sistema de Biblioteca NUR - Backend funcionando'})

@auth_bp.route('/api/registro', methods=['POST'])
def registrar_usuario():
    try:
        datos = request.json
        if not datos.get('nombre') or not datos.get('correo') or not datos.get('matricula') or not datos.get('contrasena'):
            return jsonify({'mensaje': 'Todos los campos son requeridos'}), 400
        
        usuario_existente = Usuario.query.filter_by(correo=datos['correo']).first()
        if usuario_existente:
            return jsonify({'mensaje': 'El correo ya está registrado'}), 400
        
        matricula_existente = Usuario.query.filter_by(matricula=datos['matricula']).first()
        if matricula_existente:
            return jsonify({'mensaje': 'La matrícula ya está registrada'}), 400
        
        nuevo_usuario = Usuario(
            nombre=datos['nombre'],
            correo=datos['correo'],
            matricula=datos['matricula'],
            contrasena=generate_password_hash(datos['contrasena']),
            rol='estudiante'
        )
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        return jsonify({'mensaje': 'Usuario registrado exitosamente'}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@auth_bp.route('/api/login', methods=['POST'])
def login():
    try:
        datos = request.json
        if not datos.get('correo') or not datos.get('contrasena'):
            return jsonify({'mensaje': 'Correo y contraseña son requeridos'}), 400
        
        usuario = Usuario.query.filter_by(correo=datos['correo'], activo=True).first()
        
        if usuario and check_password_hash(usuario.contrasena, datos['contrasena']):
            # Establecer sesión
            session.permanent = True
            session['usuario_id'] = usuario.id
            session['usuario_rol'] = usuario.rol
            session.modified = True
            
            print(f"✅ [DEBUG AUTH] Login exitoso - Usuario: {usuario.nombre}, Rol: {usuario.rol}, ID: {usuario.id}")
            print(f"✅ [DEBUG AUTH] Sesión establecida: {dict(session)}")
            
            return jsonify({
                'mensaje': 'Login exitoso',
                'usuario': {
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'correo': usuario.correo,
                    'rol': usuario.rol,
                    'matricula': usuario.matricula
                }
            }), 200
        
        print(f"❌ [DEBUG AUTH] Credenciales incorrectas para: {datos['correo']}")
        return jsonify({'mensaje': 'Credenciales incorrectas'}), 401
    
    except Exception as e:
        print(f"❌ [DEBUG AUTH] Error en login: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    print(f"🔍 [DEBUG AUTH] Cerrando sesión - Sesión anterior: {dict(session)}")
    session.clear()
    return jsonify({'mensaje': 'Sesión cerrada'}), 200

@auth_bp.route('/api/sesion', methods=['GET'])
def verificar_sesion():
    print(f"🔍 [DEBUG AUTH] Verificando sesión: {dict(session)}")
    if 'usuario_id' in session:
        usuario = Usuario.query.get(session['usuario_id'])
        if usuario and usuario.activo:
            print(f"✅ [DEBUG AUTH] Sesión válida - Usuario: {usuario.nombre}, Rol: {usuario.rol}")
            return jsonify({
                'autenticado': True,
                'usuario': {
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'correo': usuario.correo,
                    'rol': usuario.rol,
                    'matricula': usuario.matricula
                }
            }), 200
    
    print(f"❌ [DEBUG AUTH] Sesión inválida o expirada")
    return jsonify({'autenticado': False}), 200

# Endpoint de debug adicional
@auth_bp.route('/api/debug-session', methods=['GET'])
def debug_session():
    return jsonify({
        'session_data': dict(session),
        'usuario_id': session.get('usuario_id'),
        'usuario_rol': session.get('usuario_rol'),
        'autenticado': 'usuario_id' in session,
        'cookies_recibidas': list(request.cookies.keys())
    }), 200