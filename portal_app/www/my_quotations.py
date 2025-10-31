import frappe
from frappe.utils import fmt_money

def get_context(context):
    quotations = frappe.get_list('Quotation', fields=['name', 'title', 'status', 'transaction_date', 'total'])

    # Format the total for each quotation
    for quote in quotations:
        quote['formatted_amount'] = fmt_money(quote.get('total', 0))

    context['quotations'] = quotations