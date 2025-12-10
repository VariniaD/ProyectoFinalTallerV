from datetime import datetime
from database import db

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(100), unique=True, nullable=False)
    matricula = db.Column(db.String(20), unique=True, nullable=False)
    contrasena = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='estudiante')
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    activo = db.Column(db.Boolean, default=True)
    
    prestamos = db.relationship('Prestamo', backref='usuario', lazy=True)
    reservas = db.relationship('Reserva', backref='usuario', lazy=True)

class Libro(db.Model):
    __tablename__ = 'libros'
    
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    autor = db.Column(db.String(100), nullable=False)
    editorial = db.Column(db.String(100))
    isbn = db.Column(db.String(20), unique=True)
    año = db.Column(db.Integer)
    categoria = db.Column(db.String(50))
    palabras_clave = db.Column(db.Text)

    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'))
    
    ejemplares = db.relationship('Ejemplar', backref='libro', lazy=True)
    reservas = db.relationship('Reserva', backref='libro', lazy=True)

class Ejemplar(db.Model):
    __tablename__ = 'ejemplares'
    
    id = db.Column(db.Integer, primary_key=True)
    libro_id = db.Column(db.Integer, db.ForeignKey('libros.id'), nullable=False)
    codigo_unico = db.Column(db.String(50), unique=True, nullable=False)
    estado = db.Column(db.String(20), default='disponible')
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    prestamos = db.relationship('Prestamo', backref='ejemplar', lazy=True)

class Prestamo(db.Model):
    __tablename__ = 'prestamos'
    
    id = db.Column(db.Integer, primary_key=True)
    ejemplar_id = db.Column(db.Integer, db.ForeignKey('ejemplares.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha_inicio = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_fin = db.Column(db.DateTime, nullable=False)
    fecha_devolucion = db.Column(db.DateTime)
    estado = db.Column(db.String(20), default='activo')
    renovaciones = db.Column(db.Integer, default=0)

class Reserva(db.Model):
    __tablename__ = 'reservas'
    
    id = db.Column(db.Integer, primary_key=True)
    libro_id = db.Column(db.Integer, db.ForeignKey('libros.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha_reserva = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default='pendiente')
    fecha_disponible = db.Column(db.DateTime)

class Categoria(db.Model):
    __tablename__ = 'categorias'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    libros = db.relationship('Libro', backref='categoria_rel', lazy=True)
