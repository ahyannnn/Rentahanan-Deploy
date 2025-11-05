from extensions import db
from datetime import datetime

class Application(db.Model):
    __tablename__ = "Applications"

    applicationid = db.Column(db.Integer, primary_key=True)
    unitid = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), default="Registered")
    submissiondate = db.Column(db.DateTime, default=datetime.utcnow)
    userid = db.Column(db.Integer, db.ForeignKey("Users.userid", ondelete="CASCADE"), nullable=False)
    valid_id = db.Column(db.String(500), nullable=True)
    brgy_clearance = db.Column(db.String(500), nullable=True)
    proof_of_income = db.Column(db.String(500), nullable=True)

    user = db.relationship("User", backref=db.backref("Applications", lazy=True))

    def to_dict(self):
        return {
            "applicationid": self.applicationid,
            "unitid": self.unitid,
            "status": self.status,
            "submissiondate": self.submissiondate.strftime("%Y-%m-%d %H:%M:%S"),
            "userid": self.userid,
            "valid_id": self.valid_id,
            "brgy_clearance": self.brgy_clearance,
            "proof_of_income": self.proof_of_income
        }
