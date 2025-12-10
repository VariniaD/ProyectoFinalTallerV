from flask import Blueprint, request, jsonify
from models import Libro, Ejemplar

busqueda_bp = Blueprint('busqueda', __name__)

@busqueda_bp.route('/api/buscar', methods=['GET'])
def buscar_libros():
    try:
        query = request.args.get('q', '')
        categoria = request.args.get('categoria', '')
        
        libros_query = Libro.query
        
        if query:
            libros_query = libros_query.filter(
                (Libro.titulo.ilike(f'%{query}%')) |
                (Libro.autor.ilike(f'%{query}%')) |
                (Libro.palabras_clave.ilike(f'%{query}%'))
            )
        
        if categoria:
            # Buscar por el campo 'categoria' (texto) O por la relación categoria_rel
            libros_query = libros_query.filter(
                (Libro.categoria.ilike(f'%{categoria}%')) |
                (Libro.categoria_rel.has(nombre=ilike(f'%{categoria}%')))
            )
        
        libros = libros_query.all()
        resultado = []
        
        for libro in libros:
            ejemplares_disponibles = Ejemplar.query.filter_by(
                libro_id=libro.id, 
                estado='disponible'
            ).count()
            
            # Obtener nombre de categoría
            categoria_nombre = libro.categoria_rel.nombre if libro.categoria_rel else libro.categoria
            
            resultado.append({
                'id': libro.id,
                'titulo': libro.titulo,
                'autor': libro.autor,
                'editorial': libro.editorial,
                'isbn': libro.isbn,
                'año': libro.año,
                'categoria': categoria_nombre,
                'ejemplares_disponibles': ejemplares_disponibles
            })
        
        return jsonify(resultado), 200
    
    except Exception as e:
        print(f"❌ Error en búsqueda: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500