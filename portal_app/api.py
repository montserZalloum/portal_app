import frappe

@frappe.whitelist()
def get_quotation_items(quotation_id):
	"""Fetch items from a quotation document"""
	try:
		quotation = frappe.get_doc('Quotation', quotation_id)

		# Return items as a list of dictionaries
		items = []
		if hasattr(quotation, 'items') and quotation.items:
			for item in quotation.items:
				items.append({
					'item_code': item.item_code,
					'item_name': item.item_name,
					'description': item.description,
					'qty': item.qty,
					'uom': item.uom,
					'rate': item.rate,
					'amount': item.amount
				})

		return items
	except frappe.DoesNotExistError:
		frappe.throw(f"Quotation {quotation_id} not found")
	except Exception as e:
		frappe.throw(str(e))

@frappe.whitelist()
def check_quotation_status(quotation_id):
	"""
	Check if a quotation exists and if it already has a Customer Purchase Order.
	Returns a status dict without throwing errors.
	"""
	try:
		quotation = frappe.get_doc('Quotation', quotation_id)

		# Check if the quotation has a customer purchase order
		if hasattr(quotation, 'corex_customer_quotation_id') and quotation.corex_customer_quotation_id:
			return {
				'status': 'already_processed',
				'customer_po_id': quotation.corex_customer_quotation_id
			}

		# Quotation exists and is ready for processing
		return {
			'status': 'ok'
		}

	except frappe.DoesNotExistError:
		# Return not found status without throwing error
		return {
			'status': 'not_found'
		}
	except Exception as e:
		# Log the error but don't throw
		frappe.logger().error(f"Error checking quotation status for {quotation_id}: {str(e)}")
		return {
			'status': 'error',
			'message': str(e)
		}

@frappe.whitelist()
def get_current_user_roles():
    """
    Returns a list of roles for the current session user.
    This is a secure bridge function to be called from client-side JS.
    """
    # frappe.get_roles() automatically gets roles for the current user.
    # It also correctly handles the "Guest" user.
    return frappe.get_roles()
