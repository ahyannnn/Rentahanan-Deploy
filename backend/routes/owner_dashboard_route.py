from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from models.users_model import User
from models.units_model import House as Unit
from models.contracts_model import Contract
from models.bills_model import Bill
from models.transaction_model import Transaction
from models.applications_model import Application
from extensions import db
from models.tenants_model import Tenant

owner_dashboard_bp = Blueprint('owner_dashboard_bp', __name__)

@owner_dashboard_bp.route('/owner/dashboard', methods=['GET'])
def get_owner_dashboard():
    try:
        # Get active tenants with their details
        tenants = (
            db.session.query(
                Application.applicationid,
                User.userid,
                User.firstname,
                User.middlename,
                User.lastname,
                User.email,
                User.phone,
                User.dateofbirth,
                User.street,
                User.barangay,
                User.city,
                User.province,
                User.zipcode,
                User.image,
                Unit.name.label("unit_name"),
                Unit.price.label("unit_price"),
                Application.valid_id,
                Application.brgy_clearance,
                Application.proof_of_income
            )
            .join(Tenant, Tenant.userid == User.userid)
            .join(Contract, Contract.tenantid == Tenant.tenantid)
            .join(Unit, Unit.unitid == Contract.unitid)
            .join(Application, Application.applicationid == Tenant.applicationid)
            .filter(Contract.status == "Active")
            .all()
        )

        tenants_data = [
            {
                "applicationid": tenant.applicationid,
                "userid": tenant.userid,
                "fullname": f"{tenant.firstname} {tenant.middlename + ' ' if tenant.middlename else ''}{tenant.lastname}",
                "email": tenant.email,
                "phone": tenant.phone,
                "dateofbirth": tenant.dateofbirth.strftime("%Y-%m-%d") if tenant.dateofbirth else None,
                "address": f"{tenant.street}, {tenant.barangay}, {tenant.city}, {tenant.province}, {tenant.zipcode}",
                "image": tenant.image,
                "unit_name": tenant.unit_name,
                "unit_price": float(tenant.unit_price) if tenant.unit_price else 0,
                "valid_id": tenant.valid_id,
                "brgy_clearance": tenant.brgy_clearance,
                "proof_of_income": tenant.proof_of_income,
            }
            for tenant in tenants
        ]

        # Get all houses/properties for this owner
        houses = Unit.query.all()
        
        properties_data = []
        for house in houses:
            # Check if property is occupied
            active_contract = Contract.query.filter_by(
                unitid=house.unitid,
                status="Active"
            ).first()
            
            status = "Available"
            if active_contract:
                status = "Occupied"
            elif house.status == "Maintenance":
                status = "Maintenance"

            properties_data.append({
                "id": house.unitid,
                "name": house.name,
                "description": house.description,
                "rent": f"₱{house.price:,.2f}" if house.price else "₱0.00",
                "status": status,
                "original_status": house.status
            })

        # FIXED: Get recent transactions with proper Bill join
        transactions = (
            db.session.query(
                Transaction.transactionid,
                Transaction.billid,
                Transaction.tenantid,
                Transaction.paymentdate,
                Transaction.amountpaid,
                Transaction.receipt,
                User.firstname,
                User.lastname,
                Bill.billtype,
                Unit.name.label("unit_name")
            )
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .join(Contract, Contract.tenantid == Tenant.tenantid)
            .join(Unit, Unit.unitid == Contract.unitid)
            .order_by(Transaction.paymentdate.desc())
            .limit(10)
            .all()
        )

        transactions_data = []
        for t in transactions:
            transactions_data.append({
                "transactionid": t.transactionid,
                "billid": t.billid,
                "tenantid": t.tenantid,
                "tenant_name": f"{t.firstname} {t.lastname}",
                "payment_date": t.paymentdate.strftime("%Y-%m-%d") if t.paymentdate else None,
                "amount_paid": float(t.amountpaid) if t.amountpaid else 0,
                "receipt": t.receipt,
                "bill_type": t.billtype,
                "unit_name": t.unit_name
            })

        # Get pending applications for this owner's properties
        applicants = (
            db.session.query(
                Application.applicationid,
                User.firstname,
                User.middlename,
                User.lastname,
                User.email,
                User.phone,
                User.dateofbirth,
                User.street,
                User.barangay,
                User.image,
                User.city,
                User.province,
                User.zipcode,
                Unit.name.label("unit_name"),
                Application.valid_id,
                Application.brgy_clearance,
                Application.proof_of_income,
                Application.status.label("application_status")
            )
            .join(User, Application.userid == User.userid)
            .join(Unit, Unit.unitid == Application.unitid)
            .filter(Application.status == "Pending")
            .all()
        )

        applicants_data = []
        for a in applicants:
            applicants_data.append({
                "applicationid": a.applicationid,
                "fullname": f"{a.firstname} {a.middlename + ' ' if a.middlename else ''}{a.lastname}",
                "email": a.email,
                "phone": a.phone,
                "image": a.image,
                "dateofbirth": a.dateofbirth.strftime("%Y-%m-%d") if a.dateofbirth else None,
                "address": f"{a.street}, {a.barangay}, {a.city}, {a.province}, {a.zipcode}",
                "unit_name": a.unit_name,
                "valid_id": a.valid_id,
                "brgy_clearance": a.brgy_clearance,
                "proof_of_income": a.proof_of_income,
                "application_status": a.application_status
            })

        # Calculate dashboard statistics
        total_properties = len(houses)
        active_tenants_count = len(tenants)
        pending_applications_count = len(applicants_data)
        vacant_properties = total_properties - active_tenants_count

        # FIXED: Calculate current month revenue - use direct database query
        today = datetime.now()
        current_month = today.strftime('%Y-%m')
        
        # Query transactions for current month directly from database
        current_month_transactions = (
            db.session.query(Transaction)
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(Contract, Contract.tenantid == Tenant.tenantid)
            .join(Unit, Unit.unitid == Contract.unitid)
            .filter(
                db.func.strftime('%Y-%m', Transaction.paymentdate) == current_month,
                Bill.billtype == 'Rent'  # Only count rent payments
            )
            .all()
        )
        
        current_month_revenue = sum(float(t.amountpaid) for t in current_month_transactions if t.amountpaid)

        # FIXED: Calculate YTD revenue - use direct database query
        current_year = today.strftime('%Y')
        ytd_transactions = (
            db.session.query(Transaction)
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(Contract, Contract.tenantid == Tenant.tenantid)
            .join(Unit, Unit.unitid == Contract.unitid)
            .filter(
                db.func.strftime('%Y', Transaction.paymentdate) == current_year,
                Bill.billtype == 'Rent'  # Only count rent payments
            )
            .all()
        )
        
        ytd_revenue = sum(float(t.amountpaid) for t in ytd_transactions if t.amountpaid)

        # FIXED: Get financial data for chart (last 6 months) - use direct database queries
        financial_data = []
        for i in range(5, -1, -1):  # Last 6 months in correct order
            month_date = today - timedelta(days=30*i)
            month_key = month_date.strftime('%Y-%m')
            month_name = month_date.strftime('%b')
            
            # Query monthly revenue directly from database
            monthly_transactions = (
                db.session.query(Transaction)
                .join(Bill, Transaction.billid == Bill.billid)
                .join(Tenant, Transaction.tenantid == Tenant.tenantid)
                .join(Contract, Contract.tenantid == Tenant.tenantid)
                .join(Unit, Unit.unitid == Contract.unitid)
                .filter(
                    db.func.strftime('%Y-%m', Transaction.paymentdate) == month_key,
                    Bill.billtype == 'Rent'  # Only count rent payments
                )
                .all()
            )
            
            monthly_revenue = sum(float(t.amountpaid) for t in monthly_transactions if t.amountpaid)

            financial_data.append({
                "month": month_name,
                "amount": f"₱{monthly_revenue:,.0f}",
                "value": monthly_revenue
            })

        # Calculate average monthly revenue (last 6 months)
        recent_months_revenue = [data['value'] for data in financial_data]
        average_monthly_revenue = sum(recent_months_revenue) / len(recent_months_revenue) if recent_months_revenue else 0

        dashboard_stats = {
            "totalProperties": total_properties,
            "activeTenants": active_tenants_count,
            "monthlyRevenue": current_month_revenue,
            "ytdRevenue": ytd_revenue,
            "averageMonthlyRevenue": average_monthly_revenue,
            "pendingApplications": pending_applications_count,
            "vacantProperties": vacant_properties
        }

        # Prepare recent activity (last 5 transactions)
        recent_activity = transactions_data[:5]

        return jsonify({
            "success": True,
            "propertiesData": properties_data,
            "tenantsData": tenants_data,
            "financialData": financial_data,
            "transactionsData": transactions_data,
            "applicantsData": applicants_data,
            "dashboardStats": dashboard_stats,
            "recentActivity": recent_activity
        })

    except Exception as e:
        print(f"=== ERROR in owner dashboard route ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@owner_dashboard_bp.route('/owner/quick-stats', methods=['GET'])
def get_owner_quick_stats():
    """Endpoint for quick stats that can be refreshed frequently"""
    try:
        # Get owner's properties
        properties = Unit.query.all()
        property_ids = [p.unitid for p in properties]

        # Count active tenants
        active_tenants = Contract.query.filter(
            Contract.unitid.in_(property_ids),
            Contract.status == "Active"
        ).count()

        # Count pending applications
        pending_applications = Application.query.filter(
            Application.unitid.in_(property_ids),
            Application.status == "Pending"
        ).count()

        # Count vacant properties
        vacant_properties = len(properties) - active_tenants

        # Calculate pending payments (unpaid bills for owner's properties)
        pending_payments = Bill.query.filter(
            Bill.unitid.in_(property_ids),
            Bill.status.in_(["Unpaid", "Overdue"])
        ).count()

        return jsonify({
            "activeTenants": active_tenants,
            "pendingApplications": pending_applications,
            "vacantProperties": vacant_properties,
            "pendingPayments": pending_payments
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500