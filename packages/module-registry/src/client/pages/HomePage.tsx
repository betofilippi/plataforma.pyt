import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  TrendingUp, 
  Star, 
  Download, 
  Package, 
  Zap,
  Shield,
  Rocket,
  ArrowRight,
  Users,
  Clock,
  Award
} from 'lucide-react';
import { Button, Card } from '@plataforma/design-system';

import { useRegistryStats } from '../hooks/useRegistryStats';
import { useTrendingPackages } from '../hooks/useTrendingPackages';
import { usePopularPackages } from '../hooks/usePopularPackages';
import PackageCard from '../components/PackageCard';
import SearchBar from '../components/SearchBar';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useRegistryStats();
  const { data: trending, isLoading: trendingLoading } = useTrendingPackages();
  const { data: popular, isLoading: popularLoading } = usePopularPackages();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-6">
            Module Marketplace
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Discover, install, and share powerful modules for the Plataforma.app ecosystem. 
            Build amazing applications faster with our curated collection of components.
          </p>
          
          {/* Enhanced Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar size="large" showSuggestions />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild>
              <Link to="/search">
                <Search className="w-5 h-5 mr-2" />
                Browse Modules
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/docs/getting-started">
                <Rocket className="w-5 h-5 mr-2" />
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Registry Statistics */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Modules"
            value={stats?.totalPackages.toLocaleString() || '0'}
            icon={Package}
            isLoading={statsLoading}
            trend="+12% this month"
            color="blue"
          />
          <StatCard
            title="Total Downloads"
            value={stats?.totalDownloads.toLocaleString() || '0'}
            icon={Download}
            isLoading={statsLoading}
            trend="+24% this week"
            color="green"
          />
          <StatCard
            title="Active Developers"
            value={stats?.totalUsers.toLocaleString() || '0'}
            icon={Users}
            isLoading={statsLoading}
            trend="+8% this month"
            color="purple"
          />
          <StatCard
            title="Avg. Rating"
            value="4.8"
            icon={Star}
            isLoading={false}
            trend="↗ High quality"
            color="yellow"
          />
        </div>
      </section>

      {/* Featured Categories */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Popular Categories
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Explore modules organized by functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: 'AI & Machine Learning',
              description: 'Intelligent modules powered by AI',
              count: stats?.packagesByCategory?.ai || 0,
              icon: '🧠',
              color: 'from-purple-500 to-pink-500',
              category: 'ai'
            },
            {
              name: 'User Interface',
              description: 'Beautiful UI components and layouts',
              count: stats?.packagesByCategory?.ui || 0,
              icon: '🎨',
              color: 'from-blue-500 to-cyan-500',
              category: 'ui'
            },
            {
              name: 'Database & Storage',
              description: 'Data management and storage solutions',
              count: stats?.packagesByCategory?.database || 0,
              icon: '💾',
              color: 'from-green-500 to-emerald-500',
              category: 'database'
            },
            {
              name: 'Authentication',
              description: 'Secure login and user management',
              count: stats?.packagesByCategory?.auth || 0,
              icon: '🔐',
              color: 'from-orange-500 to-red-500',
              category: 'auth'
            },
            {
              name: 'Analytics & Reporting',
              description: 'Insights and business intelligence',
              count: stats?.packagesByCategory?.analytics || 0,
              icon: '📊',
              color: 'from-indigo-500 to-purple-500',
              category: 'analytics'
            },
            {
              name: 'Communication',
              description: 'Messaging and collaboration tools',
              count: stats?.packagesByCategory?.communication || 0,
              icon: '💬',
              color: 'from-teal-500 to-blue-500',
              category: 'communication'
            }
          ].map((category) => (
            <Card key={category.category} className="p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <Link to={`/search?category=${category.category}`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {category.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {category.count} modules
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Trending Modules */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Trending This Week
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Most popular modules gaining momentum
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/search?sort=trending">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="p-6">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending?.packages.slice(0, 6).map((pkg, index) => (
              <PackageCard 
                key={pkg.id} 
                package={pkg}
                showTrendingBadge
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* Popular Modules */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Most Popular
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Battle-tested modules with the most downloads
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/search?sort=downloads">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {popularLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popular?.packages.slice(0, 6).map((pkg, index) => (
              <PackageCard 
                key={pkg.id} 
                package={pkg}
                showDownloadStats
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Our Registry */}
      <section className="py-16 bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Why Choose Our Registry?
          </h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Built for developers, by developers. We provide the tools and infrastructure 
            you need to build, share, and discover amazing modules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Security First
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              All modules are automatically scanned for security vulnerabilities 
              and malicious code before publication.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Lightning Fast
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Global CDN ensures fast downloads and installations no matter 
              where you are in the world.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Quality Assured
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Community-driven rating system and automated testing ensure 
              only high-quality modules reach your projects.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
          Join thousands of developers building the future with Plataforma.app modules. 
          Publish your first module today or explore what the community has built.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary">
            <Link to="/register" className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Create Account
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
            <Link to="/docs" className="flex items-center">
              <Rocket className="w-5 h-5 mr-2" />
              View Documentation
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;