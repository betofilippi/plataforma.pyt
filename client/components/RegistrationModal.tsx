import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  Briefcase,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Validation schemas for each step
const personalInfoSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const companyInfoSchema = z.object({
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
});

const termsSchema = z.object({
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar os termos de uso",
  }),
  privacyAccepted: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar a política de privacidade",
  }),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type CompanyInfoData = z.infer<typeof companyInfoSchema>;
type TermsData = z.infer<typeof termsSchema>;

interface RegistrationFormData extends PersonalInfoData, CompanyInfoData, TermsData {}

interface RegistrationModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const STEPS = {
  PERSONAL: 0,
  COMPANY: 1,
  TERMS: 2,
  CONFIRMATION: 3,
  SUCCESS: 4,
} as const;

export default function RegistrationModal({ onClose, onSwitchToLogin }: RegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState(STEPS.PERSONAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationData, setRegistrationData] = useState<Partial<RegistrationFormData>>({});
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  // Clear errors when step changes
  useEffect(() => {
    clearError();
  }, [currentStep, clearError]);

  // Personal Info Step Form
  const personalForm = useForm<PersonalInfoData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Company Info Step Form
  const companyForm = useForm<CompanyInfoData>({
    mode: "onChange",
    defaultValues: {
      department: "",
      jobTitle: "",
      phone: "",
    },
  });

  // Terms Step Form
  const termsForm = useForm<TermsData>({
    mode: "onChange",
    defaultValues: {
      termsAccepted: false,
      privacyAccepted: false,
    },
  });

  const handleNextStep = async (data: any) => {
    clearError();
    
    if (currentStep === STEPS.PERSONAL) {
      try {
        const validData = personalInfoSchema.parse(data);
        setRegistrationData(prev => ({ ...prev, ...validData }));
        setCurrentStep(STEPS.COMPANY);
      } catch (error) {
        // Form validation errors are already handled by react-hook-form
        console.error("Personal info validation failed:", error);
      }
    } else if (currentStep === STEPS.COMPANY) {
      const validData = companyInfoSchema.parse(data);
      setRegistrationData(prev => ({ ...prev, ...validData }));
      setCurrentStep(STEPS.TERMS);
    } else if (currentStep === STEPS.TERMS) {
      try {
        const validData = termsSchema.parse(data);
        const finalData = { ...registrationData, ...validData };
        setRegistrationData(finalData);
        setCurrentStep(STEPS.CONFIRMATION);
      } catch (error) {
        console.error("Terms validation failed:", error);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > STEPS.PERSONAL) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitRegistration = async () => {
    if (!registerUser) {
      console.error("Register function not available");
      return;
    }

    try {
      const response = await registerUser({
        email: registrationData.email!,
        password: registrationData.password!,
        password_confirm: registrationData.confirmPassword!,
        name: registrationData.name!,
        department: registrationData.department || "",
        job_title: registrationData.jobTitle || "",
        phone: registrationData.phone || "",
        terms_accepted: registrationData.termsAccepted || false,
        privacy_policy_accepted: registrationData.privacyAccepted || false,
      });

      if (response.success) {
        setCurrentStep(STEPS.SUCCESS);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      // Error is handled by AuthContext
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.PERSONAL:
        return "Informações Pessoais";
      case STEPS.COMPANY:
        return "Informações Profissionais";
      case STEPS.TERMS:
        return "Termos e Condições";
      case STEPS.CONFIRMATION:
        return "Confirmar Cadastro";
      case STEPS.SUCCESS:
        return "Cadastro Realizado";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEPS.PERSONAL:
        return "Preencha suas informações básicas para criar sua conta";
      case STEPS.COMPANY:
        return "Informações opcionais sobre sua função (pode preencher depois)";
      case STEPS.TERMS:
        return "Aceite os termos para finalizar seu cadastro";
      case STEPS.CONFIRMATION:
        return "Revise suas informações antes de finalizar";
      case STEPS.SUCCESS:
        return "Sua conta foi criada com sucesso!";
      default:
        return "";
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
      onKeyDown={handleKeyPress}
    >
      <div className="bg-black/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Fechar modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Step Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  step <= currentStep 
                    ? "bg-purple-500" 
                    : "bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            {getStepTitle()}
          </h2>
          <p className="text-gray-400 text-sm">
            {getStepDescription()}
          </p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === STEPS.PERSONAL && (
            <form onSubmit={personalForm.handleSubmit(handleNextStep)} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    {...personalForm.register("name")}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      personalForm.formState.errors.name
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/20 focus:ring-purple-700"
                    }`}
                    placeholder="Seu nome completo"
                    disabled={isLoading}
                  />
                </div>
                {personalForm.formState.errors.name && (
                  <p className="text-red-400 text-xs mt-1">{personalForm.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    {...personalForm.register("email")}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      personalForm.formState.errors.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/20 focus:ring-purple-700"
                    }`}
                    placeholder="seu@email.com"
                    disabled={isLoading}
                  />
                </div>
                {personalForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{personalForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...personalForm.register("password")}
                    className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      personalForm.formState.errors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/20 focus:ring-purple-700"
                    }`}
                    placeholder="Mínimo 8 caracteres"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {personalForm.formState.errors.password && (
                  <p className="text-red-400 text-xs mt-1">{personalForm.formState.errors.password.message}</p>
                )}
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Mínimo 8 caracteres</p>
                  <p>• Pelo menos uma letra maiúscula</p>
                  <p>• Pelo menos uma letra minúscula</p>
                  <p>• Pelo menos um número</p>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Confirmar Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...personalForm.register("confirmPassword")}
                    className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      personalForm.formState.errors.confirmPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/20 focus:ring-purple-700"
                    }`}
                    placeholder="Digite a senha novamente"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {personalForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{personalForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl"
                >
                  Já tenho conta
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !personalForm.formState.isValid}
                  className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <span>Próximo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </form>
          )}

          {currentStep === STEPS.COMPANY && (
            <form onSubmit={companyForm.handleSubmit(handleNextStep)} className="space-y-4">
              {/* Department Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Departamento <span className="text-gray-500">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    {...companyForm.register("department")}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent transition-all duration-200"
                    placeholder="Ex: TI, Vendas, Administrativo"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Job Title Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Cargo <span className="text-gray-500">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    {...companyForm.register("jobTitle")}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent transition-all duration-200"
                    placeholder="Ex: Desenvolvedor, Gerente, Analista"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Telefone <span className="text-gray-500">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    {...companyForm.register("phone")}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent transition-all duration-200"
                    placeholder="(11) 99999-9999"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-3 text-blue-300 text-sm">
                <p>💡 Estes campos são opcionais e podem ser preenchidos posteriormente no seu perfil.</p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </div>
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <span>Próximo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </form>
          )}

          {currentStep === STEPS.TERMS && (
            <form onSubmit={termsForm.handleSubmit(handleNextStep)} className="space-y-4">
              {/* Terms Checkbox */}
              <div className="space-y-4">
                <div className={`border rounded-xl p-4 ${termsForm.formState.errors.termsAccepted ? 'border-red-500' : 'border-white/20'}`}>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="termsAccepted"
                      {...termsForm.register("termsAccepted")}
                      className="mt-1 h-4 w-4 text-purple-700 focus:ring-purple-700 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label htmlFor="termsAccepted" className="text-sm text-gray-300 leading-relaxed">
                      Eu li e concordo com os{" "}
                      <a 
                        href="#" 
                        className="text-purple-400 hover:text-purple-300 underline" 
                        onClick={(e) => e.preventDefault()}
                      >
                        Termos de Uso
                      </a>{" "}
                      da plataforma.
                    </label>
                  </div>
                  {termsForm.formState.errors.termsAccepted && (
                    <p className="text-red-400 text-xs mt-2">{termsForm.formState.errors.termsAccepted.message}</p>
                  )}
                </div>

                <div className={`border rounded-xl p-4 ${termsForm.formState.errors.privacyAccepted ? 'border-red-500' : 'border-white/20'}`}>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="privacyAccepted"
                      {...termsForm.register("privacyAccepted")}
                      className="mt-1 h-4 w-4 text-purple-700 focus:ring-purple-700 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label htmlFor="privacyAccepted" className="text-sm text-gray-300 leading-relaxed">
                      Eu li e concordo com a{" "}
                      <a 
                        href="#" 
                        className="text-purple-400 hover:text-purple-300 underline"
                        onClick={(e) => e.preventDefault()}
                      >
                        Política de Privacidade
                      </a>{" "}
                      e autorizo o tratamento dos meus dados pessoais conforme descrito.
                    </label>
                  </div>
                  {termsForm.formState.errors.privacyAccepted && (
                    <p className="text-red-400 text-xs mt-2">{termsForm.formState.errors.privacyAccepted.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 text-sm text-gray-300 space-y-2">
                <h4 className="font-semibold">Resumo dos principais pontos:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Seus dados serão protegidos conforme LGPD</li>
                  <li>Email será usado apenas para comunicações importantes</li>
                  <li>Você pode solicitar exclusão dos dados a qualquer momento</li>
                  <li>Não compartilhamos dados com terceiros sem consentimento</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </div>
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !termsForm.formState.isValid}
                  className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <span>Próximo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </form>
          )}

          {currentStep === STEPS.CONFIRMATION && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-white mb-3">Confirme suas informações:</h3>
                
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Nome:</span>
                    <span className="text-white ml-2">{registrationData.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{registrationData.email}</span>
                  </div>
                  {registrationData.department && (
                    <div>
                      <span className="text-gray-400">Departamento:</span>
                      <span className="text-white ml-2">{registrationData.department}</span>
                    </div>
                  )}
                  {registrationData.jobTitle && (
                    <div>
                      <span className="text-gray-400">Cargo:</span>
                      <span className="text-white ml-2">{registrationData.jobTitle}</span>
                    </div>
                  )}
                  {registrationData.phone && (
                    <div>
                      <span className="text-gray-400">Telefone:</span>
                      <span className="text-white ml-2">{registrationData.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-yellow-300 text-sm">
                <p>📧 Após criar sua conta, você receberá um email de confirmação. Verifique sua caixa de entrada e spam.</p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl"
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </div>
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Criar Conta</span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {currentStep === STEPS.SUCCESS && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">
                  Conta criada com sucesso!
                </h3>
                <p className="text-gray-300">
                  Bem-vindo(a) à PLATAFORMA.APP, <span className="font-semibold text-white">{registrationData.name}</span>!
                </p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 text-blue-300 text-sm text-left space-y-2">
                <h4 className="font-semibold">📧 Próximos passos:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Verifique seu email <strong>{registrationData.email}</strong></li>
                  <li>Clique no link de confirmação (pode estar no spam)</li>
                  <li>Faça login na plataforma</li>
                  <li>Complete seu perfil se desejar</li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="px-8 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-semibold rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <span>Ir para Login</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}