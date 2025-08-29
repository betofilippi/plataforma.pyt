"""
Email Service for User Confirmation and Notifications

This service handles all email functionality including:
- SMTP configuration with multiple providers support
- Professional HTML email templates
- User confirmation emails (welcome, verification, approval, rejection)
- Fallback to console logging for development
- Async email sending with proper error handling
"""

import smtplib
import ssl
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..core.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

# Email service configuration
settings = get_settings()


class EmailConfig:
    """Email configuration for different providers"""
    
    PROVIDERS = {
        "gmail": {
            "smtp_server": "smtp.gmail.com",
            "port": 587,
            "use_tls": True,
            "description": "Gmail SMTP"
        },
        "outlook": {
            "smtp_server": "smtp-mail.outlook.com", 
            "port": 587,
            "use_tls": True,
            "description": "Outlook/Hotmail SMTP"
        },
        "yahoo": {
            "smtp_server": "smtp.mail.yahoo.com",
            "port": 587,
            "use_tls": True,
            "description": "Yahoo SMTP"
        },
        "custom": {
            "smtp_server": None,
            "port": 587,
            "use_tls": True,
            "description": "Custom SMTP Server"
        }
    }
    
    @classmethod
    def get_provider_config(cls, provider_name: str = "custom") -> Dict[str, Any]:
        """Get configuration for email provider"""
        return cls.PROVIDERS.get(provider_name.lower(), cls.PROVIDERS["custom"])


class EmailTemplates:
    """Professional HTML email templates with plataforma.app branding"""
    
    @staticmethod
    def get_base_template() -> str:
        """Base HTML template with consistent styling"""
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .tagline {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .content h2 {
            color: #1a202c;
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .content p {
            margin-bottom: 16px;
            color: #4a5568;
        }
        
        .highlight-box {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        
        .cta-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .info-grid {
            display: table;
            width: 100%;
            margin: 20px 0;
        }
        
        .info-row {
            display: table-row;
        }
        
        .info-label {
            display: table-cell;
            font-weight: 600;
            color: #2d3748;
            padding: 8px 0;
            width: 120px;
        }
        
        .info-value {
            display: table-cell;
            color: #4a5568;
            padding: 8px 0;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .footer .links {
            margin-top: 20px;
        }
        
        .footer .links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
            font-size: 14px;
        }
        
        .footer .links a:hover {
            text-decoration: underline;
        }
        
        .success-icon {
            color: #48bb78;
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .warning-icon {
            color: #ed8936;
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .error-icon {
            color: #f56565;
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
            }
            
            .content {
                padding: 20px !important;
            }
            
            .header {
                padding: 30px 20px !important;
            }
            
            .cta-button {
                display: block !important;
                width: 100% !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>{{app_name}}</h1>
            <div class="tagline">Sua plataforma empresarial integrada</div>
        </div>
        
        <div class="content">
            {{content}}
        </div>
        
        <div class="footer">
            <p><strong>{{app_name}}</strong> - Tecnologia empresarial moderna e integrada</p>
            <p>Este é um e-mail automático. Por favor, não responda diretamente.</p>
            <div class="links">
                <a href="{{base_url}}/support">Suporte</a>
                <a href="{{base_url}}/docs">Documentação</a>
                <a href="{{base_url}}/privacy">Privacidade</a>
            </div>
            <p style="margin-top: 20px; color: #a0aec0; font-size: 12px;">
                © {{current_year}} {{app_name}}. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    @staticmethod
    def welcome_email_template() -> str:
        """Welcome email template for new users"""
        content = """
        <div class="success-icon">✅</div>
        <h2>Bem-vindo(a) ao {{app_name}}!</h2>
        
        <p>Olá <strong>{{user_name}}</strong>,</p>
        
        <p>É com grande satisfação que damos as boas-vindas à nossa plataforma! Sua conta foi criada com sucesso e você já pode começar a explorar todas as funcionalidades disponíveis.</p>
        
        <div class="highlight-box">
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">E-mail:</div>
                    <div class="info-value">{{user_email}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Função:</div>
                    <div class="info-value">{{user_role}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Data de Criação:</div>
                    <div class="info-value">{{created_date}}</div>
                </div>
            </div>
        </div>
        
        <p>Para começar a usar a plataforma, clique no botão abaixo:</p>
        
        <div style="text-align: center;">
            <a href="{{login_url}}" class="cta-button">Acessar Plataforma</a>
        </div>
        
        <p><strong>O que você pode fazer agora:</strong></p>
        <ul style="color: #4a5568; margin-left: 20px;">
            <li>Completar seu perfil na seção "Meu Perfil"</li>
            <li>Explorar os módulos disponíveis</li>
            <li>Configurar suas preferências de sistema</li>
            <li>Consultar nossa documentação para começar</li>
        </ul>
        
        <p>Se precisar de ajuda, nossa equipe de suporte está sempre disponível. Não hesite em entrar em contato conosco!</p>
        
        <p>Mais uma vez, seja bem-vindo(a)!</p>
        
        <p><strong>Equipe {{app_name}}</strong></p>
        """
        return content
    
    @staticmethod
    def verification_email_template() -> str:
        """Email verification template"""
        content = """
        <div class="warning-icon">🔐</div>
        <h2>Confirme seu endereço de e-mail</h2>
        
        <p>Olá <strong>{{user_name}}</strong>,</p>
        
        <p>Para concluir o processo de criação da sua conta no <strong>{{app_name}}</strong>, precisamos verificar seu endereço de e-mail.</p>
        
        <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
        
        <div style="text-align: center;">
            <a href="{{verification_url}}" class="cta-button">Verificar E-mail</a>
        </div>
        
        <div class="highlight-box">
            <p><strong>⏰ Link de verificação:</strong></p>
            <p>Este link é válido por <strong>24 horas</strong>. Após este período, será necessário solicitar um novo link de verificação.</p>
        </div>
        
        <p>Se você não conseguir clicar no botão, copie e cole o link abaixo no seu navegador:</p>
        <p style="word-break: break-all; color: #667eea; font-family: monospace; background: #f7fafc; padding: 10px; border-radius: 4px;">{{verification_url}}</p>
        
        <p><strong>Importante:</strong> Se você não solicitou esta verificação, pode ignorar este e-mail com segurança.</p>
        
        <p>Obrigado!</p>
        
        <p><strong>Equipe {{app_name}}</strong></p>
        """
        return content
    
    @staticmethod
    def account_approved_template() -> str:
        """Account approval notification template"""
        content = """
        <div class="success-icon">🎉</div>
        <h2>Conta aprovada com sucesso!</h2>
        
        <p>Olá <strong>{{user_name}}</strong>,</p>
        
        <p>Excelentes notícias! Sua conta no <strong>{{app_name}}</strong> foi aprovada pelo nosso time de administração.</p>
        
        <div class="highlight-box">
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Status:</div>
                    <div class="info-value"><strong style="color: #48bb78;">✅ Aprovada</strong></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Aprovado por:</div>
                    <div class="info-value">{{approved_by}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Data de Aprovação:</div>
                    <div class="info-value">{{approval_date}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Nível de Acesso:</div>
                    <div class="info-value">{{user_role}}</div>
                </div>
            </div>
        </div>
        
        <p>Agora você tem acesso completo à plataforma e pode começar a utilizar todos os recursos disponíveis para o seu nível de usuário.</p>
        
        <div style="text-align: center;">
            <a href="{{login_url}}" class="cta-button">Acessar Plataforma</a>
        </div>
        
        <p><strong>Próximos passos:</strong></p>
        <ul style="color: #4a5568; margin-left: 20px;">
            <li>Faça login na plataforma</li>
            <li>Complete seu perfil se ainda não o fez</li>
            <li>Explore os módulos disponíveis para seu perfil</li>
            <li>Configure suas preferências pessoais</li>
        </ul>
        
        <p>Se tiver alguma dúvida sobre como usar a plataforma, consulte nossa documentação ou entre em contato com o suporte.</p>
        
        <p>Bem-vindo(a) oficialmente ao time!</p>
        
        <p><strong>Equipe {{app_name}}</strong></p>
        """
        return content
    
    @staticmethod
    def account_rejected_template() -> str:
        """Account rejection notification template"""
        content = """
        <div class="error-icon">❌</div>
        <h2>Solicitação de conta não aprovada</h2>
        
        <p>Olá <strong>{{user_name}}</strong>,</p>
        
        <p>Agradecemos seu interesse no <strong>{{app_name}}</strong>. Infelizmente, após análise, sua solicitação de conta não foi aprovada neste momento.</p>
        
        <div class="highlight-box">
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Status:</div>
                    <div class="info-value"><strong style="color: #f56565;">❌ Não aprovada</strong></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Revisado por:</div>
                    <div class="info-value">{{reviewed_by}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Data da Revisão:</div>
                    <div class="info-value">{{review_date}}</div>
                </div>
            </div>
        </div>
        
        {{#if rejection_reason}}
        <p><strong>Motivo:</strong></p>
        <div class="highlight-box">
            <p style="color: #2d3748;">{{rejection_reason}}</p>
        </div>
        {{/if}}
        
        <p><strong>O que você pode fazer:</strong></p>
        <ul style="color: #4a5568; margin-left: 20px;">
            <li>Revisar os critérios de acesso em nossa documentação</li>
            <li>Entrar em contato com nossa equipe para esclarecimentos</li>
            <li>Solicitar uma nova avaliação após correções necessárias</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{contact_url}}" class="cta-button" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);">Entrar em Contato</a>
        </div>
        
        <p>Se você acredita que houve um equívoco ou tem informações adicionais para compartilhar, não hesite em entrar em contato conosco.</p>
        
        <p>Agradecemos sua compreensão.</p>
        
        <p><strong>Equipe {{app_name}}</strong></p>
        """
        return content


class EmailService:
    """Comprehensive email service for user notifications"""
    
    def __init__(self):
        self.settings = settings
        self.smtp_config = self._get_smtp_config()
        self.app_name = self.settings.app_name or "Plataforma"
        self.base_url = "https://plataforma.app"  # Configure based on environment
        
    def _get_smtp_config(self) -> Dict[str, Any]:
        """Get SMTP configuration based on settings"""
        # If custom SMTP settings are provided in settings, use them
        if self.settings.smtp_server:
            return {
                "smtp_server": self.settings.smtp_server,
                "port": self.settings.smtp_port,
                "username": self.settings.smtp_username,
                "password": self.settings.smtp_password,
                "use_tls": self.settings.smtp_use_tls
            }
        
        # Fallback to environment variables for quick setup
        import os
        provider = os.getenv("EMAIL_PROVIDER", "custom").lower()
        config = EmailConfig.get_provider_config(provider)
        
        return {
            "smtp_server": os.getenv("SMTP_SERVER", config["smtp_server"]),
            "port": int(os.getenv("SMTP_PORT", str(config["port"]))),
            "username": os.getenv("SMTP_USERNAME"),
            "password": os.getenv("SMTP_PASSWORD"),
            "use_tls": config.get("use_tls", True)
        }
    
    def _is_email_configured(self) -> bool:
        """Check if email service is properly configured"""
        required = ["smtp_server", "username", "password"]
        return all(self.smtp_config.get(key) for key in required)
    
    def _replace_template_variables(self, template: str, variables: Dict[str, Any]) -> str:
        """Replace template variables with actual values"""
        # Add default variables
        default_vars = {
            "app_name": self.app_name,
            "base_url": self.base_url,
            "current_year": datetime.now().year
        }
        
        # Merge with provided variables
        all_vars = {**default_vars, **variables}
        
        # Simple template replacement (basic Mustache-like syntax)
        result = template
        for key, value in all_vars.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        
        return result
    
    def _create_email_message(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> MIMEMultipart:
        """Create email message with HTML and text content"""
        
        from_email = self.smtp_config.get("username", "noreply@plataforma.app")
        from_display = from_name or self.app_name
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_display} <{from_email}>"
        msg["To"] = to_email
        msg["Reply-To"] = from_email
        
        # Add text version (fallback)
        if not text_content:
            # Create simple text version by stripping HTML tags
            import re
            text_content = re.sub(r'<[^>]+>', '', html_content)
            text_content = re.sub(r'\s+', ' ', text_content).strip()
        
        text_part = MIMEText(text_content, "plain", "utf-8")
        html_part = MIMEText(html_content, "html", "utf-8")
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        return msg
    
    async def send_email_async(
        self,
        to_email: str,
        subject: str,
        template_content: str,
        template_variables: Dict[str, Any],
        from_name: Optional[str] = None
    ) -> bool:
        """Send email asynchronously"""
        try:
            return await self._send_email_internal(
                to_email, subject, template_content, template_variables, from_name
            )
        except Exception as e:
            logger.error(f"Async email send failed: {str(e)}")
            return False
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        template_content: str,
        template_variables: Dict[str, Any],
        from_name: Optional[str] = None
    ) -> bool:
        """Send email synchronously"""
        try:
            import asyncio
            return asyncio.run(
                self._send_email_internal(
                    to_email, subject, template_content, template_variables, from_name
                )
            )
        except Exception as e:
            logger.error(f"Sync email send failed: {str(e)}")
            return False
    
    async def _send_email_internal(
        self,
        to_email: str,
        subject: str,
        template_content: str,
        template_variables: Dict[str, Any],
        from_name: Optional[str] = None
    ) -> bool:
        """Internal email sending method"""
        
        # Check if email is configured
        if not self._is_email_configured():
            logger.warning(f"Email not configured - logging email to console instead")
            self._log_email_to_console(to_email, subject, template_variables)
            return True  # Return True for development mode
        
        try:
            # Build complete HTML email
            base_template = EmailTemplates.get_base_template()
            template_variables["subject"] = subject
            
            # Replace content in base template
            complete_html = self._replace_template_variables(base_template, {
                **template_variables,
                "content": self._replace_template_variables(template_content, template_variables)
            })
            
            # Create email message
            message = self._create_email_message(
                to_email=to_email,
                subject=subject,
                html_content=complete_html,
                from_name=from_name
            )
            
            # Send email
            with smtplib.SMTP(self.smtp_config["smtp_server"], self.smtp_config["port"]) as server:
                if self.smtp_config.get("use_tls", True):
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                
                server.login(self.smtp_config["username"], self.smtp_config["password"])
                
                text = message.as_string()
                server.sendmail(self.smtp_config["username"], to_email, text)
            
            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            # Fallback to console logging in case of email failure
            self._log_email_to_console(to_email, subject, template_variables)
            return False
    
    def _log_email_to_console(self, to_email: str, subject: str, variables: Dict[str, Any]):
        """Log email to console for development/debugging"""
        try:
            logger.info("=" * 80)
            logger.info("EMAIL SERVICE - DEVELOPMENT MODE")
            logger.info("=" * 80)
            logger.info(f"TO: {to_email}")
            logger.info(f"SUBJECT: {subject}")
            logger.info("VARIABLES:")
            for key, value in variables.items():
                logger.info(f"  {key}: {value}")
            logger.info("=" * 80)
        except UnicodeEncodeError:
            print("EMAIL SERVICE: Email logged (Unicode encoding issue)")
        except Exception as e:
            print(f"EMAIL SERVICE: Logging error - {e}")
    
    # Convenience methods for different email types
    
    async def send_welcome_email(
        self,
        user_email: str,
        user_name: str,
        user_role: str,
        created_date: Optional[str] = None
    ) -> bool:
        """Send welcome email to new user"""
        variables = {
            "user_name": user_name,
            "user_email": user_email,
            "user_role": user_role,
            "created_date": created_date or datetime.now().strftime("%d/%m/%Y às %H:%M"),
            "login_url": f"{self.base_url}/login"
        }
        
        return await self.send_email_async(
            to_email=user_email,
            subject=f"Bem-vindo(a) ao {self.app_name}!",
            template_content=EmailTemplates.welcome_email_template(),
            template_variables=variables
        )
    
    async def send_verification_email(
        self,
        user_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification"""
        verification_url = f"{self.base_url}/verify-email?token={verification_token}"
        
        variables = {
            "user_name": user_name,
            "verification_url": verification_url
        }
        
        return await self.send_email_async(
            to_email=user_email,
            subject=f"Confirme seu e-mail - {self.app_name}",
            template_content=EmailTemplates.verification_email_template(),
            template_variables=variables
        )
    
    async def send_account_approved_email(
        self,
        user_email: str,
        user_name: str,
        user_role: str,
        approved_by: str,
        approval_date: Optional[str] = None
    ) -> bool:
        """Send account approval notification"""
        variables = {
            "user_name": user_name,
            "user_role": user_role,
            "approved_by": approved_by,
            "approval_date": approval_date or datetime.now().strftime("%d/%m/%Y às %H:%M"),
            "login_url": f"{self.base_url}/login"
        }
        
        return await self.send_email_async(
            to_email=user_email,
            subject=f"Conta aprovada - {self.app_name}",
            template_content=EmailTemplates.account_approved_template(),
            template_variables=variables
        )
    
    async def send_account_rejected_email(
        self,
        user_email: str,
        user_name: str,
        reviewed_by: str,
        rejection_reason: Optional[str] = None,
        review_date: Optional[str] = None
    ) -> bool:
        """Send account rejection notification"""
        variables = {
            "user_name": user_name,
            "reviewed_by": reviewed_by,
            "rejection_reason": rejection_reason or "Não atende aos critérios de acesso",
            "review_date": review_date or datetime.now().strftime("%d/%m/%Y às %H:%M"),
            "contact_url": f"{self.base_url}/contact"
        }
        
        return await self.send_email_async(
            to_email=user_email,
            subject=f"Solicitação de conta - {self.app_name}",
            template_content=EmailTemplates.account_rejected_template(),
            template_variables=variables
        )


# Global email service instance
email_service = EmailService()


# Utility functions for easy usage
async def send_welcome_email(user_email: str, user_name: str, user_role: str) -> bool:
    """Utility function to send welcome email"""
    return await email_service.send_welcome_email(user_email, user_name, user_role)


async def send_verification_email(user_email: str, user_name: str, verification_token: str) -> bool:
    """Utility function to send verification email"""
    return await email_service.send_verification_email(user_email, user_name, verification_token)


async def send_approval_email(user_email: str, user_name: str, user_role: str, approved_by: str) -> bool:
    """Utility function to send account approval email"""
    return await email_service.send_account_approved_email(user_email, user_name, user_role, approved_by)


async def send_rejection_email(
    user_email: str, 
    user_name: str, 
    reviewed_by: str, 
    rejection_reason: Optional[str] = None
) -> bool:
    """Utility function to send account rejection email"""
    return await email_service.send_account_rejected_email(
        user_email, user_name, reviewed_by, rejection_reason
    )