/**
 * Generate Coverage Report Script
 * Comprehensive coverage analysis and reporting tool
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class CoverageReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: 'coverage-reports',
      formats: ['html', 'json', 'markdown', 'csv'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      ...options,
    };
  }

  async generate() {
    console.log('🚀 Starting comprehensive coverage analysis...\n');

    try {
      // Step 1: Run tests with coverage
      await this.runTestsWithCoverage();

      // Step 2: Generate coverage reports
      await this.generateReports();

      // Step 3: Analyze coverage data
      const analysis = await this.analyzeCoverage();

      // Step 4: Generate enhanced reports
      await this.generateEnhancedReports(analysis);

      // Step 5: Generate actionable insights
      await this.generateInsights(analysis);

      console.log('\n✅ Coverage analysis completed successfully!');
      console.log(`📂 Reports available in: ${this.options.outputDir}`);

    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message);
      process.exit(1);
    }
  }

  async runTestsWithCoverage() {
    console.log('🧪 Running tests with coverage...');

    try {
      // Run different test suites
      const testCommands = [
        'npm run test:unit -- --coverage --coverageDirectory=coverage/unit',
        'npm run test:integration -- --coverage --coverageDirectory=coverage/integration',
        'npm run test:security -- --coverage --coverageDirectory=coverage/security',
      ];

      for (const command of testCommands) {
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'pipe' });
      }

      // Merge coverage reports
      console.log('   Merging coverage reports...');
      execSync('npx nyc merge coverage/unit coverage/integration coverage/security --temp-dir merged-coverage');
      execSync('npx nyc report --temp-dir merged-coverage --reporter lcov --reporter json --reporter text-summary');

    } catch (error) {
      console.warn('⚠️  Some tests failed, continuing with available coverage...');
    }
  }

  async generateReports() {
    console.log('📊 Generating coverage reports...');

    // Ensure output directory exists
    await fs.mkdir(this.options.outputDir, { recursive: true });

    // Generate different report formats
    if (this.options.formats.includes('html')) {
      execSync(`npx nyc report --reporter html --report-dir ${this.options.outputDir}/html`);
      console.log('   ✅ HTML report generated');
    }

    if (this.options.formats.includes('json')) {
      execSync(`npx nyc report --reporter json --report-dir ${this.options.outputDir}`);
      console.log('   ✅ JSON report generated');
    }
  }

  async analyzeCoverage() {
    console.log('🔍 Analyzing coverage data...');

    const coverageFile = path.join('coverage', 'coverage-final.json');
    let coverageData = {};

    try {
      const coverageRaw = await fs.readFile(coverageFile, 'utf8');
      coverageData = JSON.parse(coverageRaw);
    } catch (error) {
      console.warn('⚠️  Could not read coverage data, using empty dataset');
    }

    const analysis = {
      summary: this.calculateSummary(coverageData),
      fileAnalysis: this.analyzeFiles(coverageData),
      thresholdAnalysis: this.analyzeThresholds(coverageData),
      trends: await this.analyzeTrends(),
      recommendations: [],
    };

    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  calculateSummary(coverageData) {
    const files = Object.keys(coverageData);
    let totalStatements = 0, coveredStatements = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalLines = 0, coveredLines = 0;

    files.forEach(file => {
      const data = coverageData[file];
      
      // Statements
      const statements = Object.values(data.s || {});
      totalStatements += statements.length;
      coveredStatements += statements.filter(s => s > 0).length;

      // Branches
      const branches = Object.values(data.b || {}).flat();
      totalBranches += branches.length;
      coveredBranches += branches.filter(b => b > 0).length;

      // Functions
      const functions = Object.values(data.f || {});
      totalFunctions += functions.length;
      coveredFunctions += functions.filter(f => f > 0).length;

      // Lines
      const lines = Object.values(data.s || {});
      totalLines += lines.length;
      coveredLines += lines.filter(l => l > 0).length;
    });

    return {
      files: files.length,
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percent: totalStatements > 0 ? (coveredStatements / totalStatements * 100) : 100,
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percent: totalBranches > 0 ? (coveredBranches / totalBranches * 100) : 100,
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percent: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100) : 100,
      },
      lines: {
        total: totalLines,
        covered: coveredLines,
        percent: totalLines > 0 ? (coveredLines / totalLines * 100) : 100,
      },
    };
  }

  analyzeFiles(coverageData) {
    const files = [];

    Object.entries(coverageData).forEach(([filePath, data]) => {
      const statements = Object.values(data.s || {});
      const branches = Object.values(data.b || {}).flat();
      const functions = Object.values(data.f || {});

      const file = {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        size: statements.length,
        statements: {
          total: statements.length,
          covered: statements.filter(s => s > 0).length,
          percent: statements.length > 0 ? (statements.filter(s => s > 0).length / statements.length * 100) : 100,
        },
        branches: {
          total: branches.length,
          covered: branches.filter(b => b > 0).length,
          percent: branches.length > 0 ? (branches.filter(b => b > 0).length / branches.length * 100) : 100,
        },
        functions: {
          total: functions.length,
          covered: functions.filter(f => f > 0).length,
          percent: functions.length > 0 ? (functions.filter(f => f > 0).length / functions.length * 100) : 100,
        },
      };

      // Risk assessment
      file.risk = this.assessFileRisk(file);
      files.push(file);
    });

    // Sort by risk and coverage
    files.sort((a, b) => {
      if (a.risk !== b.risk) {
        return b.risk - a.risk; // Higher risk first
      }
      return a.statements.percent - b.statements.percent; // Lower coverage first
    });

    return files;
  }

  assessFileRisk(file) {
    let risk = 0;

    // Size factor
    if (file.size > 500) risk += 3;
    else if (file.size > 200) risk += 2;
    else if (file.size > 100) risk += 1;

    // Coverage factor
    if (file.statements.percent < 50) risk += 4;
    else if (file.statements.percent < 70) risk += 2;
    else if (file.statements.percent < 90) risk += 1;

    // Branch coverage factor
    if (file.branches.percent < 50) risk += 3;
    else if (file.branches.percent < 70) risk += 2;

    // Critical file patterns
    if (file.relativePath.includes('auth') || file.relativePath.includes('security')) risk += 2;
    if (file.relativePath.includes('api') || file.relativePath.includes('route')) risk += 1;

    return Math.min(risk, 10); // Cap at 10
  }

  analyzeThresholds(coverageData) {
    const summary = this.calculateSummary(coverageData);
    const thresholds = this.options.thresholds;

    return {
      statements: {
        current: summary.statements.percent,
        threshold: thresholds.statements,
        passes: summary.statements.percent >= thresholds.statements,
        gap: thresholds.statements - summary.statements.percent,
      },
      branches: {
        current: summary.branches.percent,
        threshold: thresholds.branches,
        passes: summary.branches.percent >= thresholds.branches,
        gap: thresholds.branches - summary.branches.percent,
      },
      functions: {
        current: summary.functions.percent,
        threshold: thresholds.functions,
        passes: summary.functions.percent >= thresholds.functions,
        gap: thresholds.functions - summary.functions.percent,
      },
      lines: {
        current: summary.lines.percent,
        threshold: thresholds.lines,
        passes: summary.lines.percent >= thresholds.lines,
        gap: thresholds.lines - summary.lines.percent,
      },
    };
  }

  async analyzeTrends() {
    // Try to read historical coverage data
    const historyFile = path.join(this.options.outputDir, 'coverage-history.json');
    let history = [];

    try {
      const historyData = await fs.readFile(historyFile, 'utf8');
      history = JSON.parse(historyData);
    } catch (error) {
      // No history available
    }

    const currentSummary = this.calculateSummary({});
    const currentEntry = {
      timestamp: new Date().toISOString(),
      ...currentSummary,
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF_NAME || 'local',
    };

    history.push(currentEntry);

    // Keep only last 50 entries
    history = history.slice(-50);

    // Save updated history
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

    // Calculate trends
    if (history.length > 1) {
      const previous = history[history.length - 2];
      const current = history[history.length - 1];

      return {
        statements: current.statements.percent - previous.statements.percent,
        branches: current.branches.percent - previous.branches.percent,
        functions: current.functions.percent - previous.functions.percent,
        lines: current.lines.percent - previous.lines.percent,
      };
    }

    return null;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Threshold-based recommendations
    Object.entries(analysis.thresholdAnalysis).forEach(([metric, data]) => {
      if (!data.passes) {
        recommendations.push({
          type: 'threshold',
          priority: 'high',
          metric,
          message: `${metric} coverage is ${data.current.toFixed(1)}%, needs ${data.gap.toFixed(1)}% more to reach ${data.threshold}% threshold`,
        });
      }
    });

    // File-based recommendations
    const highRiskFiles = analysis.fileAnalysis.filter(f => f.risk >= 7);
    highRiskFiles.slice(0, 5).forEach(file => {
      recommendations.push({
        type: 'file',
        priority: 'high',
        file: file.relativePath,
        message: `High-risk file with ${file.statements.percent.toFixed(1)}% statement coverage`,
      });
    });

    // Trend-based recommendations
    if (analysis.trends) {
      Object.entries(analysis.trends).forEach(([metric, trend]) => {
        if (trend < -5) {
          recommendations.push({
            type: 'trend',
            priority: 'medium',
            metric,
            message: `${metric} coverage decreased by ${Math.abs(trend).toFixed(1)}%`,
          });
        }
      });
    }

    return recommendations;
  }

  async generateEnhancedReports(analysis) {
    console.log('📝 Generating enhanced reports...');

    if (this.options.formats.includes('markdown')) {
      await this.generateMarkdownReport(analysis);
      console.log('   ✅ Markdown report generated');
    }

    if (this.options.formats.includes('csv')) {
      await this.generateCsvReport(analysis);
      console.log('   ✅ CSV report generated');
    }

    // Generate interactive dashboard data
    await this.generateDashboardData(analysis);
    console.log('   ✅ Dashboard data generated');
  }

  async generateMarkdownReport(analysis) {
    const markdown = `
# Coverage Report

Generated on: ${new Date().toISOString()}

## Summary

| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Statements | ${analysis.summary.statements.percent.toFixed(1)}% | ${this.options.thresholds.statements}% | ${analysis.thresholdAnalysis.statements.passes ? '✅' : '❌'} |
| Branches | ${analysis.summary.branches.percent.toFixed(1)}% | ${this.options.thresholds.branches}% | ${analysis.thresholdAnalysis.branches.passes ? '✅' : '❌'} |
| Functions | ${analysis.summary.functions.percent.toFixed(1)}% | ${this.options.thresholds.functions}% | ${analysis.thresholdAnalysis.functions.passes ? '✅' : '❌'} |
| Lines | ${analysis.summary.lines.percent.toFixed(1)}% | ${this.options.thresholds.lines}% | ${analysis.thresholdAnalysis.lines.passes ? '✅' : '❌'} |

## High-Risk Files

${analysis.fileAnalysis.filter(f => f.risk >= 7).slice(0, 10).map(file => 
  `- **${file.relativePath}** - ${file.statements.percent.toFixed(1)}% coverage (Risk: ${file.risk}/10)`
).join('\n')}

## Recommendations

${analysis.recommendations.map(rec => 
  `### ${rec.priority.toUpperCase()}: ${rec.message}`
).join('\n\n')}

## Trends

${analysis.trends ? Object.entries(analysis.trends).map(([metric, trend]) => 
  `- **${metric}**: ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`
).join('\n') : 'No trend data available'}
`;

    await fs.writeFile(path.join(this.options.outputDir, 'coverage-report.md'), markdown);
  }

  async generateCsvReport(analysis) {
    const headers = ['File,Statements%,Branches%,Functions%,Lines%,Risk,Size'];
    const rows = analysis.fileAnalysis.map(file => 
      [
        file.relativePath,
        file.statements.percent.toFixed(1),
        file.branches.percent.toFixed(1),
        file.functions.percent.toFixed(1),
        file.statements.percent.toFixed(1), // Using statements as lines proxy
        file.risk,
        file.size,
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');
    await fs.writeFile(path.join(this.options.outputDir, 'coverage-data.csv'), csv);
  }

  async generateDashboardData(analysis) {
    const dashboardData = {
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      thresholds: analysis.thresholdAnalysis,
      trends: analysis.trends,
      recommendations: analysis.recommendations,
      topFiles: {
        highRisk: analysis.fileAnalysis.filter(f => f.risk >= 7).slice(0, 10),
        lowCoverage: analysis.fileAnalysis
          .sort((a, b) => a.statements.percent - b.statements.percent)
          .slice(0, 10),
        wellTested: analysis.fileAnalysis
          .filter(f => f.statements.percent >= 90)
          .sort((a, b) => b.statements.percent - a.statements.percent)
          .slice(0, 10),
      },
    };

    await fs.writeFile(
      path.join(this.options.outputDir, 'dashboard-data.json'),
      JSON.stringify(dashboardData, null, 2)
    );
  }

  async generateInsights(analysis) {
    console.log('\n🎯 Coverage Insights:');
    
    // Overall health
    const overallScore = (
      analysis.summary.statements.percent +
      analysis.summary.branches.percent +
      analysis.summary.functions.percent +
      analysis.summary.lines.percent
    ) / 4;

    console.log(`   Overall Score: ${overallScore.toFixed(1)}%`);
    
    if (overallScore >= 90) console.log('   🟢 Excellent coverage!');
    else if (overallScore >= 80) console.log('   🟡 Good coverage, room for improvement');
    else if (overallScore >= 70) console.log('   🟠 Moderate coverage, needs attention');
    else console.log('   🔴 Low coverage, immediate action required');

    // Priority files
    const highRiskFiles = analysis.fileAnalysis.filter(f => f.risk >= 7);
    if (highRiskFiles.length > 0) {
      console.log(`\n   🚨 ${highRiskFiles.length} high-risk files need attention`);
      highRiskFiles.slice(0, 3).forEach(file => {
        console.log(`      - ${file.relativePath} (${file.statements.percent.toFixed(1)}%)`);
      });
    }

    // Trends
    if (analysis.trends) {
      const improvingMetrics = Object.entries(analysis.trends).filter(([_, trend]) => trend > 0);
      const decliningMetrics = Object.entries(analysis.trends).filter(([_, trend]) => trend < -1);

      if (improvingMetrics.length > 0) {
        console.log(`   📈 Improving: ${improvingMetrics.map(([m, t]) => `${m} (+${t.toFixed(1)}%)`).join(', ')}`);
      }

      if (decliningMetrics.length > 0) {
        console.log(`   📉 Declining: ${decliningMetrics.map(([m, t]) => `${m} (${t.toFixed(1)}%)`).join(', ')}`);
      }
    }

    // Next steps
    console.log('\n   🎯 Recommended next steps:');
    analysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`      ${index + 1}. ${rec.message}`);
    });
  }
}

// Run the coverage report generator
if (require.main === module) {
  const generator = new CoverageReportGenerator();
  generator.generate().catch(console.error);
}

module.exports = CoverageReportGenerator;