import frappe
import secrets
from frappe.utils import get_url


def send_delivery_note_email_on_submit(doc, method):
	"""
	Send an email to the customer when a delivery note is submitted.
	Email includes 2 buttons:
	1. Confirm Delivery - to confirm receipt of delivery note
	2. View in Portal - to view the delivery note in customer portal
	"""
	if doc.docstatus != 1:  # Only send if submitted
		return

	# Get customer email from contact_email field
	customer_email = doc.get("contact_email")

	# Fallback: Try to get email from customer contact
	if not customer_email and doc.customer:
		try:
			customer_doc = frappe.get_doc("Customer", doc.customer)
			customer_email = customer_doc.email_id
		except:
			pass

	if not customer_email:
		frappe.logger().warn(f"No customer email found for delivery note {doc.name}")
		return

	# Generate confirmation token if not already present
	if not doc.get("corex_deliverynote_confirmation_token_customer"):
		token = secrets.token_urlsafe(32)
		doc.db_set("corex_deliverynote_confirmation_token_customer", token)
	else:
		token = doc.corex_deliverynote_confirmation_token_customer

	# Generate the button URLs
	confirm_url = get_url(f"/delivery_note_confirm?token={token}&delivery_note={doc.name}")
	portal_url = get_url(f"/delivery-note/{doc.name}")

	# Prepare HTML email content
	html_content = f"""
	<html>
		<head>
			<meta charset="utf-8">
			<style>
				body {{
					font-family: Arial, sans-serif;
					line-height: 1.6;
					color: #333;
				}}
				.container {{
					max-width: 600px;
					margin: 0 auto;
					padding: 20px;
					background-color: #f9f9f9;
					border: 1px solid #ddd;
					border-radius: 8px;
				}}
				.header {{
					background-color: #2c3e50;
					color: white;
					padding: 20px;
					border-radius: 8px 8px 0 0;
					text-align: center;
				}}
				.header h1 {{
					margin: 0;
					font-size: 24px;
				}}
				.content {{
					padding: 20px;
					background-color: white;
					border-radius: 0 0 8px 8px;
				}}
				.button {{
					display: inline-block;
					margin: 10px 10px 10px 0;
					padding: 12px 24px;
					text-decoration: none;
					border-radius: 4px;
					font-weight: bold;
					text-align: center;
					transition: opacity 0.3s;
				}}
				.button-primary {{
					background-color: #27ae60;
					color: white;
				}}
				.button-primary:hover {{
					opacity: 0.9;
				}}
				.button-secondary {{
					background-color: #3498db;
					color: white;
				}}
				.button-secondary:hover {{
					opacity: 0.9;
				}}
				.button-container {{
					margin: 30px 0;
					text-align: left;
				}}
				.footer {{
					padding: 20px;
					border-top: 1px solid #ddd;
					font-size: 12px;
					color: #666;
					text-align: center;
				}}
				.note {{
					background-color: #fff3cd;
					border: 1px solid #ffc107;
					padding: 10px;
					border-radius: 4px;
					margin: 20px 0;
					color: #856404;
				}}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Delivery Note Confirmation</h1>
				</div>
				<div class="content">
					<p>Dear {doc.customer_name},</p>
					<p>Thank you for your business! We have submitted your delivery note <strong>{doc.name}</strong>.</p>
					<p>Please confirm the receipt of your delivery by clicking the button below, or view more details in your customer portal.</p>

					<div class="button-container">
						<a href="{confirm_url}" class="button button-primary">✓ Confirm Delivery</a>
						<a href="{portal_url}" class="button button-secondary">📄 View Details</a>
					</div>

					<div class="note">
						<strong>Note:</strong> If you did not place this order or have any questions, please contact our support team.
					</div>
				</div>
				<div class="footer">
					<p>This is an automated email. Please do not reply to this message.</p>
				</div>
			</div>
		</body>
	</html>
	"""

	# Send email directly
	try:
		frappe.sendmail(
			recipients=[customer_email],
			subject=f"Delivery Note Confirmation - {doc.name}",
			message=html_content,
			reference_doctype=doc.doctype,
			reference_name=doc.name,
		)
		frappe.logger().info(f"Delivery note confirmation email sent to {customer_email} for {doc.name}")
	except Exception as e:
		frappe.logger().error(f"Failed to send delivery note confirmation email: {str(e)}")
		import traceback
		frappe.logger().error(traceback.format_exc())


@frappe.whitelist(allow_guest=True)
def confirm_delivery_note(token, delivery_note):
	"""
	API endpoint to confirm delivery note via email button.
	This endpoint should be accessible without authentication using the token.
	"""
	try:
		# Validate token
		dn = frappe.get_doc("Delivery Note", delivery_note)

		if dn.corex_deliverynote_confirmation_token_customer != token:
			frappe.throw("Invalid confirmation token", frappe.PermissionError)

		if dn.corex_deliverynote_is_customer_confirmed_receipt:
			return {
				"status": "success",
				"message": f"Delivery Note {delivery_note} was already confirmed."
			}

		# Update the delivery note
		dn.db_set("corex_deliverynote_is_customer_confirmed_receipt", 1)

		# Create a comment/activity to track the confirmation
		frappe.get_doc({
			"doctype": "Communication",
			"communication_type": "Comment",
			"reference_doctype": "Delivery Note",
			"reference_name": delivery_note,
			"content": "Customer confirmed receipt of delivery note via email link.",
			"user": "Administrator"
		}).insert(ignore_permissions=True)

		frappe.db.commit()

		return {
			"status": "success",
			"message": f"Delivery Note {delivery_note} has been confirmed. Thank you!"
		}
	except Exception as e:
		frappe.logger().error(f"Error confirming delivery note: {str(e)}")
		return {
			"status": "error",
			"message": "An error occurred while confirming the delivery note."
		}
