$(document).ready(function() {
	const customer_name = frappe.web_form.doc.customer_name;
	const company = frappe.web_form.doc.company;
	const selling_price_list = frappe.web_form.doc.selling_price_list;
	const quotation_id = frappe.web_form.doc.name;
	const currency = frappe.web_form.doc.currency;
	const ignore_pricing_rule = frappe.web_form.doc.ignore_pricing_rule;
	let queryString = `&ignore_pricing_rule=${ignore_pricing_rule}`
	
	checkForMatchingSalesOrder(function(isConverted){
		if(!isConverted){
			let base_route = `/customer-purchase-order/new?quotation_id=${quotation_id}`;
			// Use the corrected route
			var button = $(`<a href="${base_route}" class="btn btn-primary">Convert to Purchase Order</a>`);
			$('.web-form-footer .web-form-actions .right-area').html(button);
		} else {

		}
	});

	fillFormFields();
	hideEmptySections()
});

const tables = {
	TAXES_TABLE_HEADERS: {
		"account_head": "Account Head",
		"charge_type": "Type",
		"rate": "Tax Rate",
		"tax_amount": "Amount",
		"total": "Total",
	},
	PAYMENT_SCHEDULE_HEADERS: {
		"payment_term": "Payment Term",
		"description" : "Description",
		"due_date": "Due Date",
		"invoice_portion": "Invoice Portion",
		"payment_amount": "Payment Amount"
	}
}

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
	  

	frappe.web_form.fields_list.forEach(f => {
		const el = $(`[data-fieldname="${f.df.fieldname}"]`);
		if (!el.parents('.hide-control').length) {
			const fieldType = f.df.fieldtype;
			const valueEl = el.find('.control-value');
			const currentVal = valueEl.text().trim();
			const data = frappe.web_form.doc[f.df.fieldname];
			const label = f.df.label || el.find('label.control-label').text().trim();

		  
		  
			if (fieldType === "Table" && Array.isArray(data) && data.length) {
				let tableHeaders = null;
			
				if (f.df.fieldname === "taxes") {
					tableHeaders = tables.TAXES_TABLE_HEADERS;
				}
				if (f.df.fieldname === "payment_schedule") {
					tableHeaders = tables.PAYMENT_SCHEDULE_HEADERS;
				}
				if (f.df.fieldname === "items") {
					return;
				}

			
				const table = $('<table class="table table-sm table-bordered"><thead><tr></tr></thead><tbody></tbody></table>');
			
				const cols = tableHeaders ? Object.keys(tableHeaders) : Object.keys(data[0] || {});
			
				// headers
				cols.forEach(c => {
				const label = tableHeaders ? tableHeaders[c] : c;
				table.find("thead tr").append(`<th>${label}</th>`);
				});
			
				// rows
				data.forEach(row => {
				const tr = $("<tr></tr>");
				cols.forEach(c => tr.append(`<td>${row[c] ?? ""}</td>`));
				table.find("tbody").append(tr);
				});
			
				el.append(`<label class="control-label d-block mb-2">${label}</label>`);
				el.append(table);
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

function hideEmptySections() {
	$('.form-section').each(function () {
		const section = $(this);
		const hasTable = section.find('.section-body [data-fieldtype="Table"]').length > 0;
		const tableRendered = section.find('.section-body [data-fieldtype="Table"] table').length > 0;
		const tableGrid = section.find('.section-body [data-fieldtype="Table"] .grid-field').length > 0;
		const labels = section.find('form .control-label');
		const hasNonEmptyLabel = labels.filter(function () {
			return $(this).html().trim().length > 0;
		}).length > 0;
		
		if ((hasTable && !tableRendered && !tableGrid) || !hasNonEmptyLabel) {
		  section.hide();
		}
	});
	  
}