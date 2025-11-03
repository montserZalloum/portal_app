$(document).ready(function() {
	const customer_name = frappe.web_form.doc.customer_name;
	const company = frappe.web_form.doc.company;
	const selling_price_list = frappe.web_form.doc.selling_price_list;
	const quotation_id = frappe.web_form.doc.name;

	
	checkForMatchingSalesOrder(function(isConverted){
		if(!isConverted){
			let base_route = `/customer-purchase-order/new?customer=${customer_name}&order_type=Sales&company=${company}&selling_price_list=${selling_price_list}&quotation_id=${quotation_id}`;
			// Use the corrected route
			var button = $(`<a href="${base_route}" class="btn btn-primary">Convert to Purchase Order</a>`);
			$('.web-form-footer .web-form-actions .right-area').html(button);
		} else {

		}
	});

	fillFormFields()
});

function fillFormFields(){
	frappe.web_form.fields_list.forEach(f => {
		const el = $(`[data-fieldname="${f.df.fieldname}"]`);
		if (!el.parents('.hide-control').length) {
		  const valueEl = el.find('.control-value');
		  const currentVal = valueEl.text().trim();
		  const newVal = frappe.web_form.doc[f.df.fieldname];
		  const label = f.df.label || el.find('label.control-label').text().trim();
	  
		  if (!currentVal && newVal !== undefined && newVal !== null && newVal !== '') {
			if (f.df.fieldtype === "Text Editor") {
			  valueEl.html(newVal).show();
			} else {
			  valueEl.text(newVal).show();
			}
	  
			console.log(`Field: ${label}, Value: ${newVal}`);
			el.find('.control-label').text(label);
		  }
		}
	  });
	  
}

function checkForMatchingSalesOrder(cb) {
	const quotation_id = frappe.web_form.doc.name;
	// Check if a matching Customer Sales Order exists via server call
	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Customer Sales Order',
			filters: {
				'corex_customer_quotation_id': quotation_id
			},
			fields: ['name']
		},
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				const matchingSalesOrderName = r.message[0].name;

				// Display alert notification
				const alertHtml = `
					<div class="alert alert-info alert-dismissible fade show" role="alert">
						<strong>Related Sales Order Found!</strong>
						This quotation has a related Customer Sales Order: <br>
						<a class="text-underline" href="/customer-sales-order/${matchingSalesOrderName}">
							<strong>${matchingSalesOrderName}</strong>
						</a>
					</div>
				`;

				// Insert alert at the top of the form
				$('.web-form-container').prepend(alertHtml);

				// Store flags for other scripts to use
				window.quotationHasMatchingSalesOrder = true;
				window.matchingSalesOrderName = matchingSalesOrderName;
				cb(window.quotationHasMatchingSalesOrder);

			} else {
				window.quotationHasMatchingSalesOrder = false;
				window.matchingSalesOrderName = null;
				cb(window.quotationHasMatchingSalesOrder);
			}
		}
	});
}