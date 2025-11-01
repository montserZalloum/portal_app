import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def add_customer_confirmation_fields():
    """
    Add a 'Customer Confirmation' tab and related fields to the Delivery Note doctype.
    """
    custom_fields_for_customer = {
        "Delivery Note": [
            {
                "fieldname": "corex_deliverynote_is_customer_confirmed_receipt",
                "label": "Is Customer Confirmed Receipt",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "customer"
            },
            {
                "fieldname": "corex_deliverynote_confirmation_token_customer",
                "label": "Confirmation Token",
                "fieldtype": "Data",
                "insert_after": "corex_deliverynote_is_customer_confirmed_receipt",
                "read_only": 1,
                "hidden": 1
            },
            
        ]
    }

    create_custom_fields(custom_fields_for_customer)