const { DataTypes } = require('sequelize');

const defineLlmBudgetModel = (sequelize) => {
  const LlmBudget = sequelize.define('LlmBudget', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  budgetType: {
    type: DataTypes.ENUM('monthly', 'weekly', 'daily', 'project', 'total'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  spent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  remaining: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.amount) - parseFloat(this.spent || 0);
    }
  },
  percentageUsed: {
    type: DataTypes.VIRTUAL,
    get() {
      const amount = parseFloat(this.amount);
      const spent = parseFloat(this.spent || 0);
      if (amount === 0) return 0;
      return Math.round((spent / amount) * 100);
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'exceeded', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },
  alertThresholds: {
    type: DataTypes.JSON,
    defaultValue: [50, 75, 90, 100] // Alert at these percentage levels
  },
  providers: {
    type: DataTypes.JSON,
    defaultValue: [] // Empty means all providers
  },
  useCases: {
    type: DataTypes.JSON,
    defaultValue: [] // Empty means all use cases
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  autoReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetFrequency: {
    type: DataTypes.ENUM('monthly', 'weekly', 'daily'),
    allowNull: true
  },
  nextResetDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifications: {
    type: DataTypes.JSON,
    defaultValue: {
      email: true,
      dashboard: true,
      webhook: false
    }
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'llm_budgets',
  timestamps: true,
  indexes: [
    {
      fields: ['budgetType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['startDate']
    },
    {
      fields: ['endDate']
    },
    {
      fields: ['nextResetDate']
    }
  ]
});

  // Instance methods
  LlmBudget.prototype.shouldAlert = function(currentThreshold) {
    const percentUsed = this.percentageUsed;
    return this.alertThresholds.includes(currentThreshold) && percentUsed >= currentThreshold;
  };

  LlmBudget.prototype.addSpending = function(amount) {
    this.spent = parseFloat(this.spent || 0) + parseFloat(amount);
    
    // Update status based on spending
    const percentUsed = this.percentageUsed;
    if (percentUsed >= 100) {
      this.status = 'exceeded';
    } else if (percentUsed >= 90) {
      this.status = 'active'; // Keep active but close to limit
    }
    
    return this.save();
  };

  LlmBudget.prototype.resetBudget = function() {
    this.spent = 0;
    this.status = 'active';
    
    if (this.autoReset && this.resetFrequency) {
      // Calculate next reset date
      const now = new Date();
      switch (this.resetFrequency) {
        case 'daily':
          this.nextResetDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
          break;
        case 'weekly':
          this.nextResetDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
          break;
        case 'monthly':
          this.nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
      }
    }
    
    return this.save();
  };

  return LlmBudget;
};

module.exports = { defineLlmBudgetModel };