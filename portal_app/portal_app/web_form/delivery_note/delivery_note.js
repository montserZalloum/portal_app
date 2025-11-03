$(document).ready(function() {
	// bind events here
	const isConfirmed = frappe.web_form.doc.corex_deliverynote_is_customer_confirmed_receipt;
	const deliveryNoteId = frappe.web_form.doc.name;
	const token = frappe.web_form.doc.corex_deliverynote_confirmation_token_customer;

	// Only add button if not confirmed and we have required data
	if (!isConfirmed && deliveryNoteId && token) {
		const confirmUrl = `/delivery_note_confirm?token=${token}&delivery_note=${deliveryNoteId}`;
		const link = $(`<a href="${confirmUrl}" class="btn btn-success btn-sm" style="margin-right: 10px;">✓ Confirm Delivery</a>`);

		$('.web-form-footer .web-form-actions .right-area').prepend(link);
	}
});