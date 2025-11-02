import frappe

def get_context(context):
	"""
	Check if a Customer Sales Order record exists with corex_customer_quotation_id
	matching the current quotation's name
	"""
	doc = context.get('doc')

	if doc and hasattr(doc, 'name'):
		# Search for Customer Sales Order records with matching corex_customer_quotation_id
		matching_sales_order = frappe.db.get_value(
			'Customer Sales Order',
			filters={'corex_customer_quotation_id': doc.name},
			fieldname='name'
		)

		# Set flag in context to indicate if a matching sales order exists
		context['has_matching_sales_order'] = bool(matching_sales_order)
		context['matching_sales_order_name'] = matching_sales_order
	else:
		context['has_matching_sales_order'] = False
		context['matching_sales_order_name'] = None
