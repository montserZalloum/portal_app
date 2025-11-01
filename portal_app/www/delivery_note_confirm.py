import frappe


def get_context(context):
	"""
	Handle delivery note confirmation via email link.
	This page displays the result of the confirmation action.
	"""
	token = frappe.form_dict.get("token")
	delivery_note = frappe.form_dict.get("delivery_note")

	context.status = "error"
	context.message = "Invalid request"
	context.delivery_note = delivery_note

	try:
		if not token or not delivery_note:
			context.message = "Missing required parameters"
			return context

		# Validate that the delivery note exists
		if not frappe.db.exists("Delivery Note", delivery_note):
			context.message = "Delivery note not found"
			return context

		dn = frappe.get_doc("Delivery Note", delivery_note)

		# Validate token
		if dn.get("corex_deliverynote_confirmation_token_customer") != token:
			context.message = "Invalid confirmation token"
			return context

		if dn.get("corex_deliverynote_is_customer_confirmed_receipt"):
			context.status = "info"
			context.message = f"Delivery Note {delivery_note} was already confirmed."
			context.is_already_confirmed = True
			return context

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

		context.status = "success"
		context.message = f"Thank you! Delivery Note {delivery_note} has been confirmed."
		context.is_confirmed = True

	except Exception as e:
		frappe.logger().error(f"Error confirming delivery note: {str(e)}")
		context.status = "error"
		context.message = "An error occurred while confirming the delivery note. Please try again."

	return context
