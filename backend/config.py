class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:root@localhost:5433/biblioteca_nur'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'clave_secreta_biblioteca_nur'