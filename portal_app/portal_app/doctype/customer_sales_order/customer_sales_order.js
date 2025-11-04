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
								frappe.db.set_value(
									"Customer Sales Order",
									frm.doc.name,
									"corex_system_sales_order_id",
									r.message.name
								).then(() => {
									frappe.show_alert({
										message: __("Sales Order created successfully"),
										indicator: "green"
									}, 5);
									setTimeout(function(){ frappe.set_route("Form", "Sales Order", r.message.name); },1000)
								});
								
								// frm.set_value("corex_system_sales_order_id", );
								
							}
						}
					}
				});
			});
		}
	},
});
