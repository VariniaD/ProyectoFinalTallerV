from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:root@localhost:5433/biblioteca_nur'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'clave_secreta_biblioteca_nur'

def configurar_base_datos(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:root@localhost:5433/biblioteca_nur'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        inicializar_datos()

def inicializar_datos():
    """Inicializar datos por defecto"""
    from models import Usuario, Libro
    from werkzeug.security import generate_password_hash
    
    # Verificar y crear administrador si no existe
    admin = Usuario.query.filter_by(correo='administrador99@nur.edu').first()
    if not admin:
        admin = Usuario(
            nombre='Administrador99',
            correo='administrador99@nur.edu',
            matricula='ADMIN001',
            contrasena=generate_password_hash('root'),
            rol='administrador'
        )
        db.session.add(admin)
        
        # Agregar libros de ejemplo si no existen
        if Libro.query.count() == 0:
            libros_ejemplo = [
                Libro(
                    titulo='Cien Años de Soledad',
                    autor='Gabriel García Márquez',
                    editorial='Editorial Sudamericana',
                    isbn='978-8437604947',
                    año=1967,
                    categoria='Literatura',
                    palabras_clave='realismo mágico, literatura latinoamericana'
                ),
                Libro(
                    titulo='El Principito',
                    autor='Antoine de Saint-Exupéry',
                    editorial='Reynal & Hitchcock',
                    isbn='978-0156012195',
                    año=1943,
                    categoria='Literatura Infantil',
                    palabras_clave='fábula, filosofía, amistad'
                ),
                Libro(
                    titulo='Introducción a la Programación',
                    autor='Carlos Martínez',
                    editorial='Editorial Técnica',
                    isbn='978-8499642015',
                    año=2020,
                    categoria='Informática',
                    palabras_clave='programación, algoritmos, python'
                ),
                Libro(
                    titulo='Historia de Bolivia',
                    autor='María Luisa Soux',
                    editorial='Plural Editores',
                    isbn='978-9995412345',
                    año=2018,
                    categoria='Historia',
                    palabras_clave='Bolivia, historia, América Latina'
                ),
                Libro(
                    titulo='Matemáticas Avanzadas',
                    autor='Roberto Gómez',
                    editorial='Editorial Académica',
                    isbn='978-9561423567',
                    año=2019,
                    categoria='Matemáticas',
                    palabras_clave='cálculo, álgebra, matemáticas superiores'
                )
            ]
            
            for libro in libros_ejemplo:
                db.session.add(libro)
        
        db.session.commit()
        print("✓ Base de datos inicializada correctamente")