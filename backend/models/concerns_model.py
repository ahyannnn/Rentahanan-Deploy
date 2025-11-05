from extensions import db
from datetime import datetime

class Concern(db.Model):
    __tablename__ = "Concerns"

    concernid = db.Column(db.Integer, primary_key=True)
    tenantid = db.Column(db.Integer, db.ForeignKey('Tenants.tenantid'), nullable=False)
    concerntype = db.Column(db.String(50), nullable=False)  # ✅ type of concern (e.g., Plumbing, Electrical)
    subject = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='Pending')
    tenantimage = db.Column(db.String(500))  # ✅ image uploaded by tenant (broken item)
    landlordimage = db.Column(db.String(500))  # ✅ image uploaded by landlord (fix proof)
    creationdate = db.Column(db.DateTime, default=datetime.utcnow)

    # Optional relationship to Tenant model
    tenant = db.relationship('Tenant', backref='concerns', lazy=True)

    def to_dict(self):
        return {
            'concernid': self.concernid,
            'tenantid': self.tenantid,
            'concerntype': self.concerntype,
            'subject': self.subject,
            'description': self.description,
            'status': self.status,
            'tenantimage': self.tenantimage,
            'landlordimage': self.landlordimage,
            'creationdate': self.creationdate.strftime('%Y-%m-%d %H:%M:%S')
        }
