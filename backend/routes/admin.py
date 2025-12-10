# backend/routes/admin.py
from flask import Blueprint, jsonify, session
from models import Reserva, Usuario, Libro, Prestamo, Ejemplar
from database import db
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

# Middleware para verificar si es administrador
def es_administrador():
    if session.get('usuario_rol') != 'administrador':
        print(f"❌ [ADMIN] Acceso denegado - Rol actual: {session.get('usuario_rol')}")
        return False
    return True

# 1. Obtener todas las reservas del sistema
# En la función obtener_todas_reservas():
@admin_bp.route('/api/admin/reservas', methods=['GET'])
def obtener_todas_reservas():
    print(f"🔍 [ADMIN] Obteniendo todas las reservas")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        # Consulta corregida para usar tu estructura exacta
        reservas = Reserva.query.join(
            Usuario, Reserva.usuario_id == Usuario.id
        ).join(
            Libro, Reserva.libro_id == Libro.id
        ).add_columns(
            Reserva.id,
            Reserva.estado,
            Reserva.fecha_reserva,
            Reserva.fecha_disponible,  # ← NUEVO: Incluir esta columna
            Usuario.nombre.label('usuario_nombre'),
            Usuario.correo.label('usuario_email'),
            Usuario.matricula.label('usuario_matricula'),  # ← ÚTIL para identificar
            Libro.titulo.label('libro_titulo'),
            Libro.autor.label('libro_autor'),
            Libro.categoria.label('libro_categoria')
        ).order_by(Reserva.fecha_reserva.desc()).all()
        
        resultado = []
        for reserva in reservas:
            resultado.append({
                'id': reserva.id,
                'estado': reserva.estado,
                'fecha_reserva': reserva.fecha_reserva.isoformat() if reserva.fecha_reserva else None,
                'fecha_disponible': reserva.fecha_disponible.isoformat() if reserva.fecha_disponible else None,
                'usuario_nombre': reserva.usuario_nombre,
                'usuario_email': reserva.usuario_email,
                'usuario_matricula': reserva.usuario_matricula,  # ← NUEVO
                'libro_titulo': reserva.libro_titulo,
                'libro_autor': reserva.libro_autor,
                'libro_categoria': reserva.libro_categoria
            })
        
        print(f"✅ [ADMIN] {len(reservas)} reservas encontradas")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500


        
# 2. Marcar reserva como disponible para recoger
@admin_bp.route('/api/admin/reservas/<int:reserva_id>/disponible', methods=['PUT'])
def marcar_reserva_disponible(reserva_id):
    print(f"🔍 [ADMIN] Marcando reserva {reserva_id} como disponible")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        reserva = Reserva.query.get(reserva_id)
        if not reserva:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        
        if reserva.estado != 'pendiente':
            return jsonify({'mensaje': 'Solo se pueden marcar como disponibles reservas pendientes'}), 400
        
        reserva.estado = 'disponible'
        db.session.commit()
        
        print(f"✅ [ADMIN] Reserva {reserva_id} marcada como disponible")
        return jsonify({'mensaje': 'Reserva marcada como disponible para recoger'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# 3. Cancelar reserva (admin)
@admin_bp.route('/api/admin/reservas/<int:reserva_id>', methods=['DELETE'])
def cancelar_reserva_admin(reserva_id):
    print(f"🔍 [ADMIN] Cancelando reserva {reserva_id}")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        reserva = Reserva.query.get(reserva_id)
        if not reserva:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        
        if reserva.estado not in ['pendiente', 'disponible']:
            return jsonify({'mensaje': 'No se puede cancelar una reserva en este estado'}), 400
        
        reserva.estado = 'cancelada'
        db.session.commit()
        
        print(f"✅ [ADMIN] Reserva {reserva_id} cancelada")
        return jsonify({'mensaje': 'Reserva cancelada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# 4. Eliminar reserva permanentemente
@admin_bp.route('/api/admin/reservas/<int:reserva_id>/permanente', methods=['DELETE'])
def eliminar_reserva_permanente(reserva_id):
    print(f"🔍 [ADMIN] Eliminando reserva {reserva_id} permanentemente")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        reserva = Reserva.query.get(reserva_id)
        if not reserva:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        
        if reserva.estado not in ['cancelada', 'expirada']:
            return jsonify({'mensaje': 'Solo se pueden eliminar reservas canceladas o expiradas'}), 400
        
        db.session.delete(reserva)
        db.session.commit()
        
        print(f"✅ [ADMIN] Reserva {reserva_id} eliminada permanentemente")
        return jsonify({'mensaje': 'Reserva eliminada permanentemente del sistema'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# 5. Obtener estadísticas de reservas
@admin_bp.route('/api/admin/reservas/estadisticas', methods=['GET'])
def obtener_estadisticas_reservas():
    print(f"🔍 [ADMIN] Obteniendo estadísticas de reservas")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        # Contar por estado
        estadisticas = db.session.query(
            Reserva.estado,
            db.func.count(Reserva.id).label('cantidad')
        ).group_by(Reserva.estado).all()
        
        total = db.session.query(db.func.count(Reserva.id)).scalar()
        
        resultado = {
            'estadisticas': [
                {'estado': estado, 'cantidad': cantidad}
                for estado, cantidad in estadisticas
            ],
            'total': total
        }
        
        print(f"✅ [ADMIN] Estadísticas obtenidas")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500
    
# Agregar después de las otras rutas de admin

@admin_bp.route('/api/admin/prestamos', methods=['GET'])
def obtener_todos_prestamos():
    print(f"🔍 [ADMIN PRESTAMOS] === INICIO ===")
    print(f"🔍 [ADMIN PRESTAMOS] Sesión: {dict(session)}")
    print(f"🔍 [ADMIN PRESTAMOS] Rol: {session.get('usuario_rol')}")
    
    if not es_administrador():
        print(f"❌ [ADMIN PRESTAMOS] Acceso denegado")
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        print(f"🔍 [ADMIN PRESTAMOS] Consultando base de datos...")
        
        # Primero, verificar que los modelos existen
        print(f"🔍 [ADMIN PRESTAMOS] Conteo de préstamos: {Prestamo.query.count()}")
        
        # Consulta con joins
        prestamos = Prestamo.query.join(
            Ejemplar, Prestamo.ejemplar_id == Ejemplar.id
        ).join(
            Libro, Ejemplar.libro_id == Libro.id
        ).join(
            Usuario, Prestamo.usuario_id == Usuario.id
        ).add_columns(
            Prestamo.id,
            Prestamo.estado,
            Prestamo.fecha_inicio,
            Prestamo.fecha_fin,
            Prestamo.fecha_devolucion,
            Prestamo.renovaciones,
            Usuario.nombre.label('usuario_nombre'),
            Usuario.correo.label('usuario_email'),
            Usuario.matricula.label('usuario_matricula'),
            Libro.titulo.label('libro_titulo'),
            Libro.autor.label('libro_autor'),
            Ejemplar.codigo_unico.label('ejemplar_codigo')
        ).order_by(Prestamo.fecha_inicio.desc()).all()
        
        print(f"✅ [ADMIN PRESTAMOS] {len(prestamos)} préstamos encontrados")
        
        # Debug: mostrar primeros 3 préstamos
        for i, prestamo in enumerate(prestamos[:3]):
            print(f"🔍 [ADMIN PRESTAMOS] Préstamo {i+1}: ID={prestamo.id}, Usuario={prestamo.usuario_nombre}")
        
        resultado = []
        for prestamo in prestamos:
            # Calcular días restantes
            dias_restantes = 0
            if prestamo.estado == 'activo' and prestamo.fecha_fin:
                fecha_fin = prestamo.fecha_fin
                hoy = datetime.utcnow()
                dias_restantes = max(0, (fecha_fin - hoy).days)
            
            resultado.append({
                'id': prestamo.id,
                'estado': prestamo.estado,
                'fecha_inicio': prestamo.fecha_inicio.isoformat() if prestamo.fecha_inicio else None,
                'fecha_fin': prestamo.fecha_fin.isoformat() if prestamo.fecha_fin else None,
                'fecha_devolucion': prestamo.fecha_devolucion.isoformat() if prestamo.fecha_devolucion else None,
                'renovaciones': prestamo.renovaciones,
                'usuario_nombre': prestamo.usuario_nombre,
                'usuario_email': prestamo.usuario_email,
                'usuario_matricula': prestamo.usuario_matricula,
                'libro_titulo': prestamo.libro_titulo,
                'libro_autor': prestamo.libro_autor,
                'ejemplar_codigo': prestamo.ejemplar_codigo,
                'dias_restantes': dias_restantes,
                'vencido': prestamo.estado == 'activo' and dias_restantes == 0 and prestamo.fecha_fin
            })
        
        print(f"✅ [ADMIN PRESTAMOS] Respuesta preparada con {len(resultado)} items")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ [ADMIN PRESTAMOS] Error crítico: {str(e)}")
        import traceback
        print(f"❌ [ADMIN PRESTAMOS] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# 7. Administrador puede forzar devolución de préstamo
@admin_bp.route('/api/admin/prestamos/<int:prestamo_id>/devolver', methods=['POST'])
def forzar_devolucion_prestamo(prestamo_id):
    print(f"🔍 [ADMIN] Forzando devolución de préstamo {prestamo_id}")
    
    if not es_administrador():
        return jsonify({'mensaje': 'Acceso denegado'}), 403
    
    try:
        prestamo = Prestamo.query.get(prestamo_id)
        if not prestamo:
            return jsonify({'mensaje': 'Préstamo no encontrado'}), 404
        
        if prestamo.estado != 'activo':
            return jsonify({'mensaje': 'El préstamo ya ha sido devuelto'}), 400
        
        # Buscar el ejemplar
        ejemplar = Ejemplar.query.get(prestamo.ejemplar_id)
        if not ejemplar:
            return jsonify({'mensaje': 'Ejemplar no encontrado'}), 404
        
        # Actualizar estados
        prestamo.estado = 'devuelto'
        prestamo.fecha_devolucion = datetime.utcnow()
        ejemplar.estado = 'disponible'
        
        db.session.commit()
        
        print(f"✅ [ADMIN] Préstamo {prestamo_id} devuelto forzosamente")
        return jsonify({
            'mensaje': 'Préstamo devuelto exitosamente',
            'prestamo_id': prestamo_id,
            'ejemplar_disponible': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [ADMIN] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500