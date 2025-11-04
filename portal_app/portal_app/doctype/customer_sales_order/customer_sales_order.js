// Copyright (c) 2025, po and contributors
// For license information, please see license.txt

frappe.ui.form.on("Customer Sales Order", {
	refresh(frm) {
		if (frm.doc.docstatus === 1 && frm.doc.corex_customer_quotation_id && frm.doc.corex_customer_quotation_id != '' 
			&& (cur_frm.doc.corex_system_sales_order_id === undefined)) {
			frm.add_custom_button("Convert to Sales Order", function() {
				frappe.call({
					method: "portal_app.portal_app.doctype.customer_sales_order.customer_sales_order.create_sales_order",
					args: {
						doc: frm.doc.name
					},
					callback: function(r) {
						if (!r.exc) {
							// Store the created sales order ID
							if (r.message && r.message.name) {
								frm.set_value("corex_system_sales_order_id", r.message.name);
								frm.save();
							}

							frappe.msgprint({
								title: "Success",
								message: "Sales Order created successfully",
								indicator: "green"
							});
							// Optionally open the new Sales Order
							if (r.message) {
								setTimeout(() => {
									frappe.set_route("Form", "Sales Order", r.message.name);
								}, 1000);
							}
						}
					}
				});
			});
		}
	},
});
