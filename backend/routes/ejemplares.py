from flask import Blueprint, request, jsonify, session
from models import Ejemplar, Libro
from database import db
import random
import string

ejemplares_bp = Blueprint('ejemplares', __name__)

def generar_codigo_unico():
    """Generar un código único para el ejemplar"""
    letras = ''.join(random.choices(string.ascii_uppercase, k=3))
    numeros = ''.join(random.choices(string.digits, k=3))
    return f"{letras}-{numeros}"

@ejemplares_bp.route('/api/libros/<int:libro_id>/ejemplares', methods=['POST'])
def agregar_ejemplares(libro_id):
    print(f"🔍 [DEBUG EJEMPLARES] Agregando ejemplares - Sesión: {dict(session)}")
    print(f"🔍 [DEBUG EJEMPLARES] Rol en sesión: {session.get('usuario_rol')}")
    
    if session.get('usuario_rol') not in ['administrador', 'bibliotecario']:
        print(f"❌ [DEBUG EJEMPLARES] Acceso denegado - Rol actual: {session.get('usuario_rol')}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        libro = Libro.query.get(libro_id)
        if not libro:
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        datos = request.json
        cantidad = datos.get('cantidad', 1)
        
        if cantidad < 1 or cantidad > 100:
            return jsonify({'mensaje': 'La cantidad debe estar entre 1 y 100'}), 400
        
        ejemplares_creados = 0
        for i in range(cantidad):
            # Generar código único y verificar que no exista
            while True:
                codigo_unico = generar_codigo_unico()
                codigo_existente = Ejemplar.query.filter_by(codigo_unico=codigo_unico).first()
                if not codigo_existente:
                    break
            
            nuevo_ejemplar = Ejemplar(
                libro_id=libro_id,
                codigo_unico=codigo_unico,
                estado='disponible'
            )
            
            db.session.add(nuevo_ejemplar)
            ejemplares_creados += 1
        
        db.session.commit()
        
        print(f"✅ [DEBUG EJEMPLARES] {ejemplares_creados} ejemplar(es) agregado(s) exitosamente al libro {libro_id}")
        return jsonify({
            'mensaje': f'{ejemplares_creados} ejemplar(es) agregado(s) exitosamente',
            'ejemplares_creados': ejemplares_creados
        }), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG EJEMPLARES] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500