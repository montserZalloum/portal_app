// Copyright (c) 2025, po and contributors
// For license information, please see license.txt

frappe.ui.form.on("Customer Sales Order", {
	refresh(frm) {
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button("Convert to Sales Order", function() {
				frappe.call({
					method: "portal_app.portal_app.doctype.customer_sales_order.customer_sales_order.create_sales_order",
					args: {
						doc: frm.doc.name
					},
					callback: function(r) {
						if (!r.exc) {
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
