"""Sends real email. No fake/demo fallback: if sending fails the caller gets MailError.

Provider order:
  1. Brevo HTTPS API  (BREVO_API_KEY + MAIL_FROM)  -> works on hosts that block SMTP (e.g. Render free)
  2. SMTP             (EMAIL_USER + EMAIL_PASS)    -> fine for local development (Gmail app password)
"""
import json
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class MailError(Exception):
    pass


def mail_configured():
    return bool(os.environ.get('BREVO_API_KEY') and os.environ.get('MAIL_FROM')) or bool(
        os.environ.get('EMAIL_USER') and os.environ.get('EMAIL_PASS'))


def send_email(to, subject, html):
    brevo_key = os.environ.get('BREVO_API_KEY')
    if brevo_key:
        sender = os.environ.get('MAIL_FROM')
        if not sender:
            raise MailError('MAIL_FROM is not set')
        body = json.dumps({
            'sender': {'name': 'GoGreen Logistics', 'email': sender},
            'to': [{'email': to}],
            'subject': subject,
            'htmlContent': html,
        }).encode('utf-8')
        req = urllib.request.Request(
            'https://api.brevo.com/v3/smtp/email', data=body, method='POST',
            headers={'api-key': brevo_key, 'content-type': 'application/json', 'accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status >= 300:
                    raise MailError(f'Brevo returned {resp.status}')
            return
        except (urllib.error.URLError, TimeoutError) as exc:
            raise MailError(f'Brevo request failed: {exc}') from exc

    user, password = os.environ.get('EMAIL_USER'), os.environ.get('EMAIL_PASS')
    if not (user and password):
        raise MailError('No email provider configured')
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'GoGreen Logistics <{user}>'
    msg['To'] = to
    msg.attach(MIMEText(html, 'html'))
    try:
        with smtplib.SMTP_SSL(os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
                              int(os.environ.get('SMTP_PORT', 465)), timeout=15) as server:
            server.login(user, password)
            server.sendmail(user, to, msg.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        raise MailError(f'SMTP failed: {exc}') from exc


def otp_email_html(code, heading, intro):
    return f"""
    <div style="font-family:sans-serif;padding:24px;color:#0f172a;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#2563eb;margin-top:0">GoGreen Logistics</h2>
      <p style="font-size:14px;color:#475569"><b>{heading}</b><br>{intro}</p>
      <div style="background:#f1f5f9;padding:16px;border-radius:8px;font-size:28px;font-weight:800;letter-spacing:6px;text-align:center;color:#1e293b;margin:24px 0">{code}</div>
      <p style="font-size:12px;color:#94a3b8">This code expires in 5 minutes. Never share it with anyone. If you did not request it, ignore this email.</p>
    </div>"""
