from extensions import db

class House(db.Model):
    __tablename__ = "Units"  # ✅ matches your database table
    unitid = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    description = db.Column(db.Text)
    price = db.Column(db.Float)
    status = db.Column(db.String(50))
    imagepath = db.Column(db.String(500))

    def to_dict(self):
        return {
            "id": self.unitid,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "status": self.status,
            "imagepath": self.imagepath,
        }
