/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Usuarios', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dni: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'Usuarios'
  });
};
