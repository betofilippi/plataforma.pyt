import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Info,
  HardDrive,
  Clock,
  Users
} from 'lucide-react';
import { WindowCard } from '@/components/ui/WindowCard';
import { WindowButton } from '@/components/ui/WindowButton';
import { MarketplaceModule, InstallationStatus } from '../types';
import { useModuleInstaller } from '../hooks/useModuleInstaller';

interface InstallModalProps {
  module: MarketplaceModule;
  onClose: () => void;
  onInstallComplete?: (success: boolean) => void;
}

export default function InstallModal({ module, onClose, onInstallComplete }: InstallModalProps) {
  const { installModule, getInstallationStatus } = useModuleInstaller();
  
  const [step, setStep] = useState<'confirm' | 'installing' | 'success' | 'error'>('confirm');
  const [installStatus, setInstallStatus] = useState<InstallationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedPermissions, setAcceptedPermissions] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check current installation status
  useEffect(() => {
    const status = getInstallationStatus(module.id);
    if (status) {
      setInstallStatus(status);
      if (status.status === 'installing') {
        setStep('installing');
      } else if (status.status === 'installed') {
        setStep('success');
      } else if (status.status === 'failed') {
        setStep('error');
        setError(status.error || 'Falha na instalação');
      }
    }
  }, [module.id]);

  const handleInstall = async () => {
    if (!acceptedPermissions || !acceptedTerms) {
      return;
    }

    setStep('installing');
    setError(null);

    try {
      const result = await installModule(module.id, module.displayName);
      setInstallStatus(result);

      if (result.status === 'installed') {
        setStep('success');
        onInstallComplete?.(true);
      } else if (result.status === 'failed') {
        setStep('error');
        setError(result.error || 'Falha na instalação');
        onInstallComplete?.(false);
      }
    } catch (err: any) {
      setStep('error');
      setError(err.message || 'Erro desconhecido durante a instalação');
      onInstallComplete?.(false);
    }
  };

  const handleClose = () => {
    if (step === 'installing') return; // Prevent closing during installation
    onClose();
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} bytes`;
  };

  // Render confirmation step
  const renderConfirmStep = () => (
    <div className="space-y-6">
      {/* Module Info */}
      <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center overflow-hidden">
          {module.icon ? (
            <img 
              src={module.icon} 
              alt={module.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-white">
              {module.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white">{module.displayName}</h3>
          <p className="text-gray-400">v{module.version} por {module.author.name}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center">
              <Download className="w-4 h-4 mr-1" />
              {module.downloads.toLocaleString()} downloads
            </span>
            <span className="flex items-center">
              <HardDrive className="w-4 h-4 mr-1" />
              ~2.5 MB
            </span>
          </div>
        </div>
      </div>

      {/* Installation Details */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Detalhes da instalação
        </h4>
        
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Tempo estimado:</span>
            <span className="text-white flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              2-5 minutos
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Compatibilidade:</span>
            <span className="text-green-400">✓ Compatible</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Espaço necessário:</span>
            <span className="text-white">~2.5 MB</span>
          </div>
        </div>
      </div>

      {/* Dependencies */}
      {module.dependencies.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">Dependências</h4>
          <div className="bg-white/5 rounded-xl p-4">
            <ul className="space-y-2">
              {module.dependencies.map((dep) => (
                <li key={dep} className="flex items-center text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-3" />
                  {dep} (já instalado)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Permissions */}
      {module.permissions.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Permissões necessárias
          </h4>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-start space-x-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h5 className="font-medium text-yellow-300">Atenção</h5>
                <p className="text-yellow-200 text-sm">
                  Este módulo precisa das seguintes permissões para funcionar corretamente:
                </p>
              </div>
            </div>

            <div className="space-y-3 ml-8">
              {module.permissions.slice(0, 3).map((permission) => (
                <div key={permission.id} className="flex items-start space-x-2">
                  <div className={`mt-1 p-1 rounded-full ${permission.required ? 'bg-red-500' : 'bg-yellow-500'}`}>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <h6 className="font-medium text-white text-sm">{permission.name}</h6>
                    <p className="text-gray-400 text-xs">{permission.description}</p>
                  </div>
                </div>
              ))}
              {module.permissions.length > 3 && (
                <p className="text-yellow-300 text-sm">
                  ... e mais {module.permissions.length - 3} permissões
                </p>
              )}
            </div>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPermissions}
              onChange={(e) => setAcceptedPermissions(e.target.checked)}
              className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">
              Eu entendo e aceito que este módulo tenha acesso às permissões listadas acima
            </span>
          </label>
        </div>
      )}

      {/* Terms */}
      <div className="space-y-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">
            Eu concordo com os{' '}
            <a href="#" className="text-purple-400 hover:underline">
              termos de uso
            </a>{' '}
            e{' '}
            <a href="#" className="text-purple-400 hover:underline">
              política de privacidade
            </a>{' '}
            deste módulo
          </span>
        </label>
      </div>
    </div>
  );

  // Render installing step
  const renderInstallingStep = () => (
    <div className="text-center space-y-6">
      <div className="flex flex-col items-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Download className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-white mt-4">
          Instalando {module.displayName}
        </h3>
        <p className="text-gray-400">Por favor, aguarde...</p>
      </div>

      {installStatus?.progress !== undefined && (
        <div className="space-y-2">
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${installStatus.progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400">{installStatus.progress}% concluído</p>
        </div>
      )}

      <div className="text-left space-y-2 bg-white/5 rounded-xl p-4">
        <div className="text-sm text-gray-400">Status:</div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Baixando arquivos...</span>
        </div>
      </div>
    </div>
  );

  // Render success step
  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mt-4">
          Instalação concluída!
        </h3>
        <p className="text-gray-400">
          {module.displayName} foi instalado com sucesso
        </p>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div className="text-left">
            <h4 className="font-medium text-green-300">Pronto para usar</h4>
            <p className="text-green-200 text-sm">
              O módulo já está disponível na sua plataforma
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render error step
  const renderErrorStep = () => (
    <div className="text-center space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mt-4">
          Falha na instalação
        </h3>
        <p className="text-gray-400">
          Não foi possível instalar {module.displayName}
        </p>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-left">
            <h4 className="font-medium text-red-300">Erro</h4>
            <p className="text-red-200 text-sm">
              {error || 'Erro desconhecido durante a instalação'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Download className="w-5 h-5 mr-2" />
            {step === 'confirm' && 'Instalar módulo'}
            {step === 'installing' && 'Instalando...'}
            {step === 'success' && 'Instalação concluída'}
            {step === 'error' && 'Erro na instalação'}
          </h2>
          
          <button
            onClick={handleClose}
            disabled={step === 'installing'}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'confirm' && renderConfirmStep()}
          {step === 'installing' && renderInstallingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10 bg-black/20">
          {step === 'confirm' && (
            <>
              <WindowButton variant="secondary" onClick={handleClose}>
                Cancelar
              </WindowButton>
              <WindowButton
                onClick={handleInstall}
                disabled={!acceptedPermissions || !acceptedTerms}
              >
                Instalar agora
              </WindowButton>
            </>
          )}
          
          {step === 'installing' && (
            <WindowButton disabled>
              Instalando...
            </WindowButton>
          )}
          
          {(step === 'success' || step === 'error') && (
            <>
              {step === 'error' && (
                <WindowButton variant="secondary" onClick={() => setStep('confirm')}>
                  Tentar novamente
                </WindowButton>
              )}
              <WindowButton onClick={handleClose}>
                Fechar
              </WindowButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}