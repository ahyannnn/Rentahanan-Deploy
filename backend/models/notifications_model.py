from extensions import db
from datetime import datetime, timedelta

def get_ph_time():
    """Get current time in Philippine Time (UTC+8)"""
    utc_now = datetime.utcnow()
    ph_time = utc_now + timedelta(hours=8)
    return ph_time

class Notification(db.Model):
    __tablename__ = "Notifications"
    notificationid = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    targetuserrole = db.Column(db.String(50), nullable=True)
    targetuserid = db.Column(db.Integer, nullable=True)
    isgroupnotification = db.Column(db.Boolean, default=False)
    recipientcount = db.Column(db.Integer, default=1)
    createdbyuserid = db.Column(db.Integer, nullable=True)
    creationdate = db.Column(db.DateTime, default=get_ph_time)  # ✅ Use our PH time function

    def to_dict(self):
        return {
            "notificationid": self.notificationid,
            "title": self.title,
            "message": self.message,
            "targetuserrole": self.targetuserrole,
            "targetuserid": self.targetuserid,
            "isgroupnotification": self.isgroupnotification,
            "recipientcount": self.recipientcount,
            "createdbyuserid": self.createdbyuserid,
            "creationdate": self.creationdate.isoformat() if self.creationdate else None
        }