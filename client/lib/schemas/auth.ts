import { z } from 'zod';

export type AuthGeneralSettingsSchema = z.infer<typeof authGeneralSettingsSchema>;

export const authGeneralSettingsSchema = z.object({
  site_url: z.string().url('Must be a valid URL').optional(),
  jwt_expiry: z.number().min(60).max(604800).optional(),
  disable_signup: z.boolean().optional(),
  mailer_autoconfirm: z.boolean().optional(),
  sms_autoconfirm: z.boolean().optional(),
});

export const authEmailProviderSchema = z.object({
  enable_email_signin: z.boolean(),
  enable_email_signup: z.boolean(),
  mailer_secure_email_change_enabled: z.boolean(),
  mailer_double_confirm_changes: z.boolean(),
  mailer_otp_exp: z.number().min(60).max(86400),
  mailer_otp_length: z.number().min(6).max(10),
});

export const authPhoneProviderSchema = z.object({
  enable_phone_signin: z.boolean(),
  enable_phone_signup: z.boolean(),
  sms_otp_exp: z.number().min(60).max(86400),
  sms_otp_length: z.number().min(6).max(10),
});

export const authGoogleProviderSchema = z.object({
  enabled: z.boolean(),
  client_id: z.string().optional(),
  secret: z.string().optional(),
  redirect_uri: z.string().url('Must be a valid URL').optional(),
});

export const authFieldLabels = {
  site_url: 'Site URL',
  jwt_expiry: 'JWT Expiry (seconds)',
  disable_signup: 'Disable Sign-ups',
  mailer_autoconfirm: 'Auto-confirm Email',
  sms_autoconfirm: 'Auto-confirm SMS',
  enable_email_signin: 'Enable Email Sign-in',
  enable_email_signup: 'Enable Email Sign-up',
  mailer_secure_email_change_enabled: 'Secure Email Change',
  mailer_double_confirm_changes: 'Double Confirm Changes',
  mailer_otp_exp: 'Email OTP Expiry (seconds)',
  mailer_otp_length: 'Email OTP Length',
  enable_phone_signin: 'Enable Phone Sign-in',
  enable_phone_signup: 'Enable Phone Sign-up',
  sms_otp_exp: 'SMS OTP Expiry (seconds)',
  sms_otp_length: 'SMS OTP Length',
  enabled: 'Enabled',
  client_id: 'Client ID',
  secret: 'Client Secret',
  redirect_uri: 'Redirect URI',
};