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
    await addColumnIfMissing(queryInterface, 'Transactions', 'event_type', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    if (await tableExists(queryInterface, 'Transactions')) {
      await queryInterface.removeColumn('Transactions', 'event_type').catch(() => {});
    }
  },
};
