$(document).ready(function(){
	const customer_name = frappe.web_form.doc.customer_name;
	const company = frappe.web_form.doc.company;
	const selling_price_list = frappe.web_form.doc.selling_price_list;
	let base_route = `/purchase-order/new?customer=${customer_name}&company=${company}&selling_price_list=${selling_price_list}`;

	// Use the corrected route
	var button = $(`<a href="${base_route}" class="btn btn-primary">Convert to Purchase Order</a>`);
	$('.web-form-footer .web-form-actions .right-area').html(button);
});