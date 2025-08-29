"""
Security utilities for advanced authentication and security features.

This module provides comprehensive security utilities including:
- Advanced password validation and strength checking
- Email verification and secure token generation
- Two-factor authentication (TOTP and backup codes)
- Security audit logging and monitoring
- Cryptographic utilities for secure operations
- IP-based security analysis
- Device fingerprinting and trust management
"""

import secrets
import hashlib
import hmac
import base64
import qrcode
import pyotp
from io import BytesIO
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any, Union
from uuid import UUID, uuid4
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import smtplib
import ipaddress
from user_agents import parse as parse_user_agent

import structlog
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.users import User, AuditLog, LoginAttempt

logger = structlog.get_logger(__name__)
settings = get_settings()


class SecurityError(Exception):
    """Base security-related error."""
    pass


class EmailVerificationError(SecurityError):
    """Email verification-related error."""
    pass


class TwoFactorError(SecurityError):
    """Two-factor authentication error."""
    pass


class CryptographicError(SecurityError):
    """Cryptographic operation error."""
    pass


class AdvancedPasswordValidator:
    """
    Advanced password validation with comprehensive security checks.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.common_passwords = self._load_common_passwords()
        self.keyboard_patterns = self._generate_keyboard_patterns()
    
    def validate_password_comprehensive(self, password: str, user_info: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Comprehensive password validation with detailed analysis.
        
        Args:
            password: Password to validate
            user_info: Optional user information for personalization checks
            
        Returns:
            Validation result with score, errors, and suggestions
        """
        result = {
            "valid": False,
            "strength_score": 0,
            "errors": [],
            "warnings": [],
            "suggestions": [],
            "entropy": 0,
            "estimated_crack_time": "",
            "passed_checks": []
        }
        
        try:
            # Basic length check
            if len(password) < self.settings.password_min_length:
                result["errors"].append(f"Password must be at least {self.settings.password_min_length} characters long")
            else:
                result["passed_checks"].append("minimum_length")
                result["strength_score"] += 10
            
            # Character variety checks
            has_upper = bool(re.search(r'[A-Z]', password))
            has_lower = bool(re.search(r'[a-z]', password))
            has_digit = bool(re.search(r'\d', password))
            has_special = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>?]', password))
            
            if self.settings.password_require_uppercase and not has_upper:
                result["errors"].append("Password must contain uppercase letters")
            elif has_upper:
                result["passed_checks"].append("uppercase")
                result["strength_score"] += 15
            
            if self.settings.password_require_lowercase and not has_lower:
                result["errors"].append("Password must contain lowercase letters")
            elif has_lower:
                result["passed_checks"].append("lowercase")
                result["strength_score"] += 15
            
            if self.settings.password_require_numbers and not has_digit:
                result["errors"].append("Password must contain numbers")
            elif has_digit:
                result["passed_checks"].append("numbers")
                result["strength_score"] += 15
            
            if self.settings.password_require_symbols and not has_special:
                result["errors"].append("Password must contain special characters")
            elif has_special:
                result["passed_checks"].append("special_chars")
                result["strength_score"] += 15
            
            # Advanced security checks
            entropy = self._calculate_entropy(password)
            result["entropy"] = entropy
            result["strength_score"] += min(20, entropy // 2)
            
            # Common password check
            if self._is_common_password(password):
                result["errors"].append("Password is too common")
            else:
                result["passed_checks"].append("not_common")
                result["strength_score"] += 10
            
            # Pattern checks
            if self._has_keyboard_pattern(password):
                result["warnings"].append("Contains keyboard pattern")
                result["strength_score"] -= 5
            else:
                result["passed_checks"].append("no_keyboard_pattern")
            
            if self._has_repeated_chars(password):
                result["warnings"].append("Contains repeated character sequences")
                result["strength_score"] -= 5
            else:
                result["passed_checks"].append("no_repeated_chars")
            
            if self._has_sequential_chars(password):
                result["warnings"].append("Contains sequential characters")
                result["strength_score"] -= 5
            else:
                result["passed_checks"].append("no_sequential_chars")
            
            # Personal information checks
            if user_info:
                personal_issues = self._check_personal_info(password, user_info)
                if personal_issues:
                    result["errors"].extend(personal_issues)
                else:
                    result["passed_checks"].append("no_personal_info")
                    result["strength_score"] += 10
            
            # Generate suggestions
            if result["strength_score"] < 70:
                result["suggestions"] = self._generate_suggestions(password, result)
            
            # Estimate crack time
            result["estimated_crack_time"] = self._estimate_crack_time(entropy)
            
            # Ensure score is within bounds
            result["strength_score"] = max(0, min(100, result["strength_score"]))
            
            # Determine if valid
            result["valid"] = len(result["errors"]) == 0 and result["strength_score"] >= 50
            
            return result
            
        except Exception as e:
            logger.error("Password validation error", error=str(e))
            result["errors"].append("Password validation failed")
            return result
    
    def _calculate_entropy(self, password: str) -> float:
        """Calculate password entropy."""
        charset_size = 0
        
        if re.search(r'[a-z]', password):
            charset_size += 26
        if re.search(r'[A-Z]', password):
            charset_size += 26
        if re.search(r'\d', password):
            charset_size += 10
        if re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>?]', password):
            charset_size += 32
        
        if charset_size == 0:
            return 0
        
        import math
        return len(password) * math.log2(charset_size)
    
    def _is_common_password(self, password: str) -> bool:
        """Check if password is in common passwords list."""
        return password.lower() in self.common_passwords
    
    def _has_keyboard_pattern(self, password: str) -> bool:
        """Check for keyboard patterns."""
        password_lower = password.lower()
        for pattern in self.keyboard_patterns:
            if pattern in password_lower or pattern[::-1] in password_lower:
                return True
        return False
    
    def _has_repeated_chars(self, password: str) -> bool:
        """Check for repeated character sequences."""
        return bool(re.search(r'(.)\1{2,}', password))
    
    def _has_sequential_chars(self, password: str) -> bool:
        """Check for sequential characters."""
        sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz']
        password_lower = password.lower()
        
        for seq in sequences:
            for i in range(len(seq) - 2):
                subseq = seq[i:i+3]
                if subseq in password_lower or subseq[::-1] in password_lower:
                    return True
        return False
    
    def _check_personal_info(self, password: str, user_info: Dict) -> List[str]:
        """Check if password contains personal information."""
        issues = []
        password_lower = password.lower()
        
        # Check against user information
        checks = {
            'name': user_info.get('name', ''),
            'email': user_info.get('email', '').split('@')[0],
            'first_name': user_info.get('first_name', ''),
            'last_name': user_info.get('last_name', ''),
            'username': user_info.get('username', ''),
            'company': user_info.get('company', ''),
        }
        
        for field, value in checks.items():
            if value and len(value) > 2 and value.lower() in password_lower:
                issues.append(f"Password contains {field}")
        
        return issues
    
    def _generate_suggestions(self, password: str, result: Dict) -> List[str]:
        """Generate password improvement suggestions."""
        suggestions = []
        
        if result["strength_score"] < 30:
            suggestions.append("Consider using a completely different password")
        
        if len(password) < 12:
            suggestions.append("Make password longer (12+ characters recommended)")
        
        if result["entropy"] < 40:
            suggestions.append("Use a wider variety of characters")
        
        if "uppercase" not in result["passed_checks"]:
            suggestions.append("Add uppercase letters")
        
        if "lowercase" not in result["passed_checks"]:
            suggestions.append("Add lowercase letters")
        
        if "numbers" not in result["passed_checks"]:
            suggestions.append("Add numbers")
        
        if "special_chars" not in result["passed_checks"]:
            suggestions.append("Add special characters (!@#$%^&*)")
        
        if any("pattern" in warning or "repeated" in warning or "sequential" in warning 
               for warning in result["warnings"]):
            suggestions.append("Avoid predictable patterns and sequences")
        
        return suggestions
    
    def _estimate_crack_time(self, entropy: float) -> str:
        """Estimate time to crack password."""
        # Assuming 1 billion guesses per second
        guesses_per_second = 10**9
        total_combinations = 2 ** entropy
        seconds_to_crack = total_combinations / (2 * guesses_per_second)  # Average case
        
        if seconds_to_crack < 60:
            return "Less than a minute"
        elif seconds_to_crack < 3600:
            return f"{int(seconds_to_crack // 60)} minutes"
        elif seconds_to_crack < 86400:
            return f"{int(seconds_to_crack // 3600)} hours"
        elif seconds_to_crack < 31536000:
            return f"{int(seconds_to_crack // 86400)} days"
        elif seconds_to_crack < 31536000000:
            return f"{int(seconds_to_crack // 31536000)} years"
        else:
            return "Centuries"
    
    def _load_common_passwords(self) -> set:
        """Load common passwords list."""
        # Basic common passwords - in production, load from file
        return {
            'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
            '123456789', '12345678', '123456', 'password1', '12345', 'secret',
            'dragon', 'shadow', 'master', 'jennifer', 'jordan', 'superman'
        }
    
    def _generate_keyboard_patterns(self) -> List[str]:
        """Generate keyboard patterns to check against."""
        return [
            'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
            'qwerty', 'asdfgh', 'zxcvbn',
            '123456789', '987654321'
        ]


class EmailVerificationService:
    """
    Email verification service with secure token generation and validation.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.crypto_util = CryptographicUtilities()
    
    async def generate_verification_token(
        self, 
        email: str, 
        user_id: UUID,
        expires_hours: int = 24
    ) -> str:
        """
        Generate secure email verification token.
        
        Args:
            email: Email address
            user_id: User ID
            expires_hours: Token expiration in hours
            
        Returns:
            Encrypted verification token
        """
        try:
            # Create token data
            token_data = {
                'email': email,
                'user_id': str(user_id),
                'type': 'email_verification',
                'created': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(hours=expires_hours)).isoformat(),
                'nonce': secrets.token_hex(16)
            }
            
            # Encrypt token data
            token = self.crypto_util.encrypt_data(token_data)
            
            logger.info(
                "Email verification token generated",
                user_id=str(user_id),
                email=email,
                expires_at=token_data['expires']
            )
            
            return token
            
        except Exception as e:
            logger.error("Email verification token generation failed", error=str(e))
            raise EmailVerificationError("Failed to generate verification token")
    
    async def verify_email_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode email verification token.
        
        Args:
            token: Encrypted verification token
            
        Returns:
            Token data if valid
            
        Raises:
            EmailVerificationError: If token is invalid or expired
        """
        try:
            # Decrypt token data
            token_data = self.crypto_util.decrypt_data(token)
            
            # Validate token type
            if token_data.get('type') != 'email_verification':
                raise EmailVerificationError("Invalid token type")
            
            # Check expiration
            expires_at = datetime.fromisoformat(token_data['expires'])
            if datetime.utcnow() > expires_at:
                raise EmailVerificationError("Token has expired")
            
            logger.info(
                "Email verification token validated",
                user_id=token_data.get('user_id'),
                email=token_data.get('email')
            )
            
            return token_data
            
        except EmailVerificationError:
            raise
        except Exception as e:
            logger.error("Email verification token validation failed", error=str(e))
            raise EmailVerificationError("Invalid verification token")
    
    async def send_verification_email(
        self, 
        email: str, 
        token: str, 
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send email verification email.
        
        Args:
            email: Recipient email address
            token: Verification token
            user_name: Optional user name
            
        Returns:
            True if email sent successfully
        """
        try:
            if not all([
                self.settings.smtp_server,
                self.settings.smtp_username,
                self.settings.smtp_password
            ]):
                logger.warning("SMTP not configured, skipping email send")
                return False
            
            # Create verification URL
            verification_url = f"{self.settings.app_name}/verify-email?token={token}"
            
            # Create email content
            subject = f"{self.settings.app_name} - Verify Your Email"
            
            html_content = f"""
            <html>
                <head></head>
                <body>
                    <h2>Verify Your Email Address</h2>
                    <p>Hello {user_name or 'User'},</p>
                    <p>Thank you for registering with {self.settings.app_name}. 
                       Please click the link below to verify your email address:</p>
                    <p><a href="{verification_url}" 
                         style="background-color: #007bff; color: white; padding: 10px 20px; 
                                text-decoration: none; border-radius: 5px;">
                        Verify Email Address
                    </a></p>
                    <p>Or copy and paste this URL into your browser:</p>
                    <p>{verification_url}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't register for an account, you can safely ignore this email.</p>
                </body>
            </html>
            """
            
            text_content = f"""
            Verify Your Email Address
            
            Hello {user_name or 'User'},
            
            Thank you for registering with {self.settings.app_name}. 
            Please visit the following URL to verify your email address:
            
            {verification_url}
            
            This link will expire in 24 hours.
            
            If you didn't register for an account, you can safely ignore this email.
            """
            
            # Send email
            await self._send_email(email, subject, text_content, html_content)
            
            logger.info("Email verification sent", email=email)
            return True
            
        except Exception as e:
            logger.error("Failed to send verification email", error=str(e), email=email)
            return False
    
    async def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        text_content: str, 
        html_content: str
    ):
        """Send email using SMTP."""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = self.settings.smtp_username
            msg['To'] = to_email
            
            # Create text and HTML parts
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                if self.settings.smtp_use_tls:
                    server.starttls()
                server.login(self.settings.smtp_username, self.settings.smtp_password)
                server.send_message(msg)
                
        except Exception as e:
            logger.error("SMTP send error", error=str(e))
            raise


class TwoFactorAuthService:
    """
    Two-factor authentication service with TOTP and backup codes.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.crypto_util = CryptographicUtilities()
    
    def generate_totp_secret(self) -> str:
        """Generate TOTP secret key."""
        return pyotp.random_base32()
    
    def generate_qr_code(
        self, 
        secret: str, 
        user_email: str, 
        issuer_name: Optional[str] = None
    ) -> str:
        """
        Generate QR code for TOTP setup.
        
        Args:
            secret: TOTP secret
            user_email: User email address
            issuer_name: Optional issuer name
            
        Returns:
            Base64-encoded QR code image
        """
        try:
            issuer = issuer_name or self.settings.app_name
            
            # Create TOTP URI
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=user_email,
                issuer_name=issuer
            )
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            logger.error("QR code generation failed", error=str(e))
            raise TwoFactorError("Failed to generate QR code")
    
    def verify_totp_token(self, secret: str, token: str, valid_window: int = 1) -> bool:
        """
        Verify TOTP token.
        
        Args:
            secret: TOTP secret
            token: User-provided token
            valid_window: Number of time windows to check
            
        Returns:
            True if token is valid
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=valid_window)
        except Exception as e:
            logger.error("TOTP verification failed", error=str(e))
            return False
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """
        Generate backup codes for account recovery.
        
        Args:
            count: Number of backup codes to generate
            
        Returns:
            List of backup codes
        """
        try:
            codes = []
            for _ in range(count):
                # Generate 8-digit code
                code = f"{secrets.randbelow(100000000):08d}"
                codes.append(code)
            
            return codes
            
        except Exception as e:
            logger.error("Backup code generation failed", error=str(e))
            raise TwoFactorError("Failed to generate backup codes")
    
    def encrypt_backup_codes(self, codes: List[str]) -> List[str]:
        """
        Encrypt backup codes for secure storage.
        
        Args:
            codes: Plain backup codes
            
        Returns:
            Encrypted backup codes
        """
        try:
            encrypted_codes = []
            for code in codes:
                encrypted_code = self.crypto_util.encrypt_string(code)
                encrypted_codes.append(encrypted_code)
            
            return encrypted_codes
            
        except Exception as e:
            logger.error("Backup code encryption failed", error=str(e))
            raise TwoFactorError("Failed to encrypt backup codes")
    
    def verify_backup_code(self, encrypted_codes: List[str], provided_code: str) -> Tuple[bool, List[str]]:
        """
        Verify backup code and remove it from the list.
        
        Args:
            encrypted_codes: List of encrypted backup codes
            provided_code: Code provided by user
            
        Returns:
            Tuple of (is_valid, remaining_codes)
        """
        try:
            remaining_codes = []
            is_valid = False
            
            for encrypted_code in encrypted_codes:
                try:
                    decrypted_code = self.crypto_util.decrypt_string(encrypted_code)
                    if decrypted_code == provided_code and not is_valid:
                        # Code matches and hasn't been used yet
                        is_valid = True
                        # Don't add to remaining codes (consumed)
                    else:
                        remaining_codes.append(encrypted_code)
                except:
                    # Keep code if decryption fails
                    remaining_codes.append(encrypted_code)
            
            return is_valid, remaining_codes
            
        except Exception as e:
            logger.error("Backup code verification failed", error=str(e))
            return False, encrypted_codes


class SecurityAuditLogger:
    """
    Advanced security audit logging with threat detection.
    """
    
    def __init__(self):
        self.settings = get_settings()
    
    async def log_authentication_event(
        self,
        session: AsyncSession,
        event_type: str,
        user_id: Optional[UUID] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        risk_score: Optional[int] = None
    ):
        """
        Log authentication-related security events.
        
        Args:
            session: Database session
            event_type: Type of event (login, logout, mfa_setup, etc.)
            user_id: User ID if available
            email: Email address
            ip_address: Client IP address
            user_agent: User agent string
            success: Whether the operation was successful
            details: Additional event details
            risk_score: Calculated risk score (0-100)
        """
        try:
            # Parse user agent
            parsed_ua = None
            if user_agent:
                parsed_ua = parse_user_agent(user_agent)
            
            # Analyze IP address
            ip_analysis = self._analyze_ip_address(ip_address)
            
            # Calculate risk score if not provided
            if risk_score is None:
                risk_score = self._calculate_risk_score(
                    event_type=event_type,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=success,
                    ip_analysis=ip_analysis
                )
            
            # Create audit log entry
            audit_entry = AuditLog(
                user_id=user_id,
                action=f"auth.{event_type}",
                resource_type="authentication",
                ip_address=ip_address,
                user_agent=user_agent,
                new_values={
                    "event_type": event_type,
                    "email": email,
                    "success": success,
                    "risk_score": risk_score,
                    "ip_analysis": ip_analysis,
                    "user_agent_parsed": {
                        "browser": str(parsed_ua.browser) if parsed_ua else None,
                        "os": str(parsed_ua.os) if parsed_ua else None,
                        "device": str(parsed_ua.device) if parsed_ua else None,
                        "is_mobile": parsed_ua.is_mobile if parsed_ua else None,
                        "is_bot": parsed_ua.is_bot if parsed_ua else None
                    } if parsed_ua else None,
                    "details": details or {}
                }
            )
            
            session.add(audit_entry)
            
            # Log high-risk events
            if risk_score >= 70:
                logger.warning(
                    "High-risk authentication event",
                    event_type=event_type,
                    user_id=str(user_id) if user_id else None,
                    email=email,
                    ip_address=ip_address,
                    risk_score=risk_score
                )
            
        except Exception as e:
            logger.error("Security audit logging failed", error=str(e))
    
    async def detect_suspicious_activity(
        self,
        session: AsyncSession,
        user_id: UUID,
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Detect suspicious activity patterns for a user.
        
        Args:
            session: Database session
            user_id: User ID to analyze
            time_window_hours: Time window for analysis
            
        Returns:
            Suspicious activity report
        """
        try:
            since = datetime.utcnow() - timedelta(hours=time_window_hours)
            
            # Get recent login attempts
            result = await session.execute(
                select(LoginAttempt).where(
                    and_(
                        LoginAttempt.user_id == user_id,
                        LoginAttempt.attempted_at >= since
                    )
                ).order_by(desc(LoginAttempt.attempted_at))
            )
            login_attempts = result.scalars().all()
            
            # Analyze patterns
            analysis = {
                "total_attempts": len(login_attempts),
                "failed_attempts": sum(1 for attempt in login_attempts if not attempt.success),
                "unique_ips": len(set(attempt.ip_address for attempt in login_attempts if attempt.ip_address)),
                "unique_user_agents": len(set(attempt.user_agent for attempt in login_attempts if attempt.user_agent)),
                "time_window_hours": time_window_hours,
                "risk_indicators": [],
                "risk_score": 0
            }
            
            # Risk indicators
            if analysis["failed_attempts"] >= 10:
                analysis["risk_indicators"].append("high_failed_attempts")
                analysis["risk_score"] += 30
            
            if analysis["unique_ips"] >= 5:
                analysis["risk_indicators"].append("multiple_ip_addresses")
                analysis["risk_score"] += 25
            
            if analysis["unique_user_agents"] >= 3:
                analysis["risk_indicators"].append("multiple_user_agents")
                analysis["risk_score"] += 20
            
            # Velocity check
            if len(login_attempts) >= 50:
                analysis["risk_indicators"].append("high_velocity")
                analysis["risk_score"] += 35
            
            # Geographic anomalies (simplified)
            ip_countries = self._get_ip_countries([attempt.ip_address for attempt in login_attempts])
            if len(ip_countries) >= 3:
                analysis["risk_indicators"].append("geographic_anomaly")
                analysis["risk_score"] += 40
            
            analysis["risk_score"] = min(100, analysis["risk_score"])
            
            return analysis
            
        except Exception as e:
            logger.error("Suspicious activity detection failed", error=str(e))
            return {"error": "Analysis failed"}
    
    def _analyze_ip_address(self, ip_address: Optional[str]) -> Dict[str, Any]:
        """Analyze IP address for security indicators."""
        if not ip_address:
            return {}
        
        try:
            ip = ipaddress.ip_address(ip_address)
            
            analysis = {
                "is_private": ip.is_private,
                "is_loopback": ip.is_loopback,
                "is_multicast": ip.is_multicast,
                "version": ip.version,
                "type": "IPv4" if isinstance(ip, ipaddress.IPv4Address) else "IPv6"
            }
            
            # Check for known malicious IP ranges (simplified)
            if not ip.is_private:
                # In production, integrate with threat intelligence feeds
                analysis["threat_intelligence"] = "clean"  # Placeholder
            
            return analysis
            
        except Exception as e:
            logger.warning("IP analysis failed", error=str(e), ip=ip_address)
            return {"error": "analysis_failed"}
    
    def _calculate_risk_score(
        self,
        event_type: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        success: bool,
        ip_analysis: Dict[str, Any]
    ) -> int:
        """Calculate risk score for an authentication event."""
        risk_score = 0
        
        # Base risk by event type
        event_risks = {
            "login": 10 if success else 25,
            "login_failed": 30,
            "password_reset": 15,
            "mfa_setup": 20,
            "mfa_disable": 40,
            "account_locked": 50,
        }
        risk_score += event_risks.get(event_type, 10)
        
        # IP-based risk
        if ip_analysis.get("is_private", False):
            risk_score -= 5  # Lower risk for private IPs
        elif ip_analysis.get("threat_intelligence") == "malicious":
            risk_score += 40
        
        # User agent risk
        if user_agent:
            parsed_ua = parse_user_agent(user_agent)
            if parsed_ua.is_bot:
                risk_score += 30
        
        return min(100, max(0, risk_score))
    
    def _get_ip_countries(self, ip_addresses: List[Optional[str]]) -> set:
        """Get countries for IP addresses (simplified implementation)."""
        # In production, use a GeoIP database
        countries = set()
        for ip in ip_addresses:
            if ip:
                # Placeholder - in production, lookup actual country
                countries.add("Unknown")
        return countries


class CryptographicUtilities:
    """
    Cryptographic utilities for secure operations.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._encryption_key = self._derive_encryption_key()
        self._fernet = Fernet(self._encryption_key)
    
    def _derive_encryption_key(self) -> bytes:
        """Derive encryption key from secret key."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'plataforma_nxt_salt',  # In production, use random salt
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.settings.secret_key.encode()))
        return key
    
    def encrypt_string(self, plaintext: str) -> str:
        """Encrypt string data."""
        try:
            encrypted_data = self._fernet.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error("String encryption failed", error=str(e))
            raise CryptographicError("Encryption failed")
    
    def decrypt_string(self, encrypted_data: str) -> str:
        """Decrypt string data."""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            logger.error("String decryption failed", error=str(e))
            raise CryptographicError("Decryption failed")
    
    def encrypt_data(self, data: Any) -> str:
        """Encrypt JSON-serializable data."""
        try:
            import json
            json_data = json.dumps(data, default=str)
            return self.encrypt_string(json_data)
        except Exception as e:
            logger.error("Data encryption failed", error=str(e))
            raise CryptographicError("Data encryption failed")
    
    def decrypt_data(self, encrypted_data: str) -> Any:
        """Decrypt JSON data."""
        try:
            import json
            json_data = self.decrypt_string(encrypted_data)
            return json.loads(json_data)
        except Exception as e:
            logger.error("Data decryption failed", error=str(e))
            raise CryptographicError("Data decryption failed")
    
    def generate_secure_hash(self, data: str, salt: Optional[str] = None) -> str:
        """Generate secure hash with salt."""
        try:
            if salt is None:
                salt = secrets.token_hex(32)
            
            combined = f"{data}{salt}"
            hash_obj = hashlib.sha256(combined.encode())
            return f"{salt}${hash_obj.hexdigest()}"
        except Exception as e:
            logger.error("Hash generation failed", error=str(e))
            raise CryptographicError("Hash generation failed")
    
    def verify_secure_hash(self, data: str, hashed_data: str) -> bool:
        """Verify data against secure hash."""
        try:
            if '$' not in hashed_data:
                return False
            
            salt, hash_value = hashed_data.split('$', 1)
            computed_hash = self.generate_secure_hash(data, salt)
            return hmac.compare_digest(hashed_data, computed_hash)
        except Exception as e:
            logger.error("Hash verification failed", error=str(e))
            return False


# Global service instances
password_validator = AdvancedPasswordValidator()
email_verification = EmailVerificationService()
two_factor_auth = TwoFactorAuthService()
security_auditor = SecurityAuditLogger()
crypto_utils = CryptographicUtilities()