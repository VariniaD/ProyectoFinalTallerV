from flask import Blueprint, request, jsonify, session
from models import Libro, Ejemplar, Categoria
from database import db

libros_bp = Blueprint('libros', __name__)

@libros_bp.route('/api/libros', methods=['GET'])
def obtener_libros():
    try:
        libros = Libro.query.all()
        resultado = []
        for libro in libros:
            ejemplares_disponibles = Ejemplar.query.filter_by(libro_id=libro.id, estado='disponible').count()
            
            # ✅ ACTUALIZADO: Manejar categoría de ambas formas
            categoria_nombre = libro.categoria_rel.nombre if libro.categoria_rel else libro.categoria
            
            resultado.append({
                'id': libro.id,
                'titulo': libro.titulo,
                'autor': libro.autor,
                'editorial': libro.editorial,
                'isbn': libro.isbn,
                'año': libro.año,
                'categoria': categoria_nombre,
                'categoria_id': libro.categoria_id,
                'palabras_clave': libro.palabras_clave,
                'ejemplares_disponibles': ejemplares_disponibles
            })
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@libros_bp.route('/api/libros/<int:libro_id>', methods=['GET'])
def obtener_libro(libro_id):
    try:
        libro = Libro.query.get(libro_id)
        if not libro:
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        ejemplares_disponibles = Ejemplar.query.filter_by(libro_id=libro.id, estado='disponible').count()
        ejemplares_totales = Ejemplar.query.filter_by(libro_id=libro.id).count()
        
        # ✅ ACTUALIZADO: Manejar categoría de ambas formas
        categoria_nombre = libro.categoria_rel.nombre if libro.categoria_rel else libro.categoria
        
        return jsonify({
            'id': libro.id,
            'titulo': libro.titulo,
            'autor': libro.autor,
            'editorial': libro.editorial,
            'isbn': libro.isbn,
            'año': libro.año,
            'categoria': categoria_nombre,
            'categoria_id': libro.categoria_id,
            'palabras_clave': libro.palabras_clave,
            'ejemplares_disponibles': ejemplares_disponibles,
            'ejemplares_totales': ejemplares_totales
        }), 200
    
    except Exception as e:
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@libros_bp.route('/api/libros', methods=['POST'])
def crear_libro():
    print(f"🔍 [DEBUG LIBROS] Creando libro - Sesión: {dict(session)}")
    print(f"🔍 [DEBUG LIBROS] Rol en sesión: {session.get('usuario_rol')}")
    print(f"🔍 [DEBUG LIBROS] Datos recibidos: {request.json}")
    
    if session.get('usuario_rol') not in ['administrador', 'bibliotecario']:
        print(f"❌ [DEBUG LIBROS] Acceso denegado - Rol actual: {session.get('usuario_rol')}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        datos = request.json
        if not datos.get('titulo') or not datos.get('autor'):
            return jsonify({'mensaje': 'Título y autor son requeridos'}), 400
        
        if datos.get('isbn'):
            isbn_existente = Libro.query.filter_by(isbn=datos['isbn']).first()
            if isbn_existente:
                return jsonify({'mensaje': 'El ISBN ya existe en otro libro'}), 400
        
        # ✅ NUEVO: Manejo de categorías
        categoria_id = datos.get('categoria_id')
        categoria_nombre = datos.get('categoria')
        
        # Si viene categoria_id, validar que existe
        if categoria_id:
            categoria = Categoria.query.get(categoria_id)
            if not categoria:
                return jsonify({'mensaje': 'La categoría especificada no existe'}), 400
            categoria_nombre_final = categoria.nombre
        # Si viene nombre de categoría, buscar o crear
        elif categoria_nombre:
            categoria = Categoria.query.filter_by(nombre=categoria_nombre).first()
            if not categoria:
                categoria = Categoria(nombre=categoria_nombre)
                db.session.add(categoria)
                db.session.flush()  # Para obtener el ID sin commit
            categoria_id = categoria.id
            categoria_nombre_final = categoria_nombre
        else:
            categoria_id = None
            categoria_nombre_final = None
        
        nuevo_libro = Libro(
            titulo=datos['titulo'],
            autor=datos['autor'],
            editorial=datos.get('editorial'),
            isbn=datos.get('isbn'),
            año=datos.get('año'),
            categoria=categoria_nombre_final,  # Mantener por compatibilidad
            categoria_id=categoria_id,         # Nueva relación
            palabras_clave=datos.get('palabras_clave')
        )
        
        db.session.add(nuevo_libro)
        db.session.commit()
        
        print(f"✅ [DEBUG LIBROS] Libro creado exitosamente - ID: {nuevo_libro.id}")
        return jsonify({
            'mensaje': 'Libro creado exitosamente', 
            'id': nuevo_libro.id,
            'categoria_id': nuevo_libro.categoria_id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG LIBROS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@libros_bp.route('/api/libros/<int:libro_id>', methods=['PUT'])
def actualizar_libro(libro_id):
    print(f"🔍 [DEBUG LIBROS] Actualizando libro {libro_id}")
    print(f"🔍 [DEBUG LIBROS] Sesión: {dict(session)}")
    print(f"🔍 [DEBUG LIBROS] Rol en sesión: {session.get('usuario_rol')}")
    print(f"🔍 [DEBUG LIBROS] Datos recibidos: {request.json}")
    
    if session.get('usuario_rol') not in ['administrador', 'bibliotecario']:
        print(f"❌ [DEBUG LIBROS] Acceso denegado - Rol actual: {session.get('usuario_rol')}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        libro = Libro.query.get(libro_id)
        if not libro:
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        datos = request.json
        
        # ✅ ACTUALIZADO: Manejo de categorías
        if 'categoria_id' in datos:
            categoria = Categoria.query.get(datos['categoria_id'])
            if not categoria:
                return jsonify({'mensaje': 'La categoría especificada no existe'}), 400
            libro.categoria_id = datos['categoria_id']
            libro.categoria = categoria.nombre  # Actualizar también el campo texto
        
        elif 'categoria' in datos:
            categoria_nombre = datos['categoria']
            categoria = Categoria.query.filter_by(nombre=categoria_nombre).first()
            if not categoria:
                categoria = Categoria(nombre=categoria_nombre)
                db.session.add(categoria)
                db.session.flush()
            libro.categoria_id = categoria.id
            libro.categoria = categoria_nombre
        
        # Campos básicos
        if 'titulo' in datos:
            libro.titulo = datos['titulo']
        if 'autor' in datos:
            libro.autor = datos['autor']
        if 'editorial' in datos:
            libro.editorial = datos['editorial']
        if 'isbn' in datos:
            isbn_existente = Libro.query.filter(Libro.isbn == datos['isbn'], Libro.id != libro_id).first()
            if isbn_existente:
                return jsonify({'mensaje': 'El ISBN ya está en uso por otro libro'}), 400
            libro.isbn = datos['isbn']
        if 'año' in datos:
            libro.año = datos['año']
        if 'palabras_clave' in datos:
            libro.palabras_clave = datos['palabras_clave']
        
        db.session.commit()
        print(f"✅ [DEBUG LIBROS] Libro {libro_id} actualizado exitosamente")
        return jsonify({'mensaje': 'Libro actualizado exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG LIBROS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

@libros_bp.route('/api/libros/<int:libro_id>', methods=['DELETE'])
def eliminar_libro(libro_id):
    print(f"🔍 [DEBUG LIBROS] Eliminando libro {libro_id}")
    print(f"🔍 [DEBUG LIBROS] Sesión: {dict(session)}")
    print(f"🔍 [DEBUG LIBROS] Rol en sesión: {session.get('usuario_rol')}")
    
    if session.get('usuario_rol') not in ['administrador', 'bibliotecario']:
        print(f"❌ [DEBUG LIBROS] Acceso denegado - Rol actual: {session.get('usuario_rol')}")
        return jsonify({'mensaje': 'No autorizado'}), 403
    
    try:
        libro = Libro.query.get(libro_id)
        if not libro:
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        ejemplares = Ejemplar.query.filter_by(libro_id=libro_id).count()
        if ejemplares > 0:
            return jsonify({'mensaje': 'No se puede eliminar el libro porque tiene ejemplares asociados'}), 400
        
        db.session.delete(libro)
        db.session.commit()
        print(f"✅ [DEBUG LIBROS] Libro {libro_id} eliminado exitosamente")
        return jsonify({'mensaje': 'Libro eliminado exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEBUG LIBROS] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500