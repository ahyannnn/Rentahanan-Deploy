from extensions import db
from werkzeug.security import check_password_hash, generate_password_hash

class User(db.Model):
    __tablename__ = "Users"

    userid = db.Column(db.Integer, primary_key=True)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    middlename = db.Column(db.String(1), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    dateofbirth = db.Column(db.Date, nullable=True)
    street = db.Column(db.String(100), nullable=True)
    barangay = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    province = db.Column(db.String(100), nullable=True)
    zipcode = db.Column(db.String(10), nullable=True)
    role = db.Column(db.String(20), nullable=False, default="Tenant")
    image = db.Column(db.String(500), nullable=True)
    datecreated = db.Column(db.DateTime, nullable=False)

    # Optional helper
    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
