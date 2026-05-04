'use strict';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName || table.name;
    return name === tableName;
  });
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  if (!(await tableExists(queryInterface, tableName))) return;

  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, 'organizations'))) {
      await queryInterface.createTable('organizations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false, unique: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    await addColumnIfMissing(queryInterface, 'Users', 'organizationId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await addColumnIfMissing(queryInterface, 'Ledgers', 'organizationId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await addColumnIfMissing(queryInterface, 'Ledgers', 'isFinalized', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await addColumnIfMissing(queryInterface, 'Transactions', 'payment_method', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'cash',
    });

    await addColumnIfMissing(queryInterface, 'Transactions', 'category', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '',
    });

    await addColumnIfMissing(queryInterface, 'Transactions', 'transaction_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '',
    });

    if (!(await tableExists(queryInterface, 'Reports'))) {
      await queryInterface.createTable('Reports', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        file: { type: Sequelize.TEXT, allowNull: false },
        organizationId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'organizations', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    } else {
      await addColumnIfMissing(queryInterface, 'Reports', 'organizationId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface) => {
    if (await tableExists(queryInterface, 'Reports')) {
      await queryInterface.removeColumn('Reports', 'organizationId').catch(() => {});
    }
    await queryInterface.removeColumn('Transactions', 'transaction_type').catch(() => {});
    await queryInterface.removeColumn('Transactions', 'category').catch(() => {});
    await queryInterface.removeColumn('Transactions', 'payment_method').catch(() => {});
    await queryInterface.removeColumn('Ledgers', 'isFinalized').catch(() => {});
    await queryInterface.removeColumn('Ledgers', 'organizationId').catch(() => {});
    await queryInterface.removeColumn('Users', 'organizationId').catch(() => {});
  },
};
