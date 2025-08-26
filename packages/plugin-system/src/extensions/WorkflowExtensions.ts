import { EventEmitter } from 'eventemitter3';

/**
 * Workflow Extension System
 * Manages business process hooks, automation, and workflow integration
 */
export class WorkflowExtensionManager extends EventEmitter {
  private workflows = new Map<string, WorkflowRegistry>();
  private steps = new Map<string, StepRegistry>();
  private triggers = new Map<string, TriggerRegistry>();
  private conditions = new Map<string, ConditionRegistry>();
  private actions = new Map<string, ActionRegistry>();

  constructor(private readonly options: WorkflowExtensionOptions = {}) {
    super();
    this.initializeBuiltInComponents();
  }

  // Workflow Management

  /**
   * Register a workflow
   */
  registerWorkflow(
    pluginId: string,
    name: string,
    workflow: WorkflowDefinition,
    options: WorkflowOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.workflows.has(fullName)) {
      throw new Error(`Workflow '${fullName}' is already registered`);
    }

    const registration: WorkflowRegistry = {
      pluginId,
      name,
      fullName,
      workflow,
      options,
      registeredAt: new Date(),
      executionCount: 0,
      lastExecuted: null
    };

    this.workflows.set(fullName, registration);
    this.emit('workflow:registered', { registration });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowName: string,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const registration = this.workflows.get(workflowName);
    if (!registration) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    try {
      registration.executionCount++;
      registration.lastExecuted = new Date();

      const startTime = Date.now();
      const result = await this.processWorkflow(registration.workflow, context);
      const endTime = Date.now();

      this.emit('workflow:executed', {
        workflowName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        success: result.success
      });

      return {
        ...result,
        workflow: workflowName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('workflow:error', {
        workflowName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        workflow: workflowName
      };
    }
  }

  // Step Management

  /**
   * Register a workflow step
   */
  registerStep(
    pluginId: string,
    name: string,
    step: WorkflowStep,
    options: StepOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.steps.has(fullName)) {
      throw new Error(`Workflow step '${fullName}' is already registered`);
    }

    const registration: StepRegistry = {
      pluginId,
      name,
      fullName,
      step,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.steps.set(fullName, registration);
    this.emit('step:registered', { registration });
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    stepName: string,
    context: WorkflowContext
  ): Promise<StepResult> {
    const registration = this.steps.get(stepName);
    if (!registration) {
      throw new Error(`Workflow step '${stepName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.step.execute(context);
      const endTime = Date.now();

      this.emit('step:executed', {
        stepName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        success: result.success
      });

      return {
        ...result,
        step: stepName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('step:error', {
        stepName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        step: stepName
      };
    }
  }

  // Trigger Management

  /**
   * Register a workflow trigger
   */
  registerTrigger(
    pluginId: string,
    name: string,
    trigger: WorkflowTrigger,
    options: TriggerOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.triggers.has(fullName)) {
      throw new Error(`Workflow trigger '${fullName}' is already registered`);
    }

    const registration: TriggerRegistry = {
      pluginId,
      name,
      fullName,
      trigger,
      options,
      registeredAt: new Date(),
      triggerCount: 0
    };

    this.triggers.set(fullName, registration);
    
    // Initialize trigger
    trigger.initialize(() => this.handleTrigger(fullName));
    
    this.emit('trigger:registered', { registration });
  }

  /**
   * Handle trigger activation
   */
  private async handleTrigger(triggerName: string): Promise<void> {
    const registration = this.triggers.get(triggerName);
    if (!registration) return;

    registration.triggerCount++;
    
    this.emit('trigger:activated', {
      triggerName,
      pluginId: registration.pluginId
    });

    // Find workflows that use this trigger
    const triggeredWorkflows = Array.from(this.workflows.values())
      .filter(w => w.workflow.trigger === triggerName);

    for (const workflow of triggeredWorkflows) {
      const context: WorkflowContext = {
        trigger: triggerName,
        data: {},
        metadata: {}
      };
      
      await this.executeWorkflow(workflow.fullName, context);
    }
  }

  // Condition Management

  /**
   * Register a workflow condition
   */
  registerCondition(
    pluginId: string,
    name: string,
    condition: WorkflowCondition,
    options: ConditionOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.conditions.has(fullName)) {
      throw new Error(`Workflow condition '${fullName}' is already registered`);
    }

    const registration: ConditionRegistry = {
      pluginId,
      name,
      fullName,
      condition,
      options,
      registeredAt: new Date(),
      evaluationCount: 0
    };

    this.conditions.set(fullName, registration);
    this.emit('condition:registered', { registration });
  }

  /**
   * Evaluate a condition
   */
  async evaluateCondition(
    conditionName: string,
    context: WorkflowContext
  ): Promise<ConditionResult> {
    const registration = this.conditions.get(conditionName);
    if (!registration) {
      throw new Error(`Workflow condition '${conditionName}' not found`);
    }

    try {
      registration.evaluationCount++;
      
      const startTime = Date.now();
      const result = await registration.condition.evaluate(context);
      const endTime = Date.now();

      this.emit('condition:evaluated', {
        conditionName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        result: result.passed
      });

      return {
        ...result,
        condition: conditionName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('condition:error', {
        conditionName,
        pluginId: registration.pluginId,
        error
      });

      return {
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        condition: conditionName
      };
    }
  }

  // Action Management

  /**
   * Register a workflow action
   */
  registerAction(
    pluginId: string,
    name: string,
    action: WorkflowAction,
    options: ActionOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.actions.has(fullName)) {
      throw new Error(`Workflow action '${fullName}' is already registered`);
    }

    const registration: ActionRegistry = {
      pluginId,
      name,
      fullName,
      action,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.actions.set(fullName, registration);
    this.emit('action:registered', { registration });
  }

  /**
   * Execute a workflow action
   */
  async executeAction(
    actionName: string,
    context: WorkflowContext
  ): Promise<ActionResult> {
    const registration = this.actions.get(actionName);
    if (!registration) {
      throw new Error(`Workflow action '${actionName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.action.execute(context);
      const endTime = Date.now();

      this.emit('action:executed', {
        actionName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        success: result.success
      });

      return {
        ...result,
        action: actionName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('action:error', {
        actionName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        action: actionName
      };
    }
  }

  // Utility Methods

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): WorkflowExtensionStats {
    const pluginStats: Record<string, PluginWorkflowStats> = {};

    // Aggregate stats
    for (const workflow of this.workflows.values()) {
      if (!pluginStats[workflow.pluginId]) {
        pluginStats[workflow.pluginId] = {
          workflows: 0,
          steps: 0,
          triggers: 0,
          conditions: 0,
          actions: 0,
          totalExecutions: 0
        };
      }
      pluginStats[workflow.pluginId].workflows++;
      pluginStats[workflow.pluginId].totalExecutions += workflow.executionCount;
    }

    for (const step of this.steps.values()) {
      if (!pluginStats[step.pluginId]) {
        pluginStats[step.pluginId] = {
          workflows: 0,
          steps: 0,
          triggers: 0,
          conditions: 0,
          actions: 0,
          totalExecutions: 0
        };
      }
      pluginStats[step.pluginId].steps++;
    }

    // Similar for triggers, conditions, actions...

    return {
      totalWorkflows: this.workflows.size,
      totalSteps: this.steps.size,
      totalTriggers: this.triggers.size,
      totalConditions: this.conditions.size,
      totalActions: this.actions.size,
      pluginStats
    };
  }

  /**
   * Clean up extensions for a plugin
   */
  cleanupPlugin(pluginId: string): void {
    // Clean up all registrations for the plugin
    const itemsToRemove = [
      { map: this.workflows, type: 'workflow' },
      { map: this.steps, type: 'step' },
      { map: this.triggers, type: 'trigger' },
      { map: this.conditions, type: 'condition' },
      { map: this.actions, type: 'action' }
    ];

    for (const { map, type } of itemsToRemove) {
      const keysToRemove = Array.from(map.entries())
        .filter(([, reg]) => reg.pluginId === pluginId)
        .map(([key]) => key);
      
      for (const key of keysToRemove) {
        const registration = map.get(key);
        if (registration && type === 'trigger' && 'trigger' in registration) {
          // Cleanup trigger
          (registration as any).trigger.cleanup?.();
        }
        map.delete(key);
      }
    }

    this.emit('plugin:cleanup', { pluginId });
  }

  // Private Methods

  private async processWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const executedSteps: string[] = [];
    let currentContext = { ...context };

    try {
      for (const stepDef of workflow.steps) {
        // Evaluate condition if present
        if (stepDef.condition) {
          const conditionResult = await this.evaluateCondition(stepDef.condition, currentContext);
          if (!conditionResult.passed) {
            continue; // Skip this step
          }
        }

        // Execute step or action
        let stepResult: StepResult | ActionResult;
        
        if (stepDef.type === 'step' && stepDef.step) {
          stepResult = await this.executeStep(stepDef.step, currentContext);
        } else if (stepDef.type === 'action' && stepDef.action) {
          stepResult = await this.executeAction(stepDef.action, currentContext);
        } else {
          throw new Error(`Invalid step definition: ${JSON.stringify(stepDef)}`);
        }

        if (!stepResult.success) {
          return {
            success: false,
            error: stepResult.error,
            executedSteps
          };
        }

        executedSteps.push(stepDef.step || stepDef.action || 'unknown');

        // Update context with step results
        if (stepResult.data) {
          currentContext.data = { ...currentContext.data, ...stepResult.data };
        }
      }

      return {
        success: true,
        data: currentContext.data,
        executedSteps
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedSteps
      };
    }
  }

  private initializeBuiltInComponents(): void {
    // Built-in conditions
    this.registerCondition('system', 'always', {
      evaluate: async () => ({ passed: true })
    });

    this.registerCondition('system', 'never', {
      evaluate: async () => ({ passed: false })
    });

    this.registerCondition('system', 'data_exists', {
      evaluate: async (context) => ({
        passed: context.data && Object.keys(context.data).length > 0
      })
    });

    // Built-in actions
    this.registerAction('system', 'log', {
      execute: async (context) => {
        console.log('Workflow log:', context.data);
        return { success: true };
      }
    });

    this.registerAction('system', 'delay', {
      execute: async (context) => {
        const delay = context.data?.delay || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { success: true };
      }
    });
  }
}

// Types and Interfaces

export interface WorkflowExtensionOptions {
  maxConcurrentWorkflows?: number;
  workflowTimeout?: number;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  trigger?: string;
  steps: WorkflowStepDefinition[];
  timeout?: number;
}

export interface WorkflowStepDefinition {
  type: 'step' | 'action';
  step?: string;
  action?: string;
  condition?: string;
  parallel?: boolean;
  retryCount?: number;
}

export interface WorkflowOptions {
  description?: string;
  timeout?: number;
  retryCount?: number;
}

export interface WorkflowContext {
  trigger?: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: string;
  workflow?: string;
  executionTime?: number;
  executedSteps?: string[];
}

export interface WorkflowStep {
  execute(context: WorkflowContext): Promise<StepResult>;
}

export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  step?: string;
  executionTime?: number;
}

export interface StepOptions {
  description?: string;
  timeout?: number;
  retryable?: boolean;
}

export interface WorkflowTrigger {
  initialize(callback: () => void): void;
  cleanup?(): void;
}

export interface TriggerOptions {
  description?: string;
  schedule?: string;
}

export interface WorkflowCondition {
  evaluate(context: WorkflowContext): Promise<ConditionResult>;
}

export interface ConditionResult {
  passed: boolean;
  reason?: string;
  condition?: string;
  executionTime?: number;
  error?: string;
}

export interface ConditionOptions {
  description?: string;
  cacheable?: boolean;
}

export interface WorkflowAction {
  execute(context: WorkflowContext): Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  action?: string;
  executionTime?: number;
}

export interface ActionOptions {
  description?: string;
  timeout?: number;
  retryable?: boolean;
}

export interface WorkflowRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  workflow: WorkflowDefinition;
  options: WorkflowOptions;
  registeredAt: Date;
  executionCount: number;
  lastExecuted: Date | null;
}

export interface StepRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  step: WorkflowStep;
  options: StepOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface TriggerRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  trigger: WorkflowTrigger;
  options: TriggerOptions;
  registeredAt: Date;
  triggerCount: number;
}

export interface ConditionRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  condition: WorkflowCondition;
  options: ConditionOptions;
  registeredAt: Date;
  evaluationCount: number;
}

export interface ActionRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  action: WorkflowAction;
  options: ActionOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface PluginWorkflowStats {
  workflows: number;
  steps: number;
  triggers: number;
  conditions: number;
  actions: number;
  totalExecutions: number;
}

export interface WorkflowExtensionStats {
  totalWorkflows: number;
  totalSteps: number;
  totalTriggers: number;
  totalConditions: number;
  totalActions: number;
  pluginStats: Record<string, PluginWorkflowStats>;
}