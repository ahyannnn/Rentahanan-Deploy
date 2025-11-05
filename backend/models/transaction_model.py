from extensions import db 

class Transaction(db.Model):
    __tablename__ = "Transactions"  # ✅ matches your database table
    transactionid = db.Column(db.Integer, primary_key=True)
    billid = db.Column(db.Integer, db.ForeignKey('Bills.billid'))
    tenantid = db.Column(db.Integer, db.ForeignKey('Tenants.tenantid'))
    paymentdate = db.Column(db.String(100))
    amountpaid = db.Column(db.String(100))
    receipt = db.Column(db.String(500))

    def to_dict(self):
        return {
            "id": self.tenantid,
            "userid": self.userid,
            "applicationid": self.applicationid,
        }