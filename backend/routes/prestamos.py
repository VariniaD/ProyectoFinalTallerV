# backend/routes/prestamos.py (versión corregida)
from flask import Blueprint, request, jsonify, session
from models import Prestamo, Ejemplar, Libro, Usuario, Reserva
from database import db
from datetime import datetime, timedelta
import traceback

prestamos_bp = Blueprint('prestamos', __name__)

# Obtener préstamos del usuario actual
@prestamos_bp.route('/api/mis-prestamos', methods=['GET'])
def obtener_mis_prestamos():
    print(f"🔍 [PRESTAMOS] Obteniendo préstamos ACTIVOS del usuario")
    print(f"🔍 [PRESTAMOS] Sesión usuario_id: {session.get('usuario_id')}")
    
    if 'usuario_id' not in session:
        print(f"❌ [PRESTAMOS] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        print(f"✅ [PRESTAMOS] Buscando préstamos ACTIVOS para usuario_id: {usuario_id}")
        
        # Verificar que el usuario existe
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            print(f"❌ [PRESTAMOS] Usuario {usuario_id} no encontrado en BD")
            return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
        # ✅ FILTRO CRÍTICO: Solo préstamos activos y no devueltos
        prestamos = Prestamo.query.filter_by(
            usuario_id=usuario_id,
            estado='activo'  # <-- SOLO ACTIVOS
        ).all()
        
        print(f"🔍 [PRESTAMOS] Préstamos ACTIVOS encontrados en BD: {len(prestamos)}")
        
        resultado = []
        for prestamo in prestamos:
            # Obtener información del ejemplar y libro
            ejemplar = Ejemplar.query.get(prestamo.ejemplar_id)
            libro = None
            if ejemplar:
                libro = Libro.query.get(ejemplar.libro_id)
            
            resultado.append({
                'id': prestamo.id,
                'libro_titulo': libro.titulo if libro else 'Libro no encontrado',
                'libro_autor': libro.autor if libro else 'Autor desconocido',
                'ejemplar_codigo': ejemplar.codigo_unico if ejemplar else 'N/A',
                'fecha_inicio': prestamo.fecha_inicio.isoformat() if prestamo.fecha_inicio else None,
                'fecha_fin': prestamo.fecha_fin.isoformat() if prestamo.fecha_fin else None,
                'fecha_devolucion': prestamo.fecha_devolucion.isoformat() if prestamo.fecha_devolucion else None,
                'estado': prestamo.estado,
                'renovaciones': prestamo.renovaciones,
                # Información adicional útil
                'libro_id': libro.id if libro else None,
                'ejemplar_id': prestamo.ejemplar_id
            })
        
        print(f"✅ [PRESTAMOS] {len(resultado)} préstamos ACTIVOS procesados")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ [PRESTAMOS] Error crítico: {str(e)}")
        print(f"❌ [PRESTAMOS] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500
    
    
# Solicitar nuevo préstamo - VERSIÓN SIMPLIFICADA PARA DEBUG
@prestamos_bp.route('/api/prestamos', methods=['POST'])
def crear_prestamo():
    print(f"🔍 [PRESTAMOS] === INICIO CREAR PRÉSTAMO ===")
    print(f"🔍 [PRESTAMOS] Sesión: {dict(session)}")
    print(f"🔍 [PRESTAMOS] Headers: {dict(request.headers)}")
    print(f"🔍 [PRESTAMOS] Datos recibidos: {request.json}")
    
    # VERIFICACIÓN DETALLADA DE AUTENTICACIÓN
    if 'usuario_id' not in session:
        print(f"❌ [PRESTAMOS] ERROR: No hay usuario_id en sesión")
        print(f"❌ [PRESTAMOS] Cookies recibidas: {request.cookies}")
        return jsonify({'mensaje': 'No autenticado. Por favor inicia sesión nuevamente.'}), 401
    
    usuario_id = session['usuario_id']
    print(f"✅ [PRESTAMOS] Usuario autenticado: ID {usuario_id}")
    
    try:
        datos = request.json
        if not datos:
            return jsonify({'mensaje': 'No se recibieron datos JSON'}), 400
        
        libro_id = datos.get('libro_id')
        duracion_dias = datos.get('duracion_dias', 7)
        
        print(f"🔍 [PRESTAMOS] Datos procesados - libro_id: {libro_id}, duracion: {duracion_dias}")
        
        if not libro_id:
            return jsonify({'mensaje': 'ID de libro requerido'}), 400
        
        # 1. Verificar que el libro existe
        libro = Libro.query.get(libro_id)
        if not libro:
            print(f"❌ [PRESTAMOS] Libro {libro_id} no encontrado")
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        print(f"✅ [PRESTAMOS] Libro encontrado: {libro.titulo}")
        
        # 2. Buscar un ejemplar disponible
        ejemplar_disponible = Ejemplar.query.filter_by(
            libro_id=libro_id,
            estado='disponible'
        ).first()
        
        if not ejemplar_disponible:
            print(f"❌ [PRESTAMOS] No hay ejemplares disponibles para libro {libro_id}")
            return jsonify({'mensaje': 'No hay ejemplares disponibles de este libro'}), 400
        
        print(f"✅ [PRESTAMOS] Ejemplar disponible encontrado: {ejemplar_disponible.codigo_unico}")
        
        # 3. Verificar si ya tiene este libro prestado
        prestamo_existente = Prestamo.query.join(
            Ejemplar, Prestamo.ejemplar_id == Ejemplar.id
        ).filter(
            Ejemplar.libro_id == libro_id,
            Prestamo.usuario_id == usuario_id,
            Prestamo.estado == 'activo'
        ).first()
        
        if prestamo_existente:
            print(f"❌ [PRESTAMOS] Usuario ya tiene este libro prestado")
            return jsonify({'mensaje': 'Ya tienes este libro en préstamo'}), 400
        
        # 4. Calcular fechas
        fecha_inicio = datetime.utcnow()
        fecha_fin = fecha_inicio + timedelta(days=duracion_dias)
        
        print(f"🔍 [PRESTAMOS] Fechas calculadas: inicio={fecha_inicio}, fin={fecha_fin}")
        
        # 5. Crear préstamo
        nuevo_prestamo = Prestamo(
            ejemplar_id=ejemplar_disponible.id,
            usuario_id=usuario_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado='activo',
            renovaciones=0
        )
        
        # 6. Actualizar estado del ejemplar
        ejemplar_disponible.estado = 'prestado'
        
        db.session.add(nuevo_prestamo)
        db.session.commit()
        
        print(f"✅ [PRESTAMOS] Préstamo creado exitosamente - ID: {nuevo_prestamo.id}")
        print(f"✅ [PRESTAMOS] Ejemplar {ejemplar_disponible.codigo_unico} marcado como prestado")
        
        return jsonify({
            'ok': True,
            'mensaje': f'Préstamo solicitado exitosamente para {duracion_dias} días',
            'prestamo_id': nuevo_prestamo.id,
            'fecha_devolucion': fecha_fin.isoformat(),
            'libro_titulo': libro.titulo
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [PRESTAMOS] Error en crear_prestamo: {str(e)}")
        print(f"❌ [PRESTAMOS] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# ========== RESERVAS DEL USUARIO ==========

@prestamos_bp.route('/api/mis-reservas', methods=['GET'])
def obtener_mis_reservas():
    print(f"🔍 [RESERVAS] Obteniendo reservas del usuario")
    print(f"🔍 [RESERVAS] Sesión usuario_id: {session.get('usuario_id')}")
    print(f"🔍 [RESERVAS] Sesión completa: {dict(session)}")
    
    if 'usuario_id' not in session:
        print(f"❌ [RESERVAS] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        print(f"✅ [RESERVAS] Buscando reservas para usuario_id: {usuario_id}")
        
        # Verificar que el usuario existe
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            print(f"❌ [RESERVAS] Usuario {usuario_id} no encontrado en BD")
            return jsonify({'mensaje': 'Usuario no encontrado'}), 404
        
        # Consulta para obtener reservas del usuario
        reservas = Reserva.query.filter_by(
            usuario_id=usuario_id
        ).join(
            Libro, Reserva.libro_id == Libro.id
        ).add_columns(
            Reserva.id,
            Reserva.estado,
            Reserva.fecha_reserva,
            Libro.titulo.label('libro_titulo'),
            Libro.autor.label('libro_autor')
        ).order_by(Reserva.fecha_reserva.desc()).all()
        
        print(f"🔍 [RESERVAS] Reservas encontradas (crudas): {len(reservas)}")
        
        resultado = []
        for reserva in reservas:
            resultado.append({
                'id': reserva.id,
                'libro_titulo': reserva.libro_titulo,
                'libro_autor': reserva.libro_autor,
                'fecha_reserva': reserva.fecha_reserva.isoformat() if reserva.fecha_reserva else None,
                'estado': reserva.estado
            })
        
        print(f"✅ [RESERVAS] {len(resultado)} reservas procesadas")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ [RESERVAS] Error crítico: {str(e)}")
        print(f"❌ [RESERVAS] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500


# ========== DEVOLVER PRÉSTAMO ==========

@prestamos_bp.route('/api/prestamos/<int:prestamo_id>/devolver', methods=['POST'])
def devolver_prestamo(prestamo_id):
    print(f"🔍 [DEVOLVER] Devolviendo préstamo ID: {prestamo_id}")
    
    if 'usuario_id' not in session:
        print(f"❌ [DEVOLVER] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        
        # 1. Buscar el préstamo
        prestamo = Prestamo.query.get(prestamo_id)
        if not prestamo:
            return jsonify({'mensaje': 'Préstamo no encontrado'}), 404
        
        # 2. Verificar que el préstamo pertenece al usuario
        if prestamo.usuario_id != usuario_id:
            return jsonify({'mensaje': 'No tienes permiso para devolver este préstamo'}), 403
        
        # 3. Verificar que el préstamo está activo
        if prestamo.estado != 'activo':
            return jsonify({'mensaje': 'Este préstamo ya ha sido devuelto'}), 400
        
        # 4. Buscar el ejemplar
        ejemplar = Ejemplar.query.get(prestamo.ejemplar_id)
        if not ejemplar:
            return jsonify({'mensaje': 'Ejemplar no encontrado'}), 404
        
        # 5. Actualizar estados
        prestamo.estado = 'devuelto'
        prestamo.fecha_devolucion = datetime.utcnow()
        ejemplar.estado = 'disponible'
        
        db.session.commit()
        
        print(f"✅ [DEVOLVER] Préstamo {prestamo_id} devuelto exitosamente")
        
        return jsonify({
            'ok': True,  # <-- IMPORTANTE para frontend
            'mensaje': 'Préstamo devuelto exitosamente',
            'prestamo_id': prestamo_id,
            'ejemplar_disponible': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [DEVOLVER] Error: {str(e)}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500

# ========== RENOVAR PRÉSTAMO ==========

@prestamos_bp.route('/api/prestamos/<int:prestamo_id>/renovar', methods=['POST'])
def renovar_prestamo(prestamo_id):
    print(f"🔍 [RENOVAR] Renovando préstamo ID: {prestamo_id}")
    print(f"🔍 [RENOVAR] Sesión: {dict(session)}")
    
    if 'usuario_id' not in session:
        print(f"❌ [RENOVAR] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        print(f"✅ [RENOVAR] Usuario ID: {usuario_id}")
        
        # 1. Buscar el préstamo
        prestamo = Prestamo.query.get(prestamo_id)
        if not prestamo:
            print(f"❌ [RENOVAR] Préstamo {prestamo_id} no encontrado")
            return jsonify({'mensaje': 'Préstamo no encontrado'}), 404
        
        print(f"✅ [RENOVAR] Préstamo encontrado: Usuario {prestamo.usuario_id}")
        
        # 2. Verificar que el préstamo pertenece al usuario
        if prestamo.usuario_id != usuario_id:
            print(f"❌ [RENOVAR] No autorizado - Préstamo pertenece a usuario {prestamo.usuario_id}")
            return jsonify({'mensaje': 'No tienes permiso para renovar este préstamo'}), 403
        
        # 3. Verificar que el préstamo está activo
        if prestamo.estado != 'activo':
            print(f"❌ [RENOVAR] Préstamo no está activo - Estado: {prestamo.estado}")
            return jsonify({'mensaje': 'No se puede renovar un préstamo que no está activo'}), 400
        
        # 4. Verificar límite de renovaciones (máximo 2 renovaciones)
        if prestamo.renovaciones >= 2:
            print(f"❌ [RENOVAR] Límite de renovaciones alcanzado: {prestamo.renovaciones}")
            return jsonify({'mensaje': 'Has alcanzado el límite máximo de renovaciones (2)'}), 400
        
        # 5. Calcular nueva fecha (extender 7 días más)
        nueva_fecha_fin = prestamo.fecha_fin + timedelta(days=7)
        
        # 6. Actualizar préstamo
        prestamo.fecha_fin = nueva_fecha_fin
        prestamo.renovaciones += 1
        
        db.session.commit()
        
        print(f"✅ [RENOVAR] Préstamo {prestamo_id} renovado exitosamente")
        print(f"✅ [RENOVAR] Nuevas renovaciones: {prestamo.renovaciones}")
        print(f"✅ [RENOVAR] Nueva fecha de devolución: {nueva_fecha_fin}")
        
        return jsonify({
            'mensaje': 'Préstamo renovado exitosamente por 7 días más',
            'prestamo_id': prestamo_id,
            'nueva_fecha_fin': nueva_fecha_fin.isoformat(),
            'renovaciones_restantes': 2 - prestamo.renovaciones
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [RENOVAR] Error: {str(e)}")
        print(f"❌ [RENOVAR] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500
    
# ========== CANCELAR RESERVA ==========

@prestamos_bp.route('/api/reservas/<int:reserva_id>', methods=['DELETE'])
def cancelar_reserva_usuario(reserva_id):
    print(f"🔍 [CANCELAR RESERVA] Cancelando reserva ID: {reserva_id}")
    print(f"🔍 [CANCELAR RESERVA] Sesión: {dict(session)}")
    
    if 'usuario_id' not in session:
        print(f"❌ [CANCELAR RESERVA] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        print(f"✅ [CANCELAR RESERVA] Usuario ID: {usuario_id}")
        
        # 1. Buscar la reserva
        reserva = Reserva.query.get(reserva_id)
        if not reserva:
            print(f"❌ [CANCELAR RESERVA] Reserva {reserva_id} no encontrada")
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        
        print(f"✅ [CANCELAR RESERVA] Reserva encontrada: Usuario {reserva.usuario_id}")
        
        # 2. Verificar que la reserva pertenece al usuario
        if reserva.usuario_id != usuario_id:
            print(f"❌ [CANCELAR RESERVA] No autorizado - Reserva pertenece a usuario {reserva.usuario_id}")
            return jsonify({'mensaje': 'No tienes permiso para cancelar esta reserva'}), 403
        
        # 3. Verificar que la reserva está pendiente
        if reserva.estado not in ['pendiente', 'disponible']:
            print(f"❌ [CANCELAR RESERVA] Reserva no cancelable - Estado: {reserva.estado}")
            return jsonify({'mensaje': 'Esta reserva no se puede cancelar'}), 400
        
        # 4. Cambiar estado a cancelada
        reserva.estado = 'cancelada'
        
        db.session.commit()
        
        print(f"✅ [CANCELAR RESERVA] Reserva {reserva_id} cancelada exitosamente")
        
        return jsonify({
            'mensaje': 'Reserva cancelada exitosamente',
            'reserva_id': reserva_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [CANCELAR RESERVA] Error: {str(e)}")
        print(f"❌ [CANCELAR RESERVA] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500
    
# Agregar esto en backend/routes/prestamos.py después de las otras rutas

@prestamos_bp.route('/api/reservas', methods=['POST'])
def crear_reserva():
    print(f"🔍 [CREAR RESERVA] === INICIO ===")
    print(f"🔍 [CREAR RESERVA] Sesión: {dict(session)}")
    print(f"🔍 [CREAR RESERVA] Datos recibidos: {request.json}")
    
    # Verificar autenticación
    if 'usuario_id' not in session:
        print(f"❌ [CREAR RESERVA] Usuario no autenticado")
        return jsonify({'mensaje': 'No autenticado'}), 401
    
    try:
        usuario_id = session['usuario_id']
        datos = request.json
        libro_id = datos.get('libro_id')
        
        if not libro_id:
            return jsonify({'mensaje': 'ID de libro requerido'}), 400
        
        # 1. Verificar que el libro existe
        libro = Libro.query.get(libro_id)
        if not libro:
            print(f"❌ [CREAR RESERVA] Libro {libro_id} no encontrado")
            return jsonify({'mensaje': 'Libro no encontrado'}), 404
        
        # 2. Verificar que NO hay ejemplares disponibles (reserva solo si no hay disponibilidad)
        ejemplares_disponibles = Ejemplar.query.filter_by(
            libro_id=libro_id,
            estado='disponible'
        ).count()
        
        if ejemplares_disponibles > 0:
            print(f"❌ [CREAR RESERVA] Hay ejemplares disponibles, no se puede reservar")
            return jsonify({'mensaje': 'No es necesario reservar, hay ejemplares disponibles'}), 400
        
        # 3. Verificar que el usuario no tiene ya una reserva activa para este libro
        reserva_existente = Reserva.query.filter_by(
            libro_id=libro_id,
            usuario_id=usuario_id,
            estado='pendiente'
        ).first()
        
        if reserva_existente:
            print(f"❌ [CREAR RESERVA] Usuario ya tiene una reserva pendiente para este libro")
            return jsonify({'mensaje': 'Ya tienes una reserva pendiente para este libro'}), 400
        
        # 4. Crear la reserva
        nueva_reserva = Reserva(
            libro_id=libro_id,
            usuario_id=usuario_id,
            estado='pendiente',
            fecha_reserva=datetime.utcnow()
        )
        
        db.session.add(nueva_reserva)
        db.session.commit()
        
        print(f"✅ [CREAR RESERVA] Reserva creada exitosamente - ID: {nueva_reserva.id}")
        
        return jsonify({
            'mensaje': 'Libro reservado exitosamente. Serás notificado cuando esté disponible.',
            'reserva_id': nueva_reserva.id,
            'libro_titulo': libro.titulo
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ [CREAR RESERVA] Error: {str(e)}")
        print(f"❌ [CREAR RESERVA] Traceback: {traceback.format_exc()}")
        return jsonify({'mensaje': f'Error en el servidor: {str(e)}'}), 500