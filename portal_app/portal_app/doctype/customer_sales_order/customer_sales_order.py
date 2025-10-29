from frappe.model.document import Document
import frappe


class CustomerSalesOrder(Document):
	pass


@frappe.whitelist()
def create_sales_order(doc, method=None):
	"""Create a Frappe Sales Order from Customer Sales Order"""
	# Convert string to doc if needed
	if isinstance(doc, str):
		doc = frappe.get_doc("Customer Sales Order", doc)

	if not doc.name:
		frappe.throw("Document must be saved first")

	# Create new Sales Order
	sales_order = frappe.new_doc("Sales Order")

	# Copy basic fields
	sales_order.customer = doc.customer
	sales_order.customer_name = doc.customer_name
	sales_order.transaction_date = doc.transaction_date
	sales_order.delivery_date = doc.delivery_date
	sales_order.po_no = doc.po_no
	sales_order.po_date = doc.po_date
	sales_order.company = doc.company
	sales_order.currency = doc.currency
	sales_order.selling_price_list = doc.selling_price_list
	sales_order.order_type = doc.order_type
	sales_order.project = doc.project
	sales_order.cost_center = doc.cost_center

	# Copy items
	for item in doc.items:
		sales_order.append("items", {
			"item_code": item.item_code,
			"item_name": item.item_name,
			"description": item.description,
			"qty": item.qty,
			"uom": item.uom,
			"rate": item.rate,
			"amount": item.amount,
			"warehouse": item.warehouse,
		})

	# Copy taxes if any
	for tax in doc.taxes:
		sales_order.append("taxes", {
			"charge_type": tax.charge_type,
			"account_head": tax.account_head,
			"description": tax.description,
			"rate": tax.rate,
			"tax_amount": tax.tax_amount,
		})

	# Save and submit
	sales_order.insert(ignore_permissions=True)
	sales_order.submit()

	frappe.msgprint(f"Sales Order {sales_order.name} has been created successfully")

	return sales_order
