from flask import Blueprint, request, jsonify
import os
from extensions import db
from models.units_model import House
import requests

houses_bp = Blueprint("houses_bp", __name__)

def upload_to_cloudinary(file, folder_name):
    """Upload file to Cloudinary and return the URL"""
    if not file:
        return None
        
    try:
        # Make request to our own upload endpoint
        upload_response = requests.post(
            f"{request.url_root}api/upload",
            files={'file': file},
            data={'folder': folder_name}
        )
        
        if upload_response.status_code == 200:
            data = upload_response.json()
            return data['url']  # Return Cloudinary URL
        else:
            print(f"Upload failed: {upload_response.json()}")
            return None
            
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

@houses_bp.route("/add-houses", methods=["POST"])
def add_house():
    name = request.form.get("name")
    description = request.form.get("description", "")
    price = request.form.get("price")
    status = request.form.get("status", "Available")
    image = request.files.get("image")

    if not name or not price or not image:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Upload image to Cloudinary
        image_url = upload_to_cloudinary(image, "house_images")
        if not image_url:
            return jsonify({"error": "Failed to upload house image"}), 500

        # Create house record
        new_house = House(
            name=name,
            description=description,
            price=price,
            status=status,
            imagepath=image_url,  # Store Cloudinary URL
        )

        db.session.add(new_house)
        db.session.commit()

        return jsonify({
            "message": "Unit added successfully!",
            "house": {
                "unitid": new_house.unitid,
                "name": new_house.name,
                "description": new_house.description,
                "price": new_house.price,
                "status": new_house.status,
                "imagepath": new_house.imagepath
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print("Error adding house:", e)
        return jsonify({"error": "Failed to add unit", "details": str(e)}), 500

@houses_bp.route("/houses/<int:house_id>", methods=["PUT"])
def update_house(house_id):
    try:
        # Find the house to update
        house = House.query.get(house_id)
        if not house:
            return jsonify({"error": "House not found"}), 404

        # Get form data
        name = request.form.get("name")
        description = request.form.get("description", "")
        price = request.form.get("price")
        status = request.form.get("status", "Available")
        image = request.files.get("image")

        # Validate required fields
        if not name or not price:
            return jsonify({"error": "Name and price are required fields"}), 400

        # Handle image upload if a new image is provided
        if image:
            # Upload new image to Cloudinary
            image_url = upload_to_cloudinary(image, "house_images")
            if not image_url:
                return jsonify({"error": "Failed to upload house image"}), 500
            
            # Update image path in database (Cloudinary URL)
            house.imagepath = image_url

        # Update house record
        house.name = name
        house.description = description
        house.price = price
        house.status = status

        db.session.commit()

        return jsonify({
            "message": "Unit updated successfully!",
            "house": {
                "unitid": house.unitid,
                "name": house.name,
                "description": house.description,
                "price": house.price,
                "status": house.status,
                "imagepath": house.imagepath  # Cloudinary URL
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Error updating house:", e)
        return jsonify({"error": "Failed to update unit", "details": str(e)}), 500

@houses_bp.route("/houses/<int:house_id>", methods=["GET"])
def get_house(house_id):
    try:
        house = House.query.get(house_id)
        if not house:
            return jsonify({"error": "House not found"}), 404

        return jsonify({
            "unitid": house.unitid,
            "name": house.name,
            "description": house.description,
            "price": house.price,
            "status": house.status,
            "imagepath": house.imagepath  # Cloudinary URL
        }), 200

    except Exception as e:
        print("Error fetching house:", e)
        return jsonify({"error": "Failed to fetch house details"}), 500

@houses_bp.route("/houses", methods=["GET"])
def get_all_houses():
    try:
        houses = House.query.all()
        
        result = []
        for house in houses:
            result.append({
                "unitid": house.unitid,
                "name": house.name,
                "description": house.description,
                "price": float(house.price) if house.price else 0,
                "status": house.status,
                "imagepath": house.imagepath  # Cloudinary URL
            })

        return jsonify(result), 200

    except Exception as e:
        print("Error fetching houses:", e)
        return jsonify({"error": "Failed to fetch houses"}), 500

@houses_bp.route("/houses/<int:house_id>", methods=["DELETE"])
def delete_house(house_id):
    try:
        house = House.query.get(house_id)
        if not house:
            return jsonify({"error": "House not found"}), 404

        # With Cloudinary, we don't need to manually delete the image file
        # The image remains in Cloudinary for reference
        
        db.session.delete(house)
        db.session.commit()

        return jsonify({"message": "Unit deleted successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        print("Error deleting house:", e)
        return jsonify({"error": "Failed to delete unit", "details": str(e)}), 500

@houses_bp.route("/houses/status/<int:house_id>", methods=["PUT"])
def update_house_status(house_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        house = House.query.get(house_id)
        if not house:
            return jsonify({"error": "House not found"}), 404

        house.status = new_status
        db.session.commit()

        return jsonify({
            "message": "Unit status updated successfully!",
            "house": {
                "unitid": house.unitid,
                "name": house.name,
                "status": house.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Error updating house status:", e)
        return jsonify({"error": "Failed to update unit status"}), 500

@houses_bp.route("/houses/available", methods=["GET"])
def get_available_houses():
    try:
        houses = House.query.filter(House.status == "Available").all()
        
        result = []
        for house in houses:
            result.append({
                "unitid": house.unitid,
                "name": house.name,
                "description": house.description,
                "price": float(house.price) if house.price else 0,
                "status": house.status,
                "imagepath": house.imagepath  # Cloudinary URL
            })

        return jsonify(result), 200

    except Exception as e:
        print("Error fetching available houses:", e)
        return jsonify({"error": "Failed to fetch available houses"}), 500

@houses_bp.route("/houses/search", methods=["GET"])
def search_houses():
    try:
        name = request.args.get('name', '')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        status = request.args.get('status', '')

        query = House.query

        if name:
            query = query.filter(House.name.ilike(f'%{name}%'))
        if min_price is not None:
            query = query.filter(House.price >= min_price)
        if max_price is not None:
            query = query.filter(House.price <= max_price)
        if status:
            query = query.filter(House.status == status)

        houses = query.all()

        result = []
        for house in houses:
            result.append({
                "unitid": house.unitid,
                "name": house.name,
                "description": house.description,
                "price": float(house.price) if house.price else 0,
                "status": house.status,
                "imagepath": house.imagepath  # Cloudinary URL
            })

        return jsonify(result), 200

    except Exception as e:
        print("Error searching houses:", e)
        return jsonify({"error": "Failed to search houses"}), 500