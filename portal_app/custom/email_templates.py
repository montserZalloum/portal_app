import frappe


def create_delivery_note_email_template():
	"""
	Create or update the delivery note confirmation email template.
	"""
	template_name = "Delivery Note Confirmation Email"

	# Check if template already exists
	if frappe.db.exists("Email Template", template_name):
		# Update existing template
		doc = frappe.get_doc("Email Template", template_name)
	else:
		# Create new template
		doc = frappe.new_doc("Email Template")
		doc.name = template_name

	doc.subject = "Delivery Note Confirmation - {{ doc.delivery_note_id }}"
	doc.doctype_name = "Delivery Note"
	doc.use_html = 1
	doc.standard = 0

	# HTML email template with buttons
	doc.html = """
	<html>
		<head>
			<meta charset="utf-8">
			<style>
				body {
					font-family: Arial, sans-serif;
					line-height: 1.6;
					color: #333;
				}
				.container {
					max-width: 600px;
					margin: 0 auto;
					padding: 20px;
					background-color: #f9f9f9;
					border: 1px solid #ddd;
					border-radius: 8px;
				}
				.header {
					background-color: #2c3e50;
					color: white;
					padding: 20px;
					border-radius: 8px 8px 0 0;
					text-align: center;
				}
				.header h1 {
					margin: 0;
					font-size: 24px;
				}
				.content {
					padding: 20px;
					background-color: white;
					border-radius: 0 0 8px 8px;
				}
				.button {
					display: inline-block;
					margin: 10px 10px 10px 0;
					padding: 12px 24px;
					text-decoration: none;
					border-radius: 4px;
					font-weight: bold;
					text-align: center;
					transition: opacity 0.3s;
				}
				.button-primary {
					background-color: #27ae60;
					color: white;
				}
				.button-primary:hover {
					opacity: 0.9;
				}
				.button-secondary {
					background-color: #3498db;
					color: white;
				}
				.button-secondary:hover {
					opacity: 0.9;
				}
				.button-container {
					margin: 30px 0;
					text-align: left;
				}
				.footer {
					padding: 20px;
					border-top: 1px solid #ddd;
					font-size: 12px;
					color: #666;
					text-align: center;
				}
				.note {
					background-color: #fff3cd;
					border: 1px solid #ffc107;
					padding: 10px;
					border-radius: 4px;
					margin: 20px 0;
					color: #856404;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Delivery Note Confirmation</h1>
				</div>
				<div class="content">
					<p>Dear {{ doc.customer_name }},</p>
					<p>Thank you for your business! We have submitted your delivery note <strong>{{ doc.delivery_note_id }}</strong>.</p>
					<p>Please confirm the receipt of your delivery by clicking the button below, or view more details in your customer portal.</p>

					<div class="button-container">
						<a href="{{ doc.confirm_url }}" class="button button-primary">✓ Confirm Delivery</a>
						<a href="{{ doc.portal_url }}" class="button button-secondary">📄 View Details</a>
					</div>

					<div class="note">
						<strong>Note:</strong> If you did not place this order or have any questions, please contact our support team.
					</div>

					<p>If the buttons above do not work, you can copy and paste this link in your browser:</p>
					<p><small>{{ doc.confirm_url }}</small></p>
				</div>
				<div class="footer">
					<p>&copy; {{ frappe.utils.today() | safe }} All rights reserved.</p>
					<p>This is an automated email. Please do not reply to this message.</p>
				</div>
			</div>
		</body>
	</html>
	"""

	doc.save(ignore_permissions=True)
	frappe.logger().info(f"Email template '{template_name}' created/updated successfully")
