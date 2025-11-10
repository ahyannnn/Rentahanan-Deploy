from flask import Blueprint, request, jsonify
from extensions import db
from models.notifications_model import Notification
from models.users_model import User
from models.tenants_model import Tenant

notification_bp = Blueprint('notification_bp', __name__)

# GET notifications for user - TANGGALIN ANG /api
@notification_bp.route('/notifications/<int:user_id>', methods=['GET'])
def get_user_notifications(user_id):
    try:
        # Get user to check their role
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        print(f"🔔 Fetching notifications for user {user_id} with role: {user.role}")

        # Query notifications based on user role and targeting
        if user.role == 'Owner':
            # For landlords: get notifications targeted to 'Owner' role OR specific to this landlord
            notifications = Notification.query.filter(
                (Notification.targetuserrole == 'Owner') | 
                (Notification.targetuserid == user_id)
            ).order_by(Notification.creationdate.desc()).all()
        else:
            # ✅ FIXED: For tenants: get notifications targeted to 'Tenant' role OR specific to this tenant
            notifications = Notification.query.filter(
                (Notification.targetuserrole == 'Tenant') | 
                (Notification.targetuserid == user_id)
            ).order_by(Notification.creationdate.desc()).all()
        
        print(f"🔔 Found {len(notifications)} notifications for user {user_id}")
        
        # Debug: Count notification types
        group_notifications = [n for n in notifications if n.isgroupnotification]
        individual_notifications = [n for n in notifications if not n.isgroupnotification]
        print(f"🔔 Group notifications: {len(group_notifications)}")
        print(f"🔔 Individual notifications: {len(individual_notifications)}")

        notifications_data = []
        for notification in notifications:
            notifications_data.append(notification.to_dict())  # ✅ Use model's to_dict method
        
        return jsonify({
            'success': True,
            'notifications': notifications_data
        })
        
    except Exception as e:
        print(f"❌ Error fetching notifications: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error fetching notifications: {str(e)}'
        }), 500

# GET notifications for user by role (alternative endpoint)
@notification_bp.route('/notifications/role/<string:user_role>', methods=['GET'])
def get_notifications_by_role(user_role):
    try:
        # Get notifications targeted to a specific role (useful for landlords)
        notifications = Notification.query.filter_by(
            targetuserrole=user_role
        ).order_by(Notification.creationdate.desc()).all()
        
        notifications_data = []
        for notification in notifications:
            notifications_data.append(notification.to_dict())  # ✅ Use model's to_dict method
        
        return jsonify({
            'success': True,
            'notifications': notifications_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching notifications: {str(e)}'
        }), 500

# DELETE notification - TANGGALIN ANG /api
@notification_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    try:
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"success": False, "message": "Notification not found"}), 404
        
        db.session.delete(notification)
        db.session.commit()
        return jsonify({"success": True, "message": "Notification deleted"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# MARK AS READ - TANGGALIN ANG /api
@notification_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_as_read(notification_id):
    try:
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"success": False, "message": "Notification not found"}), 404
        
        # Add your mark as read logic here
        # You might want to add an 'is_read' field to your Notification model
        # if notification.is_read is not None:
        #     notification.is_read = True
        #     db.session.commit()
        
        return jsonify({"success": True, "message": "Notification marked as read"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# GET notification statistics
@notification_bp.route('/notifications/stats/<int:user_id>', methods=['GET'])
def get_notification_stats(user_id):
    try:
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Count total notifications for this user
        if user.role == 'Owner':
            total_count = Notification.query.filter(
                (Notification.targetuserrole == 'Owner') | 
                (Notification.targetuserid == user_id)
            ).count()
        else:
            total_count = Notification.query.filter_by(
                targetuserid=user_id
            ).count()

        # Count unread notifications (if you implement read status)
        # unread_count = Notification.query.filter_by(
        #     targetuserid=user_id, is_read=False
        # ).count()

        return jsonify({
            'success': True,
            'stats': {
                'total_notifications': total_count,
                # 'unread_notifications': unread_count
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching notification stats: {str(e)}'
        }), 500

# CLEAR ALL notifications for user
@notification_bp.route('/notifications/clear-all/<int:user_id>', methods=['DELETE'])
def clear_all_notifications(user_id):
    try:
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Delete notifications based on user role
        if user.role == 'Owner':
            # For landlords: delete notifications targeted to them specifically
            # Note: We don't delete group notifications as they belong to all landlords
            deleted_count = Notification.query.filter_by(
                targetuserid=user_id
            ).delete()
        else:
            # For tenants: delete all their notifications
            deleted_count = Notification.query.filter_by(
                targetuserid=user_id
            ).delete()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully cleared {deleted_count} notifications'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error clearing notifications: {str(e)}'
        }), 500

# MARK ALL NOTIFICATIONS AS READ
@notification_bp.route('/notifications/<int:user_id>/mark-all-read', methods=['PUT'])
def mark_all_as_read(user_id):
    try:
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Update all unread notifications for this user
        if user.role == 'Owner':
            # For landlords: update notifications targeted to them specifically
            updated_count = Notification.query.filter_by(
                targetuserid=user_id
                # Add is_read condition when implemented: , is_read=False
            ).update({
                # 'is_read': True
                # Add update logic when is_read field is implemented
            })
        else:
            # For tenants: update all their notifications
            updated_count = Notification.query.filter_by(
                targetuserid=user_id
                # Add is_read condition when implemented: , is_read=False
            ).update({
                # 'is_read': True
                # Add update logic when is_read field is implemented
            })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Marked {updated_count} notifications as read"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# SEND NOTIFICATION (Owner to Tenants)
@notification_bp.route('/notifications/send', methods=['POST'])
def send_notification():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('message'):
            return jsonify({
                'success': False,
                'message': 'Title and message are required'
            }), 400
        
        title = data.get('title')
        message = data.get('message')
        priority = data.get('priority', 'medium')
        created_by_user_id = data.get('createdbyuserid')
        target_user_role = data.get('targetuserrole')
        target_user_id = data.get('targetuserid')
        is_group_notification = data.get('isgroupnotification', False)
        
        # Validate the sender exists and is an owner
        sender = User.query.filter_by(userid=created_by_user_id).first()
        if not sender or sender.role != 'Owner':
            return jsonify({
                'success': False,
                'message': 'Only owners can send notifications'
            }), 403
        
        recipient_count = 1  # Default for individual notifications
        
        # Handle group notifications (all tenants)
        if is_group_notification and target_user_role == 'Tenant':
            # Count all active tenants
            active_tenants_count = Tenant.query.filter_by(status='Active').count()
            recipient_count = active_tenants_count
            
            # Create the group notification
            new_notification = Notification(
                title=title,
                message=message,
                targetuserrole=target_user_role,
                targetuserid=None,  # No specific user for group notifications
                isgroupnotification=True,
                recipientcount=recipient_count,
                createdbyuserid=created_by_user_id
                # ✅ creationdate is automatically handled by the model
            )
            
            db.session.add(new_notification)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Notification sent to all {recipient_count} tenants',
                'notification_id': new_notification.notificationid
            })
        
        # Handle individual notifications (specific tenant)
        elif target_user_id:
            # Verify the target user exists and is a tenant
            target_user = User.query.filter_by(userid=target_user_id).first()
            if not target_user or target_user.role != 'Tenant':
                return jsonify({
                    'success': False,
                    'message': 'Target user must be a valid tenant'
                }), 400
            
            # Create the individual notification
            new_notification = Notification(
                title=title,
                message=message,
                targetuserrole=None,  # No role for individual notifications
                targetuserid=target_user_id,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=created_by_user_id
                # ✅ creationdate is automatically handled by the model
            )
            
            db.session.add(new_notification)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Notification sent to specific tenant',
                'notification_id': new_notification.notificationid
            })
        
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid notification target'
            }), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error sending notification: {str(e)}'
        }), 500

# GET ACTIVE TENANTS FOR NOTIFICATION SENDING
@notification_bp.route('/notifications/active-tenants', methods=['GET'])
def get_active_tenants():
    try:
        # Get all active tenants with their user information
        active_tenants = db.session.query(
            Tenant.tenantid,
            Tenant.userid,
            User.firstname,
            User.lastname,
            User.email
        ).join(
            User, Tenant.userid == User.userid
        ).filter(
            Tenant.status == 'Active'
        ).all()
        
        tenants_data = []
        for tenant in active_tenants:
            tenants_data.append({
                'tenantid': tenant.tenantid,
                'userid': tenant.userid,
                'fullname': f"{tenant.firstname} {tenant.lastname}",
                'email': tenant.email
            })
        
        return jsonify({
            'success': True,
            'tenants': tenants_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching active tenants: {str(e)}'
        }), 500

# GET NOTIFICATION TYPES/STATS FOR DASHBOARD
@notification_bp.route('/notifications/types-stats', methods=['GET'])
def get_notification_types_stats():
    try:
        # Get notification statistics by type
        stats = {
            'total': Notification.query.count(),
            'group_notifications': Notification.query.filter_by(isgroupnotification=True).count(),
            'individual_notifications': Notification.query.filter_by(isgroupnotification=False).count(),
            'tenant_notifications': Notification.query.filter_by(targetuserrole='Tenant').count(),
            'owner_notifications': Notification.query.filter_by(targetuserrole='Owner').count()
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching notification stats: {str(e)}'
        }), 500

# BULK SEND NOTIFICATIONS (Multiple tenants)
@notification_bp.route('/notifications/bulk-send', methods=['POST'])
def bulk_send_notifications():
    try:
        data = request.get_json()
        
        if not data.get('title') or not data.get('message') or not data.get('tenant_ids'):
            return jsonify({
                'success': False,
                'message': 'Title, message, and tenant IDs are required'
            }), 400
        
        title = data.get('title')
        message = data.get('message')
        priority = data.get('priority', 'medium')
        created_by_user_id = data.get('createdbyuserid')
        tenant_ids = data.get('tenant_ids', [])
        
        # Validate sender is owner
        sender = User.query.filter_by(userid=created_by_user_id).first()
        if not sender or sender.role != 'Owner':
            return jsonify({
                'success': False,
                'message': 'Only owners can send notifications'
            }), 403
        
        successful_sends = 0
        failed_sends = 0
        
        for tenant_id in tenant_ids:
            try:
                # Get tenant user ID
                tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
                if tenant:
                    user = User.query.filter_by(userid=tenant.userid).first()
                    if user and user.role == 'Tenant':
                        # Create individual notification
                        new_notification = Notification(
                            title=title,
                            message=message,
                            targetuserrole=None,
                            targetuserid=user.userid,
                            isgroupnotification=False,
                            recipientcount=1,
                            createdbyuserid=created_by_user_id
                            # ✅ creationdate is automatically handled by the model
                        )
                        db.session.add(new_notification)
                        successful_sends += 1
                    else:
                        failed_sends += 1
                else:
                    failed_sends += 1
            except Exception:
                failed_sends += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully sent {successful_sends} notifications, {failed_sends} failed',
            'successful_sends': successful_sends,
            'failed_sends': failed_sends
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error in bulk send: {str(e)}'
        }), 500