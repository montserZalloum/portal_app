$(document).ready(function(){
    addRolesToBody();
    isListingPage()
})

function isListingPage() {
    if (frappe.web_form_list && frappe.web_form_list.doctype == "Quotation") {
        frappe.call({
            method: 'portal_app.api.get_current_user_roles',
        }).then(r => {
            // Check if the call was successful and a message was returned
            if (r && r.message) {
                let roles = r.message; // The list of roles from your Python function
                
                if (roles.includes('Customer')) {
                    const newButton = document.querySelector('.web-list-actions .btn-primary');
                    if (newButton) {
                        newButton.remove()
                    }
                }
            }
        });
    }
}

function addRolesToBody() {
    frappe.call({
        method: 'portal_app.api.get_current_user_roles',
    }).then(r => {
        if (r && r.message) {
            let roles = r.message;
            document.body.setAttribute('data-roles', roles.join(','));
        }
    });
}