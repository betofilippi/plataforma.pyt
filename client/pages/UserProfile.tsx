import React, { useState } from "react";
import { WindowManagerProvider, WindowDesktop } from "@/components/windows";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Key,
  Camera,
  Save,
  ArrowLeft,
  Activity,
  Award,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    department: "Desenvolvimento",
    position: "Administrador do Sistema",
    bio: "Desenvolvedor full-stack especializado em sistemas empresariais.",
  });

  const handleSave = async () => {
    try {
      // Update user profile via API
      const response = await fetch("http://localhost:4000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("plataforma_access_token")}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setIsEditing(false);
        // Update local user context
        if (user) {
          updateUser({ ...user, name: profileData.name });
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const stats = [
    { label: "Módulos Ativos", value: "16", icon: Award },
    { label: "Acessos Hoje", value: "12", icon: Activity },
    { label: "Tarefas Concluídas", value: "48", icon: Clock },
    { label: "Nível de Acesso", value: "Admin", icon: Shield },
  ];

  const recentActivities = [
    { time: "10:45", action: "Login no sistema", module: "Auth" },
    { time: "10:30", action: "Criou nova planilha", module: "Planilha.app" },
    { time: "09:15", action: "Exportou relatório", module: "Dashboard" },
    { time: "08:45", action: "Atualizou configurações", module: "Settings" },
  ];

  return (
    <WindowManagerProvider>
      <WindowDesktop showTaskbar={true}>
        <div className="min-h-screen" style={{ backgroundColor: "#1f2937" }}>
          <div className="max-w-6xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/platform")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-3xl font-bold text-white">Perfil do Usuário</h1>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => navigate("/settings")}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white"
                  >
                    Editar Perfil
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="text-center">
                    {/* Avatar */}
                    <div className="relative inline-block mb-4">
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-700 to-purple-800 rounded-full flex items-center justify-center">
                        <User className="w-16 h-16 text-white" />
                      </div>
                      {isEditing && (
                        <button className="absolute bottom-0 right-0 p-2 bg-purple-700 rounded-full hover:bg-purple-800 transition-colors">
                          <Camera className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>

                    {/* Name and Role */}
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {profileData.name}
                    </h2>
                    <p className="text-purple-400 mb-4">{profileData.position}</p>

                    {/* Badge */}
                    <div className="inline-flex items-center px-3 py-1 bg-purple-700/20 rounded-full mb-6">
                      <Shield className="w-4 h-4 text-purple-700 mr-2" />
                      <span className="text-sm font-medium text-purple-700">
                        {user?.role?.toUpperCase()}
                      </span>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-3 text-left">
                      <div className="flex items-center text-gray-300">
                        <Mail className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-sm">{profileData.email}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-sm">Membro desde Jan 2024</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <Clock className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-sm">
                          Último acesso: {new Date().toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Segurança</h3>
                  <Button
                    onClick={() => navigate("/change-password")}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>
              </div>

              {/* Right Column - Details and Activity */}
              <div className="lg:col-span-2 space-y-8">
                {/* Profile Details */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-6">
                    Informações do Perfil
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        disabled={!isEditing}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({ ...profileData, email: e.target.value })
                        }
                        disabled={!isEditing}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Departamento
                      </label>
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) =>
                          setProfileData({ ...profileData, department: e.target.value })
                        }
                        disabled={!isEditing}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) =>
                          setProfileData({ ...profileData, bio: e.target.value })
                        }
                        disabled={!isEditing}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5 text-purple-400" />
                          <span className="text-2xl font-bold text-white">
                            {stat.value}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Activity */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-6">
                    Atividade Recente
                  </h3>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-3 border-b border-white/10 last:border-0"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <div>
                            <p className="text-white font-medium">{activity.action}</p>
                            <p className="text-xs text-gray-400">{activity.module}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </WindowDesktop>
    </WindowManagerProvider>
  );
}