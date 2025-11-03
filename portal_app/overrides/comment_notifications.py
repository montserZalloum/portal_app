import frappe

def send_notification_on_new_comment(doc, method):
    """
    Sends an email notification to participants when a new comment is added to a Quotation,
    running with elevated permissions to bypass website user restrictions.
    """
    # Flag to indicate if we are running with elevated permissions
    permissions_ignored = False
    try:
        # Temporarily ignore user permissions to fetch required data
        frappe.flags.ignore_permissions = True
        permissions_ignored = True

        commented_doc = frappe.get_doc(doc.reference_doctype, doc.reference_name)

        # --- We only want to run this for comments on the 'Quotation' doctype ---
        if commented_doc.doctype == 'Quotation':
            # Get the email of the user who just added the new comment
            new_comment_by_email = frappe.db.get_value("User", doc.owner, "email")

            # Get the email of the user who created the original Quotation document
            doc_creator_email = frappe.db.get_value("User", commented_doc.owner, "email")

            # Get the user IDs of ALL users who have ever commented on this specific Quotation
            commenter_user_ids = frappe.get_all(
                "Comment",
                filters={
                    "reference_doctype": commented_doc.doctype,
                    "reference_name": commented_doc.name,
                    "comment_type": "Comment"
                },
                pluck="owner",
                distinct=True
            )
            
            # Convert user IDs to email addresses
            participant_emails = [frappe.db.get_value("User", user, "email") for user in commenter_user_ids if user]

            # Add the original creator to the list of participants
            if doc_creator_email:
                participant_emails.append(doc_creator_email)

            # Ensure the list of participants has unique email addresses
            unique_participant_emails = list(set(participant_emails))

            # Remove the person who just commented from the recipient list to avoid self-notification
            if new_comment_by_email in unique_participant_emails:
                unique_participant_emails.remove(new_comment_by_email)

            if unique_participant_emails:
                # Construct the link to the Quotation document in the web portal
                portal_path = f"/quotation/{commented_doc.name}"
                document_link = frappe.utils.get_url(portal_path)
                
                # Construct the link directly to the new comment anchor
                comment_link = f"{document_link}#comment"

                subject = f"New Comment on Quotation: {commented_doc.name}"
                
                message = f"""
                <p>A new comment was added to Quotation <b><a href="{document_link}">{commented_doc.name}</a></b> by {doc.owner}:</p>
                <br>
                <div>{doc.content}</div>
                <br>
                <p><a href="{comment_link}">Click here to view the specific comment.</a></p>
                """
                
                # The sendmail function does not require elevated permissions, 
                # but it's fine to leave it within the block.
                frappe.sendmail(
                    recipients=unique_participant_emails,
                    subject=subject,
                    message=message,
                    now=True
                )

    except Exception as e:
        frappe.log_error(title="Quotation Comment Notifier", message=str(e))
    finally:
        # CRITICAL: Always reset the flag to false in the 'finally' block
        if permissions_ignored:
            frappe.flags.ignore_permissions = False