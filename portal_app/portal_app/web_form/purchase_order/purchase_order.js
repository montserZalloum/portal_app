$(document).ready(function(){
    // This script will run as soon as the basic page structure is ready.

    // We only want this logic to execute when creating a BRAND NEW form.
    // The '!frappe.web_form.doc_name' check ensures this.
    if (!frappe.web_form.doc_name) {

        // A small delay can sometimes help ensure all Frappe form elements are
        // fully initialized before we try to set their values.
        setTimeout(() => {
            // Get all fields that are actually present on this web form.
            // We create a Set for very fast lookups.
            const available_fields = new Set(frappe.web_form.fields.map(df => df.fieldname));
            // Use URLSearchParams to easily get all parameters from the URL.
            const params = new URLSearchParams(window.location.search);
            let params_were_set = false;

            // Loop through every parameter found in the URL.
            // 'key' is the parameter name (e.g., "customer")
            // 'value' is its value (e.g., "CUST-0001")
            for (const [key, value] of params.entries()) {

                // Check if a field with the same name as the URL parameter key exists on our form.
                if (available_fields.has(key)) {

                    try {
                        // This special check handles child tables (like the Items table)
                        // which are passed as a JSON string in the URL.
                        if (value.startsWith('[') && value.endsWith(']')) {
                            const table_data = JSON.parse(value);
                            frappe.web_form.set_value(key, table_data);
                        } else {
                            // This is for all regular fields (Link, Data, Select, etc.).
                            frappe.web_form.set_value(key, value);
                        }
                        params_were_set = true;
                    } catch (e) {
                        console.error(`Error setting value for field '${key}':`, e);
                        // If parsing fails, fall back to setting the raw value
                        frappe.web_form.set_value(key, value);
                    }
                }
            }

            // Check if quotation_id was passed in URL, fetch items and populate the table
            const quotation_id = params.get('quotation_id');
            if (available_fields.has('corex_customer_quotation_id')) {
                frappe.web_form.set_value('corex_customer_quotation_id', quotation_id);
            }
            if (quotation_id && available_fields.has('items')) {
                frappe.call({
                    method: 'portal_app.api.get_quotation_items',
                    args: { quotation_id },
                    callback: function(response) {
                        const items = response.message || [];
                        const field = frappe.web_form.fields_dict['items'];
                    
                        if (!field) return console.error('items field not found');
                        if (!Array.isArray(items)) return console.error('Invalid items data');
                    
                        // Clear current rows
                        frappe.web_form.doc.items = [];
                    
                        // Add new rows
                        items.forEach(row => {
                            frappe.web_form.doc.items.push({
                                doctype: 'Purchase Order Item',
                                ...row
                            });
                        });
                    
                        // Update field and UI
                        field.set_value(frappe.web_form.doc.items);
                        if (field.grid) field.grid.refresh();
                    }
                    ,                    
                    error: err => console.error('Error fetching quotation items:', err)
                });
            }
            
        }, 100); // 100ms delay for robustness
    }
});