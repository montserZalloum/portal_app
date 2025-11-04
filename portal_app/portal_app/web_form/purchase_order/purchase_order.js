$(document).on('submit', 'form.web-form', function(e) {
    e.preventDefault(); // stop browser reload
    if (frappe.web_form) {
        frappe.web_form.save();
    }
});

const FieldsFromQuotationToPO = {
    "customer_name": "customer"
}

const tableFieldsToProcess = ['taxes','payment_schedule'];

$(document).ready(function(){
    // This script will run as soon as the basic page structure is ready.

    // We only want this logic to execute when creating a BRAND NEW form.
    // The '!frappe.web_form.doc_name' check ensures this.
    if (window.location.pathname.includes('/new')) {
        const params = new URLSearchParams(window.location.search);
        const quotation_id = params.get('quotation_id');

        // Check if quotation_id is missing from query string
        if (!quotation_id) {
            const error_message = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <h4 class="alert-heading">Missing Quotation ID</h4>
                    <p>No quotation ID was provided. Please ensure you are accessing this form with a valid quotation link.</p>
                </div>
            `;
            document.querySelector('.page_content').innerHTML = error_message;
            return;
        }

        // Check if quotation already has a Customer Purchase Order
        frappe.call({
            method: 'portal_app.api.check_quotation_status',
            args: {
                quotation_id: quotation_id
            },
            freeze: false,
            freeze_message: false,
            async: true,
            callback: function(response) {
                const status = response.message.status;

                if (status === 'already_processed') {
                    const error_message = `
                        <div class="alert alert-warning alert-dismissible fade show" role="alert">
                            <h4 class="alert-heading">Quotation Already Processed</h4>
                            <p>This quotation (${frappe.utils.escape_html(quotation_id)}) already has a Customer Purchase Order associated with it (ID: ${frappe.utils.escape_html(response.message.customer_po_id)}).</p>
                            <p>You cannot create another Purchase Order for this quotation.</p>
                        </div>
                    `;
                    document.querySelector('.page_content').innerHTML = error_message;
                    return;
                }

                if (status === 'not_found') {
                    const error_message = `
                        <div class="alert alert-danger alert-dismissible fade show" role="alert">
                            <h4 class="alert-heading">Invalid Quotation ID</h4>
                            <p>The quotation ID (${frappe.utils.escape_html(quotation_id)}) was not found. Please ensure you are using a valid quotation link.</p>
                        </div>
                    `;
                    document.querySelector('.page_content').innerHTML = error_message;
                    return;
                }

                if (status === 'error') {
                    const error_message = `
                        <div class="alert alert-danger alert-dismissible fade show" role="alert">
                            <h4 class="alert-heading">Error</h4>
                            <p>An error occurred while verifying the quotation. Please try again later.</p>
                        </div>
                    `;
                    document.querySelector('.page_content').innerHTML = error_message;
                    return;
                }

                // If all checks pass (status === 'ok'), proceed with form initialization
                initializeForm();
            },
            error: function(err) {
                const error_message = `
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <h4 class="alert-heading">Error</h4>
                        <p>Unable to verify quotation. Please try again later.</p>
                    </div>
                `;
                document.querySelector('.page_content').innerHTML = error_message;
                console.error('Error checking quotation status:', err);
            }
        });

        // Function to initialize the form
        function initializeForm() {
            // A small delay can sometimes help ensure all Frappe form elements are
            // fully initialized before we try to set their values.
            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const quotation_id = params.get('quotation_id');
                const available_fields = new Set(frappe.web_form.fields.map(df => df.fieldname));

                // Fetch quotation data and populate the form
                if (quotation_id) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Quotation',
                            name: quotation_id
                        },
                        callback: function(response) {
                            const quotation = response.message;

                            if (!quotation) {
                                console.error('Quotation not found');
                                return;
                            }
                            console.log(Object.entries(quotation))
                            // Populate all non-table fields from quotation
                            for (const [fieldname, value] of Object.entries(quotation)) {
                                if (fieldname != 'status' && value !== undefined && value !== null) {
                                    // Check if there's a mapping for this quotation field
                                    const poFieldname = FieldsFromQuotationToPO[fieldname] || fieldname;

                                    // Check if the PO field exists on this form
                                    if (available_fields.has(poFieldname)) {
                                        const field = frappe.web_form.fields_dict[poFieldname];

                                        // Skip table fields - handle separately
                                        if (field && field.df.fieldtype !== 'Table') {
                                            
                                            try {
                                                frappe.web_form.set_value(poFieldname, value);
                                                console.log(`Populated field: ${poFieldname} (from quotation: ${fieldname})`);
                                            } catch (e) {
                                                console.error(`Error setting field '${poFieldname}':`, e);
                                            }
                                        } else if (field && field.df.fieldtype === 'Table') {
                                            // Handle table fields that should be populated
                                            if (tableFieldsToProcess.includes(fieldname) && Array.isArray(value) && value.length > 0) {
                                                try {
                                                    const el = $(`[data-fieldname="${poFieldname}"]`);
                                                    const data = value;
                                                    const label = field.df.label || poFieldname;

                                                    // Get table headers from the tables object
                                                    let tableHeaders = null;
                                                    if (fieldname === "taxes") {
                                                        tableHeaders = tables.taxes;
                                                    }
                                                    if (fieldname === "payment_schedule") {
                                                        tableHeaders = tables.payment_schedule;
                                                    }

                                                    // Create table HTML
                                                    const table = $('<table class="table table-sm table-bordered"><thead><tr></tr></thead><tbody></tbody></table>');

                                                    const cols = tableHeaders ? Object.keys(tableHeaders) : Object.keys(data[0] || {});

                                                    // Add headers
                                                    cols.forEach(c => {
                                                        const headerLabel = tableHeaders ? tableHeaders[c] : c;
                                                        table.find("thead tr").append(`<th>${headerLabel}</th>`);
                                                    });

                                                    // Add rows
                                                    data.forEach(row => {
                                                        const tr = $("<tr></tr>");
                                                        cols.forEach(c => tr.append(`<td>${row[c] ?? ""}</td>`));
                                                        table.find("tbody").append(tr);
                                                    });

                                                    el.append(`<label class="control-label d-block mb-2">${label}</label>`);
                                                    el.append(table);

                                                    console.log(`Rendered table: ${poFieldname} (from quotation: ${fieldname})`);
                                                } catch (e) {
                                                    console.error(`Error rendering table field '${poFieldname}':`, e);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Set corex_customer_quotation_id
                            if (available_fields.has('corex_customer_quotation_id')) {
                                frappe.web_form.set_value('corex_customer_quotation_id', quotation_id);
                            }

                            // Set naming_series to the first available option automatically
                            if (available_fields.has('naming_series')) {
                                const naming_series_field = frappe.web_form.fields_dict['naming_series'];
                                if (naming_series_field && naming_series_field.df.options) {
                                    const options = naming_series_field.df.options.split('\n').filter(opt => opt.trim());
                                    if (options.length > 0) {
                                        frappe.web_form.set_value('naming_series', options[0]);
                                    }
                                }
                            }

                            // Set transaction_date to today's date automatically
                            if (available_fields.has('transaction_date')) {
                                const today = frappe.datetime.get_today();
                                frappe.web_form.set_value('transaction_date', today);
                            }

                            // Populate items table from quotation
                            if (quotation.items && Array.isArray(quotation.items) && available_fields.has('items')) {
                                const field = frappe.web_form.fields_dict['items'];
                                if (field) {
                                    frappe.web_form.doc.items = [];
                                    quotation.items.forEach(row => {
                                        frappe.web_form.doc.items.push({
                                            doctype: 'Purchase Order Item',
                                            ...row
                                        });
                                    });
                                    field.set_value(frappe.web_form.doc.items);
                                    if (field.grid) field.grid.refresh();
                                }
                            }
                        },
                        error: err => console.error('Error fetching quotation:', err)
                    });
                }

            }, 100); // 100ms delay for robustness
        }
    } else {
        
    }

    fillFormFields()
});

const tables = {
	taxes: {
		"account_head": "Account Head",
		"charge_type": "Type",
		"rate": "Tax Rate",
		"tax_amount": "Amount",
		"total": "Total",
	},
	payment_schedule: {
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