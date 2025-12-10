from flask import Blueprint, request, jsonify
from database import db
from models import Categoria

categorias_bp = Blueprint('categorias', __name__)

@categorias_bp.route('/categorias', methods=['GET'])
def obtener_categorias():
    categorias = Categoria.query.all()
    return jsonify([{'id': cat.id, 'nombre': cat.nombre} for cat in categorias])

@categorias_bp.route('/categorias', methods=['POST'])
def crear_categoria():
    datos = request.get_json()
    
    if not datos or not datos.get('nombre'):
        return jsonify({'mensaje': 'El nombre de la categoría es requerido'}), 400
    
    # Verificar si ya existe
    categoria_existente = Categoria.query.filter_by(nombre=datos['nombre']).first()
    if categoria_existente:
        return jsonify({'mensaje': 'La categoría ya existe'}), 400
    
    nueva_categoria = Categoria(nombre=datos['nombre'])
    db.session.add(nueva_categoria)
    db.session.commit()
    
    return jsonify({'mensaje': 'Categoría creada exitosamente', 'categoria': {'id': nueva_categoria.id, 'nombre': nueva_categoria.nombre}}), 201

@categorias_bp.route('/categorias/<int:id>', methods=['DELETE'])
def eliminar_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    
    # Verificar si hay libros usando esta categoría
    if categoria.libros:
        return jsonify({'mensaje': 'No se puede eliminar la categoría porque tiene libros asociados'}), 400
    
    db.session.delete(categoria)
    db.session.commit()
    
    return jsonify({'mensaje': 'Categoría eliminada exitosamente'})