import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Save, Upload, Download, Share2 } from 'lucide-react';
import { WindowCard, WindowButton, WindowInput } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AITemplate, AIColumnConfig, TEMPLATE_CATEGORIES, TEMPLATE_DIFFICULTIES, TEMPLATE_COSTS } from '@/lib/table-editor/default-templates';
import { AIColumnType } from '@/lib/table-editor/ai-types';

interface CustomTemplate extends AITemplate {
  isCustom: true;
  isShared: boolean;
}

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplate: (template: CustomTemplate) => void;
  onEditTemplate: (template: CustomTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  customTemplates: CustomTemplate[];
}

export default function TemplateManager({
  isOpen,
  onClose,
  onSaveTemplate,
  onEditTemplate,
  onDeleteTemplate,
  customTemplates
}: TemplateManagerProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'content' as string,
    tags: '',
    difficulty: 'basic' as string,
    estimatedCost: 'low' as string,
    columnType: 'ai_generator' as AIColumnType,
    aiModel: 'gpt-4' as string,
    prompt: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 500,
    contextColumns: '',
    outputFormat: 'text' as string,
    examples: [{ input: '', output: '', description: '' }]
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'content',
      tags: '',
      difficulty: 'basic',
      estimatedCost: 'low',
      columnType: 'ai_generator',
      aiModel: 'gpt-4',
      prompt: '',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 500,
      contextColumns: '',
      outputFormat: 'text',
      examples: [{ input: '', output: '', description: '' }]
    });
    setEditingTemplate(null);
  };

  // Load template for editing
  const loadTemplate = (template: CustomTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags.join(', '),
      difficulty: template.difficulty,
      estimatedCost: template.estimatedCost,
      columnType: template.config.type || 'ai_generator',
      aiModel: template.config.aiConfig?.model || 'gpt-4',
      prompt: template.config.aiConfig?.prompt || '',
      systemPrompt: template.config.aiConfig?.systemPrompt || '',
      temperature: template.config.aiConfig?.temperature || 0.7,
      maxTokens: template.config.aiConfig?.maxTokens || 500,
      contextColumns: template.config.aiConfig?.contextColumns?.join(', ') || '',
      outputFormat: template.config.aiConfig?.outputFormat || 'text',
      examples: template.examples || [{ input: '', output: '', description: '' }]
    });
    setActiveTab('create');
  };

  // Save template
  const handleSave = () => {
    const template: CustomTemplate = {
      id: editingTemplate?.id || `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      category: formData.category as any,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      difficulty: formData.difficulty as any,
      estimatedCost: formData.estimatedCost as any,
      usageCount: editingTemplate?.usageCount || 0,
      rating: editingTemplate?.rating || 5.0,
      ratingCount: editingTemplate?.ratingCount || 1,
      config: {
        type: formData.columnType,
        aiConfig: {
          model: formData.aiModel as any,
          prompt: formData.prompt,
          systemPrompt: formData.systemPrompt,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          contextColumns: formData.contextColumns.split(',').map(col => col.trim()).filter(col => col),
          outputFormat: formData.outputFormat as any
        }
      },
      examples: formData.examples.filter(ex => ex.description || ex.input || ex.output),
      dependencies: [],
      author: 'Custom',
      createdAt: editingTemplate?.createdAt || new Date(),
      updatedAt: new Date(),
      isCustom: true,
      isShared: false
    };

    onSaveTemplate(template);
    resetForm();
  };

  // Add example
  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { input: '', output: '', description: '' }]
    }));
  };

  // Remove example
  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  // Update example
  const updateExample = (index: number, field: 'input' | 'output' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.map((ex, i) => i === index ? { ...ex, [field]: value } : ex)
    }));
  };

  // Export templates
  const exportTemplates = () => {
    const dataStr = JSON.stringify(customTemplates, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-templates.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import templates
  const importTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          imported.forEach(template => {
            if (template.name && template.config) {
              onSaveTemplate({ ...template, id: `imported-${Date.now()}-${Math.random()}` });
            }
          });
        }
      } catch (error) {
        console.error('Failed to import templates:', error);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-gray-900 border-gray-700 text-white overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Template Manager</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="bg-black/20">
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-600">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-purple-600">
              Manage Templates ({customTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <WindowCard title="Basic Information">
                <div className="space-y-4">
                  <WindowInput
                    label="Template Name"
                    placeholder="e.g., Custom Product Analyzer"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Description</label>
                    <Textarea
                      placeholder="Describe what this template does..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                      rows={3}
                    />
                  </div>

                  <WindowInput
                    label="Tags (comma-separated)"
                    placeholder="e.g., analysis, product, custom"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Category</label>
                      <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Difficulty</label>
                      <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_DIFFICULTIES.map(difficulty => (
                            <SelectItem key={difficulty} value={difficulty}>
                              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Estimated Cost</label>
                    <Select value={formData.estimatedCost} onValueChange={(value) => setFormData(prev => ({ ...prev, estimatedCost: value }))}>
                      <SelectTrigger className="bg-white/10 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_COSTS.map(cost => (
                          <SelectItem key={cost} value={cost}>
                            {cost.charAt(0).toUpperCase() + cost.slice(1)} Cost
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </WindowCard>

              {/* AI Configuration */}
              <WindowCard title="AI Configuration">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Column Type</label>
                      <Select value={formData.columnType} onValueChange={(value) => setFormData(prev => ({ ...prev, columnType: value as AIColumnType }))}>
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ai_generator">AI Generator</SelectItem>
                          <SelectItem value="ai_analyzer">AI Analyzer</SelectItem>
                          <SelectItem value="ai_transformer">AI Transformer</SelectItem>
                          <SelectItem value="validation">Validation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">AI Model</label>
                      <Select value={formData.aiModel} onValueChange={(value) => setFormData(prev => ({ ...prev, aiModel: value }))}>
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude-3">Claude 3</SelectItem>
                          <SelectItem value="claude-2">Claude 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <WindowInput
                      type="number"
                      label="Temperature"
                      placeholder="0.7"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.temperature.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    />

                    <WindowInput
                      type="number"
                      label="Max Tokens"
                      placeholder="500"
                      value={formData.maxTokens.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    />
                  </div>

                  <WindowInput
                    label="Context Columns (comma-separated)"
                    placeholder="e.g., product_name, category, price"
                    value={formData.contextColumns}
                    onChange={(e) => setFormData(prev => ({ ...prev, contextColumns: e.target.value }))}
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Output Format</label>
                    <Select value={formData.outputFormat} onValueChange={(value) => setFormData(prev => ({ ...prev, outputFormat: value }))}>
                      <SelectTrigger className="bg-white/10 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </WindowCard>
            </div>

            {/* Prompts */}
            <WindowCard title="AI Prompts">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Main Prompt</label>
                  <Textarea
                    placeholder="Enter your AI prompt template here. Use {{column_name}} for dynamic values..."
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">System Prompt (Optional)</label>
                  <Textarea
                    placeholder="System-level instructions for the AI..."
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>
            </WindowCard>

            {/* Examples */}
            <WindowCard title="Examples">
              <div className="space-y-4">
                {formData.examples.map((example, index) => (
                  <div key={index} className="p-4 bg-black/20 rounded-lg border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Example {index + 1}</h4>
                      {formData.examples.length > 1 && (
                        <WindowButton
                          variant="danger"
                          onClick={() => removeExample(index)}
                          icon={<Trash2 />}
                        />
                      )}
                    </div>
                    <div className="space-y-3">
                      <WindowInput
                        label="Description"
                        placeholder="Brief description of this example"
                        value={example.description}
                        onChange={(e) => updateExample(index, 'description', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">Input</label>
                          <Textarea
                            placeholder="Example input data (JSON format)"
                            value={example.input}
                            onChange={(e) => updateExample(index, 'input', e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">Output</label>
                          <Textarea
                            placeholder="Expected output"
                            value={example.output}
                            onChange={(e) => updateExample(index, 'output', e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <WindowButton variant="secondary" onClick={addExample} icon={<Plus />}>
                  Add Example
                </WindowButton>
              </div>
            </WindowCard>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
              <WindowButton variant="secondary" onClick={resetForm}>
                Reset
              </WindowButton>
              <WindowButton 
                variant="primary" 
                onClick={handleSave}
                icon={<Save />}
                disabled={!formData.name || !formData.description}
              >
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </WindowButton>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <WindowButton variant="secondary" onClick={exportTemplates} icon={<Download />}>
                  Export All
                </WindowButton>
                <label>
                  <WindowButton variant="secondary" icon={<Upload />}>
                    Import Templates
                  </WindowButton>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTemplates}
                    className="hidden"
                  />
                </label>
              </div>
              <WindowButton variant="primary" onClick={() => setActiveTab('create')} icon={<Plus />}>
                New Template
              </WindowButton>
            </div>

            {/* Templates List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {customTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No custom templates yet.</p>
                  <p className="text-sm">Create your first template to get started.</p>
                </div>
              ) : (
                customTemplates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-4 bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-black/20 transition-colors group">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-white">{template.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.difficulty}
                        </Badge>
                        {template.isShared && (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            Shared
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{template.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{template.tags.length} tags</span>
                        <span>{template.usageCount} uses</span>
                        <span>Rating: {template.rating.toFixed(1)}</span>
                        <span>Updated: {template.updatedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <WindowButton 
                        variant="secondary"
                        onClick={() => loadTemplate(template)}
                        icon={<Edit />}
                      >
                        Edit
                      </WindowButton>
                      <WindowButton 
                        variant="secondary"
                        onClick={() => {
                          const duplicate = {
                            ...template,
                            id: `copy-${Date.now()}`,
                            name: `${template.name} (Copy)`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                          };
                          onSaveTemplate(duplicate);
                        }}
                        icon={<Copy />}
                      >
                        Duplicate
                      </WindowButton>
                      <WindowButton 
                        variant="danger"
                        onClick={() => onDeleteTemplate(template.id)}
                        icon={<Trash2 />}
                      >
                        Delete
                      </WindowButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {customTemplates.length} custom templates
          </div>
          <WindowButton variant="secondary" onClick={onClose}>
            Close
          </WindowButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}