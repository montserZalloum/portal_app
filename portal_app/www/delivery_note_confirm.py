import frappe
from frappe.utils import get_url_to_form

def log_error(title, message):
    """Helper function to create Error Log records"""
    try:
        frappe.get_doc({
            "doctype": "Error Log",
            "title": title,
            "error": message
        }).insert(ignore_permissions=True)
    except Exception as log_err:
        print(f"[CRITICAL] Failed to create error log: {str(log_err)}")

@frappe.whitelist()
def send_confirmation_notification(delivery_note):
    """
    Send in-app Frappe notification AND email to account manager or delivery note creator.
    This function is designed to be run as a background job with admin rights.
    """
    try:
        dn = frappe.get_doc("Delivery Note", delivery_note)
        customer_doc = frappe.get_doc("Customer", dn.customer)
        
        recipient = customer_doc.account_manager or dn.owner
        
        if not recipient:
            log_error("[ERROR] No recipient found", f"For DN: {delivery_note}")
            return
            
        if not frappe.db.exists("User", recipient):
            log_error("[ERROR] Recipient user does not exist", f"User: {recipient} for DN: {delivery_note}")
            return
            
        notification_subject = f"Delivery Confirmed: {delivery_note}"
        doc_link = get_url_to_form("Delivery Note", delivery_note)
        notification_message = f"Customer '{dn.customer_name}' has confirmed receipt of delivery. <a href='{doc_link}'>View here</a>"
        
        # Method 1: Send email notification using frappe.sendmail
        user_doc = frappe.get_doc("User", recipient)
        if user_doc.email:
            frappe.sendmail(
                recipients=[user_doc.email],
                subject=notification_subject,
                message=f"""
                <p>Dear {user_doc.first_name or 'User'},</p>
                <p>Customer '<b>{dn.customer_name}</b>' has confirmed receipt of Delivery Note <b>{delivery_note}</b>.</p>
                <p><a href='{doc_link}'>Click here to view the delivery note</a></p>
                <br>
                <p>Thank you</p>
                """,
                delayed=False,  # Send immediately
                now=True  # Force immediate sending
            )
        
        # Method 2: Create in-app notification WITH email enabled
        notification_doc = frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": recipient,
            "document_type": "Delivery Note",
            "document_name": delivery_note,
            "subject": notification_subject,
            "type": "Alert",
            "email": 1,  # Enable email sending
        })
        notification_doc.insert(ignore_permissions=True)
        
        # Publish real-time notification to the user's desk
        frappe.publish_realtime(
            event="notification",
            message={
                "subject": notification_subject,
                "message": notification_message,
                "type": "Alert",
                "for_user": recipient,
                "document_type": "Delivery Note",
                "document_name": delivery_note
            },
            user=recipient
        )
        
        frappe.db.commit()
        
    except Exception as e:
        error_msg = f"Error in background job send_confirmation_notification: {str(e)}"
        print(f"[ERROR] {error_msg}")
        log_error("[ERROR] Background Notification failed", error_msg)
        
        import traceback
        error_traceback = traceback.format_exc()
        log_error("[ERROR] Background Traceback", error_traceback)

def get_context(context):
    """
    Handle delivery note confirmation via email link.
    This page displays the result of the confirmation action.
    """
    token = frappe.form_dict.get("token")
    delivery_note = frappe.form_dict.get("delivery_note")
    
    context.status = "error"
    context.message = "Invalid request"
    context.delivery_note = delivery_note
    
    try:
        frappe.logger().info(f"get_context called for delivery note confirmation")
        frappe.logger().info(f"Token: {token[:20]}..., Delivery Note: {delivery_note}")
        
        if not token or not delivery_note:
            context.message = "Missing required parameters"
            return context
            
        # Validate that the delivery note exists
        if not frappe.db.exists("Delivery Note", delivery_note):
            context.message = "Delivery note not found"
            return context
            
        dn = frappe.get_doc("Delivery Note", delivery_note)
        
        # Validate token
        if dn.get("corex_deliverynote_confirmation_token_customer") != token:
            context.message = "Invalid confirmation token"
            return context
            
        if dn.get("corex_deliverynote_is_customer_confirmed_receipt"):
            context.status = "info"
            context.message = f"Delivery Note {delivery_note} was already confirmed."
            context.is_already_confirmed = True
            return context
            
        # Update the delivery note
        frappe.logger().info(f"Updating delivery note {delivery_note} as confirmed")
        dn.db_set("corex_deliverynote_is_customer_confirmed_receipt", 1)
        
        # Create a comment/activity to track the confirmation
        frappe.logger().info(f"Creating communication record for {delivery_note}")
        frappe.get_doc({
            "doctype": "Communication",
            "communication_type": "Comment",
            "reference_doctype": "Delivery Note",
            "reference_name": delivery_note,
            "content": "Customer confirmed receipt of delivery note via email link.",
            "user": "Administrator"
        }).insert(ignore_permissions=True)
        
        frappe.db.commit()
        
        # IMPORTANT: Enqueue notification as background job instead of calling directly
        frappe.logger().info(f"Enqueueing confirmation notification for {delivery_note}")
        frappe.enqueue(
            method='portal_app.www.delivery_note_confirm.send_confirmation_notification',  # Update with your actual module path
            queue='short',  # or 'default', 'long'
            timeout=300,
            is_async=True,
            delivery_note=delivery_note
        )
        frappe.logger().info(f"Confirmation notification enqueued for {delivery_note}")
        
        context.status = "success"
        context.message = f"Thank you! Delivery Note {delivery_note} has been confirmed."
        context.is_confirmed = True
        
    except Exception as e:
        frappe.logger().error(f"Error confirming delivery note: {str(e)}")
        context.status = "error"
        context.message = "An error occurred while confirming the delivery note. Please try again."
        
    return context