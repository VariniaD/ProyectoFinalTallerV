from flask import Blueprint, request, jsonify, session
from models import Usuario
from werkzeug.security import generate_password_hash
from database import db

usuarios_bp = Blueprint('usuarios', __name__)

@usuarios_bp.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    
    print(f"🔍 [DEBUG USUARIOS] === INICIO VERIFICACIÓN ===")
    print(f"🔍 [DEBUG USUARIOS] Sesión completa: {dict(session)}")
    print(f"🔍 [DEBUG USUARIOS] Headers de request: {dict(request.headers)}")
    print(f"🔍 [DEBUG USUARIOS] Cookies: {request.cookies}")
    print(f"🔍 [DEBUG USUARIOS] === INICIO OBTENER USUARIOS ===")
    print(f"🔍 [DEBUG USUARIOS] Sesión completa: {dict(session)}")
    print(f"🔍 [DEBUG USUARIOS] Usuario rol: {session.get('usuario_rol')}")
    
    # Verificar autenticación primero
    if 'usuario_id' not in session:
        print(f"❌ [DEBUG USUARIOS] USUARIO NO AUTENTICADO")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    # Verificar rol
    if session.get('usuario_rol') != 'administrador':
        print(f"❌ [DEBUG USUARIOS] ACCESO DENEGADO - Rol: {session.get('usuario_rol')}, ID: {session.get('usuario_id')}")
        return jsonify({'mensaje': 'Acceso denegado. Se requiere rol de administrador.'}), 403
    
    try:
        usuarios = Usuario.query.all()
        resultado = []
        for usuario in usuarios:
            resultado.append({
                'id': usuario.id,
                'nombre': usuario.nombre,
                'correo': usuario.correo,
                'matricula': usuario.matricula,
                'rol': usuario.rol,
                'fecha_creacion': usuario.fecha_creacion.isoformat(),
                'activo': usuario.activo
            })
        
        print(f"✅ [DEBUG USUARIOS] Usuarios obtenidos: {len(usuarios)}")
        return jsonify(resultado), 200
    
    except Exception as e:
        print(f"❌ [DEBUG USUARIOS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@usuarios_bp.route('/api/usuarios/<int:usuario_id>', methods=['GET'])
def obtener_usuario(usuario_id):
    print(f"🔍 [DEBUG USUARIOS] Obteniendo usuario {usuario_id}")
    print(f"🔍 [DEBUG USUARIOS] Sesión: {dict(session)}")
    
    if session.get('usuario_rol') != 'administrador' and session.get('usuario_id') != usuario_id:
        print(f"❌ [DEBUG USUARIOS] Acceso denegado para usuario {usuario_id}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'correo': usuario.correo,
            'matricula': usuario.matricula,
            'rol': usuario.rol,
            'fecha_creacion': usuario.fecha_creacion.isoformat(),
            'activo': usuario.activo
        }), 200
    
    except Exception as e:
        print(f"❌ [DEBUG USUARIOS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@usuarios_bp.route('/api/usuarios/<int:usuario_id>', methods=['PUT'])
def actualizar_usuario(usuario_id):
    print(f"🔍 [DEBUG USUARIOS] Actualizando usuario {usuario_id}")
    print(f"🔍 [DEBUG USUARIOS] Sesión: {dict(session)}")
    print(f"🔍 [DEBUG USUARIOS] Datos recibidos: {request.json}")
    
    if session.get('usuario_rol') != 'administrador' and session.get('usuario_id') != usuario_id:
        print(f"❌ [DEBUG USUARIOS] Acceso denegado para actualizar usuario {usuario_id}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
        datos = request.json
        
        if 'rol' in datos and session.get('usuario_rol') != 'administrador':
            return jsonify({'mensaje': 'No autorizado para cambiar roles'}), 403
        
        if 'nombre' in datos:
            usuario.nombre = datos['nombre']
        if 'correo' in datos:
            correo_existente = Usuario.query.filter(Usuario.correo == datos['correo'], Usuario.id != usuario_id).first()
            if correo_existente:
                return jsonify({'mensaje': 'El correo ya está en uso por otro usuario'}), 400
            usuario.correo = datos['correo']
        if 'matricula' in datos:
            matricula_existente = Usuario.query.filter(Usuario.matricula == datos['matricula'], Usuario.id != usuario_id).first()
            if matricula_existente:
                return jsonify({'mensaje': 'La matrícula ya está en uso por otro usuario'}), 400
            usuario.matricula = datos['matricula']
        if 'contrasena' in datos:
            usuario.contrasena = generate_password_hash(datos['contrasena'])
        if 'rol' in datos and session.get('usuario_rol') == 'administrador':
            usuario.rol = datos['rol']
        if 'activo' in datos and session.get('usuario_rol') == 'administrador':
            usuario.activo = datos['activo']
        
        db.session.commit()
        print(f"✅ [DEBUG USUARIOS] Usuario {usuario_id} actualizado exitosamente")
        return jsonify({'mensaje': 'Usuario actualizado exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG USUARIOS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@usuarios_bp.route('/api/usuarios/<int:usuario_id>', methods=['DELETE'])
def eliminar_usuario(usuario_id):
    print(f"🔍 [DEBUG USUARIOS] Eliminando usuario {usuario_id}")
    print(f"🔍 [DEBUG USUARIOS] Sesión: {dict(session)}")
    
    if session.get('usuario_rol') != 'administrador' and session.get('usuario_id') != usuario_id:
        print(f"❌ [DEBUG USUARIOS] Acceso denegado para eliminar usuario {usuario_id}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
        if session.get('usuario_id') == usuario_id and session.get('usuario_rol') == 'administrador':
            return jsonify({'mensaje': 'No puedes eliminar tu propia cuenta de administrador'}), 400
        
        db.session.delete(usuario)
        db.session.commit()
        
        if session.get('usuario_id') == usuario_id:
            session.clear()
        
        print(f"✅ [DEBUG USUARIOS] Usuario {usuario_id} eliminado exitosamente")
        return jsonify({'mensaje': 'Usuario eliminado exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG USUARIOS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500