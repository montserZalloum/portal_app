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
