from extensions import db

class Contract(db.Model):
    __tablename__ = "Contracts"  # ✅ matches your database table
    contractid = db.Column(db.Integer, primary_key=True)
    tenantid = db.Column(db.Integer, db.ForeignKey('Tenants.tenantid'))
    unitid = db.Column(db.Integer, db.ForeignKey('Units.unitid'))
    startdate = db.Column(db.String(50))
    enddate = db.Column(db.String(50))
    status = db.Column(db.String(50))
    generated_contract = db.Column(db.String(500))
    signed_contract = db.Column(db.String(500))

    def to_dict(self):
        return {
            "contractid": self.contractid,
            "tenantid": self.tenantid,
            "unitid": self.unitid,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "rent_amount": self.rent_amount,
            "status": self.status,
            "generated_contract": self.generated_contract,
            "signed_contract": self.signed_contract
        }